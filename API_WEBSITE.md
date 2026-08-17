# Public Website API — 360 Travel Concierge

Base URL: `https://apitravel360.salexo.co.in/api/public`
No authentication. All endpoints return only **active** records.
Prices are always calculated on the server — never trust an amount sent from the browser.

## Content (GET)
| Endpoint | Returns |
|---|---|
| `/navigation` | Full tree: Region → Country → Destination (for menus) |
| `/destinations?categorySlug=&subCategorySlug=&featured=true` | Destination cards |
| `/destinations/:slug` | One destination + its packages |
| `/packages?type=DOMESTIC&featured=true&destinationSlug=&search=` | Package cards |
| `/packages/:slug` | One package (with itinerary) + its testimonials |
| `/faqs?category=` | FAQs |
| `/testimonials?limit=` | Testimonials |
| `/company` | Company name, address, phone for the footer |

## Booking + payment flow

### 1. Create a booking
`POST /bookings`
```json
{
  "packageId": "…",
  "customerName": "…", "customerEmail": "…", "customerMobile": "…",
  "address": "…", "city": "…", "state": "…", "country": "India",
  "travelDate": "2026-09-01", "adults": 2, "children": 1,
  "passengers": ["Name 1", "Name 2"], "specialRequest": "…"
}
```
Response contains a `payment` object. Its shape depends on the package type:

**Domestic → Razorpay**
```json
{ "bookingId": "…", "payment": {
  "gateway": "RAZORPAY", "orderId": "order_…",
  "amount": 14175000, "currency": "INR", "keyId": "rzp_live_…"
}}
```
Open Razorpay Checkout with `keyId`, `orderId`, `amount`. On success the handler
returns `razorpay_payment_id` and `razorpay_signature`.

**International → Stripe**
```json
{ "bookingId": "…", "payment": {
  "gateway": "STRIPE", "clientSecret": "pi_…_secret_…",
  "publishableKey": "pk_live_…", "amount": 252000, "currency": "usd"
}}
```
Use Stripe.js `confirmPayment` with the `clientSecret`.

### 2. Confirm the payment
`POST /bookings/:bookingId/confirm`
- Razorpay: `{ "paymentId": "pay_…", "signature": "…" }`
- Stripe: `{ "paymentIntentId": "pi_…" }`

The server re-checks with the gateway, then creates the Customer + Retail order in the
ERP and emails the confirmation. Amounts are in the smallest unit (paise / cents).

### 3. Webhooks (recommended safety net)
Configure these in the gateway dashboards so a booking still completes even if the
customer closes the browser:
```
POST /api/public/webhooks/razorpay
POST /api/public/webhooks/stripe
```

## Gateway keys
Set under **Company Profile → Payment Gateways** in the ERP. Nothing is hard-coded.
