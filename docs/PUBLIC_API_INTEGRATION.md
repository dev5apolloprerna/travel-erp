# Public Website API — Frontend Integration Guide

This guide is for the **public marketing website** team. It documents only the public (`/api/public`)
endpoints the storefront uses, exactly as implemented in this project (MERN: Express + Mongoose +
React). All examples match the actual routes and response shapes in the server code.

---

## A. Base URL & configuration

| Item | Value |
|---|---|
| API base URL | `${API_BASE}/api/public` (e.g. `https://api.yourdomain.com/api/public`) |
| Content type | `application/json` for all JSON requests |
| Auth (customer endpoints) | `Authorization: Bearer <websiteCustomerToken>` |
| Auth (booking / packages) | none — public |
| CORS | the server allows the origins listed in the server env `CLIENT_URL` (comma-separated). Add your website origin there. |

**Frontend env (example `.env`):**
```
VITE_API_BASE=https://api.yourdomain.com
```
```js
// api client
const API = `${import.meta.env.VITE_API_BASE}/api/public`;
```

**Server env that affects these flows:** `CLIENT_URL` (CORS + the links placed in emails),
`JWT_SECRET` / `JWT_EXPIRES_IN` (customer tokens), and SMTP (`SMTP_HOST/PORT/USER/PASS/FROM`, or the
Company-Profile SMTP settings) for welcome/reset emails.

---

## B. Public Booking API

### `POST /api/public/bookings`  (no auth)

Creates a **PENDING** booking and initializes payment. The ERP order is created later, only once
payment succeeds (`/bookings/:id/confirm`).

**Request fields**

| Field | Required | Notes |
|---|---|---|
| `packageId` | yes | TourPackage id |
| `customerName` | yes | |
| `customerEmail` | yes | validated; stored lowercased |
| `customerMobile` | no | validated if present |
| `address`, `city`, `state`, `country` | no | stored on the booking and on a newly created customer |
| `travelDate` | no | ISO date |
| `adults` | no | default 1 (min 1) |
| `children` | no | default 0 |
| `passengers` | no | array of passenger objects (below) |
| `specialRequest` | no | |
| `websitecustomer_id` | no / nullable | link to an existing website-customer account |

**Passenger object** (each item of `passengers`):
```json
{ "firstName": "Asha", "lastName": "Rao", "dob": "1990-05-01",
  "gender": "Female", "nationality": "Indian", "passportNumber": "M1234567" }
```
(`first_name` / `last_name` / `date_of_birth` / `passport_number` snake_case aliases are also accepted.)

**Customer identification flow**
1. Frontend submits the booking.
2. If `websitecustomer_id` is supplied → it **must** exist, else `400` ("customer account was not
   found"). No duplicate customer is created.
3. If no id → the API looks up an existing customer **by email** (case-insensitive) and **reuses** it.
4. If none exists → a **new** website customer is created (name, email, mobile, address…), with a
   **secure random password** and a 7-day **account-setup token**.
5. The resolved customer id is stored on the booking in `websitecustomer_id`.
6. Passengers are saved on the booking; payment is initialized.

**Example request**
```json
{
  "packageId": "66f0a1...",
  "customerName": "Asha Rao",
  "customerEmail": "asha@example.com",
  "customerMobile": "+91 90000 00000",
  "address": "12 MG Road", "city": "Pune", "state": "MH", "country": "India",
  "travelDate": "2026-12-20",
  "adults": 2, "children": 1,
  "passengers": [
    { "firstName": "Asha", "lastName": "Rao", "dob": "1990-05-01", "gender": "Female", "nationality": "Indian", "passportNumber": "M1234567" }
  ],
  "specialRequest": "Window seats",
  "websitecustomer_id": null
}
```

**Success response (`201`)**
```json
{
  "bookingNo": "WEB-12345678",
  "bookingId": "66f0b2...",
  "amount": 45000,
  "currency": "INR",
  "customerId": "66f0c3...",
  "customerCreated": true,
  "customerEmailSent": true,
  "payment": {
    "ok": true, "gateway": "RAZORPAY",
    "orderId": "order_Xyz", "amount": 4500000, "currency": "INR",
    "keyId": "rzp_live_...", "bookingNo": "WEB-12345678"
  }
}
```
For an international package, `payment` is a Stripe object: `{ gateway:"STRIPE", orderId, clientSecret,
publishableKey, amount, currency }`.

- `customerCreated` is `true` only when a brand-new customer account was created.
- `customerEmailSent` reports the welcome-email outcome (new customers only).

**Checkout + confirm** (unchanged): open Razorpay Checkout (`keyId`+`orderId`) or Stripe Elements
(`publishableKey`+`clientSecret`), then:

### `POST /api/public/bookings/:id/confirm`  (no auth)
- Razorpay body: `{ "paymentId": "...", "signature": "..." }`
- Stripe body: `{ "paymentIntentId": "..." }`
- On success: booking → `PAID`, ERP order created. Idempotent (safe to call twice).

**Error responses (`400`/`404`/`409`/`500`)** — `{ "message": "..." }`, e.g. missing fields, invalid
email/mobile, invalid `websitecustomer_id`, package unavailable, payment init failure. Passwords /
hashes / stack traces are never returned.

---

## C. Registration & welcome email

- The existing registration endpoint is `POST /api/public/customer/register`
  `{ name, email, mobile, password, conform_passwrd }` → `201 { message, token, customer, emailSent }`.
- **Booking-created customers** (Case B above) are created with a **generated initial password**. The
  welcome email contains the **login URL + email + password** so the customer can sign in immediately,
  and asks them to change the password after first login. The login URL comes from the server env
  `frontwebsite_url` (the sign-in page, e.g. `https://360-travel.vercel.app/sign-in`), falling back to
  `CLIENT_URL`. The plaintext password is emailed once only — it is hashed in the DB and never stored,
  logged, or returned by the API. (Security note: emailing an initial password is less secure than a
  one-time setup link; customers should change it on first login.)
- The welcome email is sent **only** for a genuinely new customer, **after** the booking is saved, and
  **best-effort**: a mail failure never rolls back the customer or booking. A retry with the same
  email reuses the existing customer and sends **no** second email.
- **Email troubleshooting:** configure SMTP in Company Profile → Payment/SMTP settings or via env
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). If unset, the server logs
  "welcome email NOT sent … SMTP not configured" and the API still succeeds with
  `customerEmailSent: false`.

---

## D. Customer login

### `POST /api/public/customer/login`  `{ email, password }`
Response: `200 { message, token, customer }`. Store `token` and send it as
`Authorization: Bearer <token>` on authenticated customer calls. Tokens are JWTs (expiry from
`JWT_EXPIRES_IN`, default 7 days). Password reset: `POST /customer/forgot-password` `{ email }` and
`POST /customer/reset-password` `{ token, password, conform_passwrd }`.

---

## E. Customer Profile Update API

### `PUT /api/public/customer/profile`  (auth — Bearer token)

Updates the **signed-in** customer only. The customer is identified from the token; any id in the body
is ignored. Supported fields: `name`, `email`, `mobile`, `address`, `city`, `state`, `country`.
Only supplied fields change — omitted fields are preserved.

**Example**
```
PUT /api/public/customer/profile
Authorization: Bearer <token>
{ "name": "Asha R", "mobile": "+91 98888 88888", "city": "Mumbai" }
```
**Success (`200`)**
```json
{ "message": "Profile updated.",
  "customer": { "id": "...", "name": "Asha R", "email": "asha@example.com",
    "mobile": "+91 98888 88888", "address": "12 MG Road", "city": "Mumbai",
    "state": "MH", "country": "India", "isActive": true } }
```
**Errors:** `400` invalid name/email/mobile; `409` email/mobile already in use (checked excluding your
own record); `401` missing/invalid token. Password hashes are never returned.

---

## E2. Customer logout & "My Trips" (v53)

- `POST /api/public/customer/logout` **(auth)** — acknowledges sign-out and logs it. The token is a
  stateless JWT, so the frontend completes logout by **discarding the token**; the server does not
  blacklist it. Returns `{ message }`.
- `GET /api/public/customer/bookings` **(auth)** — the signed-in customer's own bookings, grouped:
  ```json
  { "counts": { "pending":1, "paid":2, "failed":0, "cancelled":1, "upcoming":1, "completed":1 },
    "pending": [...], "paid": [...], "failed": [...], "cancelled": [...], "upcoming": [...], "completed": [...] }
  ```
- `GET /api/public/customer/bookings/:type` **(auth)** (or `?type=`) — one list.
  `type` = `pending | paid | failed | cancelled | upcoming | completed | all`. Returns
  `{ type, count, bookings:[...] }`. Each booking has its package populated (`name`, `slug`,
  `bannerImage`). **Grouping:** pending = PENDING & not cancelled; paid = paymentStatus PAID;
  failed = FAILED; cancelled = status CANCELLED; upcoming = paid, not cancelled, travelDate ≥ today;
  completed = paid, not cancelled, travelDate in the past.

## F. Wishlist API

(The v50 removal was reverted in v51 — these endpoints are available.)

- `POST /api/public/wishlist` — add to wishlist. Body `{ websitecustomer_id, package_id }`.
  Returns `201 { message, id }`, or `200 { message, duplicate:true }` if already present.
- `GET /api/public/customer/wishlist` — **(auth)** the signed-in customer's wishlist, with package
  details populated.
- `POST /api/public/customer/wishlist-delete` — **(auth)** remove ONE of the signed-in customer's
  wishlist items. Body `{ package_id }` **or** `{ id }` (the wishlist row id). The customer is taken
  from the token, so a customer can only delete their own entries. Returns `200 { message, deleted }`
  or `404` if not found.

## F2. Payment failure

- `POST /api/public/bookings/:id/fail` — record a failed / user-cancelled payment. Body (all optional)
  `{ error, reason, code, gateway }`. Only updates a booking that is still `PENDING` (never overwrites
  a `PAID` booking); idempotent. Returns `{ message, bookingNo, status }`. Call this from the website
  when the gateway reports failure or the user closes the checkout, so the booking doesn't stay
  `PENDING`. (The success path — `POST /bookings/:id/confirm` — is unchanged.)

---

## G. Database & migration setup

- Stack is **MongoDB (Mongoose)** — schemaless, so there are **no SQL migration files**; new fields are
  additive and safe for existing documents.
- New fields in v50:
  - `WebsiteBooking.websitecustomer_id` (ObjectId → WebsiteCustomer, nullable) — the resolved customer.
  - `WebsiteBooking.passengers` — now an array of passenger objects (older string arrays still read).
  - `WebsiteBooking.pending` — **default `null`** (unset). A reserved booking-workflow flag; no extra
    behaviour is attached in code beyond storage. Existing bookings read as `null`.
  - `WebsiteCustomer.address/city/state/country` — default `''`.
- No migration command is required. Restart the API server after deploying so the updated models load.
- Server env required: `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, and SMTP settings (above). Set
  payment keys in Company Profile → Payment Gateways for `/bookings` to initialize payment.

---

## H. Frontend integration examples (fetch)

**Guest booking (no logged-in customer):**
```js
const res = await fetch(`${API}/bookings`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ packageId, customerName, customerEmail, customerMobile,
    address, city, state, country, travelDate, adults, children, passengers, specialRequest,
    websitecustomer_id: null }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.message);
// data.payment -> open Razorpay/Stripe checkout, then POST /bookings/:id/confirm
```

**Logged-in customer booking:** pass the known `websitecustomer_id` (and still include the token on
customer calls):
```js
body: JSON.stringify({ ...fields, websitecustomer_id: currentCustomer.id })
```

**Profile update:**
```js
await fetch(`${API}/customer/profile`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ name, mobile, city }),
});
```

**Error handling:** every endpoint returns `{ message }` on error with an appropriate HTTP status —
surface `message` to the user; treat `401` as "re-login", `409` as "already in use".

---

## I0. CORS error on `/api/public/bookings/:id/confirm` (and other public calls)

Two independent causes, both addressed:

1. **Server CORS code (fixed in v56).** The public API (`/api/public/*`, incl. `/api/public/customer`)
   is now opened to **any** origin and its pre-flight is answered *before* the restrictive admin CORS,
   and now allows `PUT`/`DELETE` too. Previously, if the website origin (e.g. the Vercel domain) wasn't
   in `CLIENT_URL`, the pre-flight came back without `Access-Control-Allow-Origin` and the browser
   blocked the call. No `CLIENT_URL` change is required for the public API after v56 (but you can still
   add the website origin to `CLIENT_URL` for the ERP admin app).

2. **`307 Temporary Redirect` from the hosting/proxy (NOT from Node).** In the failing request the
   `confirm` POST returns `307` — Express never emits that here, so it comes from the reverse proxy in
   front of Node on `apitravel360.salexo.co.in` (cPanel/LiteSpeed/nginx). The browser will not follow a
   cross-origin redirect that has no CORS headers, so it reports a CORS error. Fix on the server/proxy:
   - Make sure the website calls the API over **https directly** (an `http://…` call that the host
     upgrades to https is itself a redirect). The frontend API base must be
     `https://apitravel360.salexo.co.in`.
   - Make the proxy **pass the request straight through to Node without redirecting** (no forced
     trailing-slash or host canonicalization on `/api/`). Example nginx:
     ```nginx
     location /api/ {
       proxy_pass http://127.0.0.1:5000;     # the Node port
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_set_header X-Forwarded-For $remote_addr;
       # do NOT add `rewrite ... redirect` or a trailing-slash redirect here
     }
     ```
     On cPanel "Setup Node.js App"/Passenger, ensure the app's Application URL is the API domain root
     and there is no `.htaccess` `RewriteRule ... [R=307]` / `RedirectMatch` touching `/api/`.
   - The Node app now sets `trust proxy`, so it reads `X-Forwarded-Proto` correctly behind the proxy.

   Once the proxy stops issuing the 307 and the website calls https directly, the `confirm` POST
   reaches Node and returns normally with the CORS headers from fix (1).

## I. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `400 A valid email address is required` | malformed `customerEmail` |
| `400 The supplied customer account was not found` | invalid `websitecustomer_id` — omit it or send a valid one |
| `409 That email is already in use` | profile update email collides with another account |
| `401 Not authorized` | missing/expired Bearer token — re-login |
| `customerEmailSent: false` | SMTP not configured — set SMTP env or Company-Profile SMTP |
| `400 … is not configured` (payment) | add Razorpay/Stripe keys in Company Profile → Payment Gateways |
| CORS error in browser | add the website origin to the server `CLIENT_URL` list |
| Login fails with `secretOrPrivateKey must have a value` (server log) | `JWT_SECRET` not set in server env |
