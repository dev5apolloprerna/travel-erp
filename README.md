# Voyage Desk — Travel ERP (MERN)

Full-stack travel booking back-office: **MongoDB + Express (Node.js) + React (Vite) + Tailwind CSS**, with JWT role-based auth for four login types (Super Admin, Employee, Retail Customer, B2B Member) and three operating modules (Retail, B2B, FIT).

## Tech stack
- **Backend:** Node.js, Express, Mongoose (MongoDB), JWT, bcrypt
- **Frontend:** React 18, React Router, Vite, Tailwind CSS, Axios

## Project structure
```
travel-erp/
├── server/               # Express API
│   ├── config/db.js
│   ├── models/           # User, Customer, Company, Passenger, Order, Payment, FitMasters
│   ├── middleware/       # auth (JWT + role guard), error
│   ├── controllers/      # auth, retail, b2b, fit
│   ├── routes/           # /api/auth, /api/retail, /api/b2b, /api/fit
│   ├── utils/seed.js     # demo data + login accounts
│   └── server.js
└── client/               # React app
    └── src/
        ├── api/client.js         # axios + JWT interceptor
        ├── context/AuthContext   # auth state
        ├── components/ui         # shared primitives (Card, Table, Badge…)
        ├── components/layout     # Sidebar, Topbar, AppLayout
        └── pages/                # auth, retail, b2b, fit, portal
```

## Prerequisites
- Node.js 18+
- A MongoDB database (local `mongod`, or a free MongoDB Atlas cluster)

## Setup

### 1. Backend
```bash
cd server
npm install
cp .env.example .env          # then edit .env
```
Edit `server/.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/travel_erp
JWT_SECRET=replace_with_a_long_random_string
CLIENT_URL=http://localhost:5173
```
Seed demo data (creates the login accounts below), then start:
```bash
npm run seed
npm run dev        # or: npm start
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173. The Vite dev server proxies `/api` to the backend on port 5000.

## Demo login accounts (after `npm run seed`)
| Portal | URL | Email | Password |
|---|---|---|---|
| Super Admin | /login/superadmin | admin@travel.com | admin123 |
| Employee | /login/employee | employee@travel.com | emp123 |
| Retail Customer | /login/retail | rahul@mail.com | cust123 |
| B2B Member | /login/b2b | karan@nexora.com | member123 |

## Module notes
- **Retail:** employee creates customer (auto-generates portal login), books single service or package, captures members + documents, order-level partial/full payments (customer online or employee-assisted). Registration is excluded for retail.
- **B2B:** employee manages company + members; employee books orders and records the requesting member; passenger DB scoped per company; payments are **lump-sum against the company running balance**, not bill-to-bill; members get a **view-only** portal.
- **FIT:** full CRUD masters (Cluster, Division, Grade with reference amount, Department); DR master (cluster/division/grade) and Employee master (department only); documents are **add/delete only**; bookings mix DR + Employee passengers; grade amount is informational (not enforced). Includes an Event service.



## What's new in this update
- **Branding:** 360° Travel Concierge logo (login, sidebar, portals); theme colors primary `#4583fe`, secondary `#35a1fc`, white button text.
- **Edit & Delete everywhere:** all listings (customers, orders, companies, members, DR, FIT employees, all masters, services) now support edit and delete, with a confirmation dialog on delete.
- **Masters split into separate pages** (own route + sidebar item): Cluster, Division, Grade, Department — plus the new **Service Master**.
- **Service Master:** fixed services (Flight, Hotel, Visa, Cab, Bus, Event, Registration) each with a **Domestic/International** type; full add/edit/delete. Seeded automatically.
- **Employee management (Administration → Employees):** create/edit/delete employees and assign rights — **modules** (Retail/B2B/FIT), **menu access**, and **service booking rights**. Booking screens hide services the employee isn't assigned (UI-level this round). Menu visibility is driven by these rights; Super Admin sees everything.
- **B2B company "Open" page** is now a **tabbed view** — Company Info (edit), Members (add/edit/delete), Payments (add lump sum), Booking History — for cleaner management.
- **Sidebar** is menu-driven with correct active-state highlighting.

### Menu-based access
Each employee record stores `menus`, `modules`, and `services`. The sidebar and booking options render from these. Enforcement is UI-level for now (as agreed) and can be hardened on the backend later.

## Notes
- File uploads are represented by a document name + placeholder path. Wiring real storage (e.g. Multer + S3/GridFS) is a straightforward next step.
- The "email credentials" step is simulated and returns the generated login in the API response for demo purposes; swap in a mailer (e.g. Nodemailer) for production.

---

# Update v3 — 14 feature implementation

All fourteen requested points are implemented. Summary and where each lives:

| # | Feature | Backend | Frontend |
|---|---------|---------|----------|
| 1 | Title → 360 Travel Concierge Pvt Ltd everywhere | `models/Settings.js` (companyName) | `index.html`, login, sidebar, portals |
| 2 | Order service dropdown from master | `models/Service.js`, `/api/services` | `pages/retail/BookingFlow.jsx` |
| 3 | Customer edit + document upload (all types) | `retailController` (`addCustomerDocument`) | `pages/retail/CustomerForm.jsx` + `DocumentManager` |
| 4 | B2B contacts + company documents | `models/Company.js` (contacts[], documents[]) | `pages/b2b/CompanyDetail.jsx` (Contacts / Documents tabs) |
| 5 | FIT member documents + divisions | `models/FitMasters.js` (cluster/division on member) | `pages/fit/FitEmployeeList.jsx` |
| 6 | Team CRUD + role access + password + active/inactive | `authController` (CRUD, reset, toggle) | `pages/admin/EmployeeList.jsx`, `EmployeeForm.jsx` |
| 7 | GST per service → CGST+SGST / IGST auto | `utils/gst.js`, applied in retail + B2B orders | `ServiceMaster.jsx` (GST %), `OrderDetail.jsx` (breakdown) |
| 8 | State field on customer | `models/Customer.js` (state, stateCode, gstNumber) | `CustomerForm.jsx` |
| 9 | Invoice DOM-/INT- prefix, PDF download + email | `utils/invoicePdf.js`, `invoiceController.js` | `OrderDetail.jsx`, customer portal |
| 10 | Salary slip upload → employee sees own | `models/SalarySlip.js`, `hrController` | `hr/SalarySlips.jsx`, `hr/MySalarySlips.jsx` |
| 11 | Holiday master | `models/Holiday.js`, `hrController` | `hr/HolidayMaster.jsx` |
| 12 | Leave apply → admin approve + balance | `models/Leave.js` (+ LeaveBalance) | `hr/MyLeave.jsx`, `hr/LeaveRequests.jsx` |
| 13 | Change password — all 4 roles | `authController.changePassword` | `account/ChangePassword.jsx` (+ both portals) |
| 14 | Company Profile Settings (GST, address, SMTP) | `models/Settings.js`, `settingsController` | `settings/CompanyProfile.jsx` |

## How GST works
1. Set your **home state** in *Administration → Company Profile*.
2. Set **GST %** per service in *Administration → Service Master*.
3. Set the **state** on each customer / B2B company.
4. On booking, the system compares states:
   - same state → **CGST + SGST** (half each)
   - different state → **IGST** (full)
5. The invoice shows the correct split and totals.

## Invoice numbering
Sequential per type: `DOM-000001` for domestic services, `INT-000001` for international.
The number is assigned the first time the invoice is downloaded, previewed or emailed.

## Email (SMTP)
Configure under *Administration → Company Profile → SMTP / Email*, then use **Send test email** to verify.
SMTP powers: customer/member login credentials and invoice emails. If SMTP isn't configured,
credentials are still shown on screen so nothing blocks — you just share them manually.

## New API endpoints
```
/api/services            GET POST PUT DELETE      service master (with GST %)
/api/settings            GET PUT                  company profile
/api/settings/test-smtp  POST                     send a test email
/api/invoices/:id/pdf        GET                  download invoice PDF
/api/invoices/:id/preview    GET                  inline PDF
/api/invoices/:id/email      POST                 email invoice with PDF attached
/api/hr/holidays         GET POST PUT DELETE      holiday master
/api/hr/leaves           GET POST                 apply / list leave
/api/hr/leaves/:id/decision  PUT                  approve / reject
/api/hr/leave-balance    GET PUT                  balance + allocation
/api/hr/salary-slips     GET POST DELETE          salary slips (admin)
/api/hr/my-salary-slips  GET                      employee's own slips
/api/auth/change-password    POST                 all roles
/api/auth/employees/:id/password  PUT             admin reset
/api/auth/employees/:id/active    PUT             activate / deactivate
```

## File uploads
Files are stored on the server under `server/uploads/<folder>/` and served at `/uploads/...`.
Folders: `customers`, `companies`, `fit`, `salary`. Max 10MB; PDF, images and Office documents.

> **Deployment note:** make sure the `server/uploads` folder exists and is writable on Hostinger,
> and that it is **not** wiped on redeploy (keep it outside the folder you overwrite, or back it up).

## Bug fixed from your live build
Your deployed `server.js` never mounted `/api/services`, so the Service Master screen would return 404.
It is now mounted (along with settings, invoices and HR), and your CORS configuration is preserved.

---

# Update v4 — 9 new points

| # | Feature | Where |
|---|---------|-------|
| 1 | B2B order booking (was missing) | `pages/b2b/BookingFlow.jsx`, `b2bController.createOrder`; entry points on Companies list + company Booking History |
| 2 | FIT order booking (was missing) | `pages/fit/BookingFlow.jsx` (mixed DR + member passengers), `FitOrderList.jsx`, `fitController.createOrder` |
| 3 | DR Master → "Passenger" + Edit | menu label + `DoctorList.jsx` (edit), FIT dashboard |
| 4 | B2B member documents (per member) | Members tab → 📎 Documents, `b2bController.addMemberDocument` |
| 5 | Domestic / International on every order | selector on Retail / B2B / FIT booking; filters services + sets DOM-/INT- prefix |
| 6 | B2B payment against order(s) | Payments tab: multi-select orders, amount per order; blank = lump sum on account |
| 7 | Select-all menus + services; multi employee type | `EmployeeForm.jsx` (select-all, Domestic AND International) |
| 8 | Profile picture — all user types | `ProfilePicUpload.jsx`, `MyProfile.jsx`, both portals, sidebar avatar |

## B2B payments — how the split works
When recording a payment you may tick one or more orders and enter an amount against each.
- Ticked orders receive their amounts (each capped at that order's due).
- Any remainder stays on the company account as a lump sum.
- Tick nothing → the whole amount is a lump sum on account (the original behaviour).
The company's total paid always reflects the full amount received either way.

## New v4 endpoints
```
/api/b2b/companies/:id/orders                         GET     orders + dues for the payment screen
/api/b2b/companies/:id/members/:memberId/documents    POST    add member document
/api/b2b/companies/:id/members/:memberId/documents/:docId  DELETE
/api/fit/orders           GET POST        FIT orders
/api/fit/orders/:id       GET DELETE
/api/auth/profile-pic         POST DELETE own picture
/api/auth/profile-pic/:id     POST DELETE admin sets another user's picture
```

## Bug fixed in this round
`fitRoutes.js` referenced `deleteDoctor` and `deleteFitEmployee` controller functions that were
never implemented — the FIT module would crash on load. Both handlers are now added.

---

# Update v6 — Phase 1 (points 1, 2, 7)

## 1. Service-wise invoice prefix
Service Master now has an **Invoice prefix** field. Each service numbers its own invoices
with an independent sequence:

```
Flight  (FLT) -> FLT-000001, FLT-000002 ...
Hotel   (HTL) -> HTL-000001, HTL-000002 ...
```

This replaces the old DOM-/INT- scheme. One order carries one service, so one invoice
uses one prefix. If a service has no prefix set, the system derives a 3-letter code from
the service name, and falls back to `INV-` only as a last resort — nothing ever fails to
generate a number.

## 2. Accordion sidebar
Sidebar sections collapse and expand. The section holding your current page opens
automatically, and your open/closed choices persist for the session.

## 3. Passenger master (columns A–W)
Rebuilt around the MSL summary sheet — 23 fields in four sections:

| Section | Fields |
|---|---|
| Basic | Cluster, Division, **Dr. Code**, Dr. Name, Category, Qualification, Speciality, Div. Sub Spec. |
| Clinic | Clinic/Hospital name, Complex/Area, Landmark, City, State, Pincode, Clinic phone |
| Field force | SMS code, Designation, Emp code, Emp name, HQ, Region |
| Contact | Mobile, Email |

**Dr. Code** is entered manually and must be unique. Leading zeros are preserved
(`00139361` stays as typed).

**List** supports search (name, Dr. Code, mobile, clinic) plus filters for Cluster,
Division, Speciality and City.

### Excel import
1. **Import from Excel** → choose your sheet → **Check file**
2. A preview shows how many rows will be added, updated or skipped, and lists any
   Clusters/Divisions that will be created
3. Confirm to import; skipped rows are listed with the reason

The import reads columns **A–W by header name** and ignores everything after, so the MSL
sheet can be uploaded unchanged. Rows whose Dr. Code already exists are **updated**, not
duplicated. A blank template is downloadable from the same screen.

## New v6 endpoints
```
/api/fit/passengers                  GET POST         list (with filters) / create
/api/fit/passengers/:id              GET PUT DELETE
/api/fit/passengers/filters          GET              distinct specialities + cities
/api/fit/passengers/import/preview   POST (file)      parse + validate, writes nothing
/api/fit/passengers/import           POST (rows)      commit the import
/api/fit/passengers/import/template  GET              blank .xlsx template
```

## Deployment notes for this release
- **Run `npm install` on the server** — adds `xlsx` for reading spreadsheets.
- **Set invoice prefixes** in Service Master before raising new invoices. Existing
  invoices keep their old DOM-/INT- numbers untouched.
- **Existing passenger records need a Dr. Code.** The unique index is *sparse*, so old
  records without one will not break the database, but you cannot edit them until a
  Dr. Code is filled in. Easiest path is to import your sheet, which fills them properly.

## Still to come — Phase 2
Destination masters (Region → Country → Detail), Tour package master with itinerary,
FAQ, Testimonials, and the website booking APIs with Razorpay (domestic) and
Stripe (international).

---

# Update v7 — Phase 2 (website CMS + online booking)

Admin-side masters live in the ERP under a new **Website** menu section; the public
website consumes the read + booking API (see `API_WEBSITE.md`). The marketing site
itself is a separate project.

## New masters (ERP → Website)
- **Destination Categories** — main category (Region) and sub category (Country/State)
- **Destinations** — full detail page: banner, slider images, places, best time
  (seasons + months), uniquely popular for, attractions, memorable pursuits, leisure,
  quick tips, plus SEO fields. Structure follows the reference Bahamas page.
- **Tour Packages** — basics, pricing (with optional discount), GST, day-by-day
  itinerary (title, description, meals, hotel, city), inclusions/exclusions, images, SEO.
  Marked Domestic or International, which chooses the payment gateway.
- **FAQ & Testimonials** — CRUD with display order and active/inactive.
- **Website Bookings** — every online booking with its payment status and linked ERP order.

## Online booking + payment
- Website visitor books a package → a **PENDING** booking is created and payment starts.
- **Domestic → Razorpay, International → Stripe.** Gateway is chosen automatically from
  the package type.
- On verified payment the system creates a **Retail order + customer inside the ERP**
  (visible in Orders) *and* keeps the booking in the **Website Bookings** list.
- Prices are always computed server-side, so a tampered amount from the browser is ignored.
- Razorpay signatures and Stripe intents are re-verified on the server; webhooks act as a
  safety net if the browser closes mid-payment.

## New backend pieces
- Models: `Destination.js` (3 levels), `TourPackage.js`, `Content.js` (FAQ + testimonial),
  `WebsiteBooking.js`; `Settings.js` gained gateway keys; `Order.js` gained a `source` field.
- Controllers: `cmsController.js`, `publicController.js`, `websiteBookingController.js`.
- Utility: `utils/payments.js` (Razorpay + Stripe, signature/intent verification).
- Routes: `/api/cms` (admin, protected) and `/api/public` (website, open).

## Deployment notes for this release
- **Run `npm install` on the server** — adds `razorpay`, `stripe` and (from Phase 1) `xlsx`.
- **Add your gateway keys** under Company Profile → Payment Gateways, and set the webhook
  URLs in the Razorpay/Stripe dashboards.
- The Stripe webhook needs the raw request body; it is already mounted before the JSON
  parser in `server.js`, so no extra web-server config is required.
- The public API is open (no login) by design and is CORS-open so your separate website
  can call it.

---

# Update v8 — booking restructure

## Orders capture booking details only (no money)
Order creation no longer holds an amount or tax. Price and tax move to **invoice
generation** (a later phase). The `amount`, GST and total fields remain on the schema so
existing orders still load, but new bookings leave them empty.

## Service-based GST removed
The GST% field is gone from Service Master. Tax is entered manually at invoice time.
Service Master now keeps: name, type (Domestic/International), invoice prefix, HSN/SAC.

## Single / Package choice removed
The "Single service / Package" order-type dropdown is gone from every booking flow.
Each booking is one service on one order.

## FIT → Society (labels only)
Every user-facing "FIT" now reads "Society" (menu, page titles, module label). The
internal module code, routes and stored data stay `FIT`, so nothing breaks.

## Per-service booking forms
Each service renders its own booking form, matching the ePrompt entry screens:
- **Flight (Domestic & International)** — Airline, From Stock, PNR From (LCC/Net), Ticket No.,
  Airline PNR, CRS PNR, Document No., Travel Date, Sector From/To, Class, Flight No., Fare Basis
- **Railway / Bus** (shared form) — Train, Status, Quota, Ticket No., Railway PNR, Coach No.,
  Seat No., Document No., Travel Date, Sector From/To, Class, Train No., Boarding At
- **Hotel** — Hotel Name, Guest, Persons (Adult/Child/Infant), Check In/Out, Nights,
  repeatable Room rows (Room Type / Meal Plan / Rooms / Persons), Confirmation By/No.,
  Billing Instructions

Definitions live in `client/src/pages/shared/serviceForms.js`; the form is rendered by
`ServiceBookingForm.jsx`. Services without a bespoke form fall back to a simple
Details + Date form until their screen is designed. (Cab/Taxi, Transport, Excursion, Visa,
Event, Registration forms to be added as screenshots arrive.)

## Passenger master — multi-division
- **Dr. Code stays unique** (one record per doctor).
- A passenger **belongs to multiple divisions**; each division carries its own
  **SMS Code, Designation, Emp Code, Emp Name, HQ, Region**.
- Identity fields (Dr. Name, Category, Qualification, Speciality, clinic block, contact)
  stay single on the passenger.
- **Excel import removed** — passengers are entered manually.

## Society booking is passenger-driven
Search a passenger by **Dr. Code** (or name), pick one of their **divisions**, and that
division's field-force details (SMS/Designation/Emp/HQ/Region) are pulled in automatically
and stored on the order. Then choose the service and fill its booking form.

## Deployment notes
- No new dependencies this round.
- Existing passengers with the old single division still load; open and re-save them to
  move their details into the new per-division structure.

---

# Update v9 — invoice generation

## Generate invoice (all three modules)
Every order list (Retail, B2B, Society) now has a **Generate** action in an Invoice column.
Before generation it reads "Generate"; after, it shows the invoice number and net amount.
The same invoice screen serves all three modules.

## Invoice screen — charge heads (from the ePrompt air-ticket invoice)
Charges are entered manually:
Basic, YQ Tax, YR Tax, K3 Tax, OC Tax, Other Tax, Processing Charges, Other Charges, Markup.
The full set is available for every service; unused heads simply stay at zero for
non-flight bookings.

## Totals
```
Gross Total = Basic + YQ + YR + K3 + OC + Other Tax + Processing + Other Charges + Markup
Net Invoice Amount = Gross − Discount − TDS − TCS + Govt Tax
```
The net updates live as values are typed. Generating assigns the service-prefixed invoice
number (e.g. FLT-000001), saves all charge lines, and the PDF reflects them.

## PDF
The invoice PDF lists each charge head that has a value and the Gross → Net footer.
Zero heads and zero footer lines are omitted for a clean layout.

## Hotel Voucher — extra booking fields
Added to the hotel booking form: Voucher type (Domestic/International),
For Package Invoice?, CNCL Deadline, Payment Deadline.

## New / changed endpoints
```
GET  /api/invoices/:orderId            order + party for the invoice screen
POST /api/invoices/:orderId/generate   save charges + compute totals + assign number
GET  /api/invoices/:orderId/pdf        download the PDF (unchanged)
```

## Deployment notes
- No new dependencies this round.
- Invoice numbering still uses the per-service prefix from Service Master. Set prefixes
  before generating, or a 3-letter code is derived from the service name.

---

# Update v10 — inline "New customer" on booking

The Retail booking screen (Retail → New booking) now has a **+ New customer** button
beside the Customer dropdown. It opens a popup with the same fields as
`/app/retail/customers/new`; on save the customer is created, selected in the dropdown,
and booking continues without leaving the page. The portal login generated for the new
customer is shown inline.

The customer field set is now a shared component (`CustomerFields.jsx`) used by both the
full customer page and the popup, so the two never drift apart.

---

# Update v11 — multiple entries per booking

Each booking can now hold **several numbered entries of the same service**, matching the
ePrompt "Entry for [New Service] 001 / 002 / 003" screen.

- Pick a service (Flight, Railway, Hotel, …) and add as many entries as needed with
  **+ Add another entry**; each entry is a full copy of that service's booking form.
- **Entries are numbered 001, 002, 003.** Each Flight/Railway entry carries **its own
  passenger(s)**; Hotel entries keep their room rows inside each entry.
- Applies to **all three booking flows** — Retail, B2B and Society. (Society entries are
  tied to the one searched passenger, so they have no per-entry passenger rows.)
- Each entry is stored as its own service line on the order. The order still represents one
  service, so invoice numbering stays service-prefixed (FLT-000001) and the invoice totals
  across all entries.

### Fix included
The order's service-line schema was still the old fixed-field version, which silently
dropped the newer per-service booking fields (airline, ticket no., sectors, PNR, hotel
rooms, etc.) and rejected hotel room arrays. The schema is now flexible, so every field the
per-service forms capture is saved correctly. Existing orders are unaffected.

---

---

# Update v12 — Bus & Train services, Event fields (invoice kept at v11)

## Choose service — Bus and Train
- **Bus** uses the railway booking form with **Bus-worded** labels: Bus, Status, Quota,
  Ticket No., Bus PNR, Coach No., Seat No., Document No., Travel Date, Sector From/To,
  Class, Bus No., Boarding At.
- **Train** uses the same railway form, Train-worded (Train, Railway PNR, Train No.).
- Both appear in Choose service once added in Service Master. Demo seed now includes
  Flight, Hotel, Visa, Cab, Bus, Train, Event and Registration.

## Event booking
The Event form captures **Event Title** and **Event Description**.

## Invoice section — restored to v11
The invoice screen, controller and PDF use the **v11 flat-amount** model:
```
Gross Total = Basic + YQ + YR + K3 + OC + Other Tax + Processing + Other Charges + Markup
Net Invoice Amount = Gross − Discount − TDS − TCS + Govt Tax
```
Discount, TDS, TCS and Govt Tax are entered as **fixed amounts** (not percentages).
The earlier percentage-based invoice variant and its Service Charge / charge-mode
fields have been removed.

---

# Update v13 — Cab, Visa & Event forms

## Cab — Transport Voucher layout
The Cab form is replaced with the ePrompt Transport Voucher fields (booking details only):
Service Provider, Name of Guest, Voucher type, For Package Invoice?, Payment,
Adults/Children/Infants, Start From, End To, No. of Days, Vehicle, Type (AC/Non-AC),
Trip Type (Local/Outstation/Transfer), No. of Vehicle, Km(s) Allowed, Pick-up From,
Drop At, Route, Arrival/Departure Detail, Inclusive, Confirmation By/No.,
Billing Instructions, CNCL Deadline, Payment Deadline.
Amounts (Basic, Border Tax, Toll & Parking, Other, Total, Advance, Balance, Taxes) are
entered at invoice generation, not here. (Taxi maps to the same form.)

## Visa
Visa Country, Visa Type (New / Renewal), Visa Years, Remarks.

## Event
Added Country and Remarks — the Event form is now Event Title, Event Description,
Country, Remarks.

---

# v13 re-package — login fix

**Important:** earlier zips accidentally bundled a development `server/.env`
(pointing MONGO_URI at a local database and CLIENT_URL at the API host). Unzipping over a
live server replaced the real `.env`, so the app connected to an empty database and every
login failed with "Invalid credentials".

This re-packaged zip **excludes `server/.env`** — your server's own `.env` is left
untouched on deploy. A reference `server/.env.example` is still included.

If your live `.env` was already overwritten, restore it with your real values:
```
NODE_ENV=production
PORT=5000
MONGO_URI=<your real production MongoDB URI>
JWT_SECRET=<your long random secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://travel360.salexo.co.in,https://apitravel360.salexo.co.in
```
Note CLIENT_URL should include your FRONTEND origin (travel360...) for CORS, not only the API host.

---

# Update v14 — Company Owner login + Master Engine (foundation)

This is the foundation slice for the wireframe masters. It adds a new **Company Owner**
login and a **config-driven master engine**, demonstrated with two live masters
(Country + Currency). Existing masters, roles and code are untouched.

## Company Owner login
- New role `COMPANY_OWNER`; new portal at **/login/companyowner** (same design as the other
  four logins). Demo: **owner@travel.com / owner123**.
- Dedicated area at **/owner** with its own sidebar (built from the master catalog, grouped
  by menu) and a dashboard. Guarded so only Company Owner can reach it.

## Master engine (config-driven)
- Masters are defined as config entries in `server/masterEngine/masterDefs.js` from the
  wireframe field spec. The engine builds the model, API and UI generically — no per-master
  pages.
- **List, Add and Edit are separate pages** (`/owner/:key`, `/owner/:key/create`,
  `/owner/:key/:id/edit`); Delete is on the list.
- **IDs**: Mongo `_id` is the record id, generated by the database and never shown on the
  Add/Edit form (short id shown in the list only).
- **Foreign keys**: any `int<X>ID` that isn't the table's own key renders as a dynamic
  dropdown populated from the related master.
- Field types are decoded from the spec prefixes (int/dec→number, bit→boolean, dt→date,
  str→text, txt→textarea, img→image).
- Each master stores in its own `me_<key>` collection (strict:false), fully separate from
  existing collections.

## Live in this slice
- **Country** (Location) and **Currency** (with a Country foreign-key dropdown). Seed adds
  India/USA + INR/USD so the dropdown has data.

## Next
Phase 1 rolls the remaining simple/small/medium masters into the engine from the spec.
Head+Details masters (14 of them) will be built as their Add/Edit screenshots are provided.

---

# Update v15 — All 80 masters wired + full collection seeding

Builds on v14. Fixes the two issues reported after v14:

## "Missing tables" — explained and fixed
In MongoDB a collection only appears once a document is inserted. v14 only seeded
me_country/me_currency, so the other 78 masters and several v13 collections had no rows and
did not show in the database. Nothing was missing from the code.

The seed now **pre-creates every collection**:
- **All 80 wireframe masters** get one sample row each (skips any that already have data),
  so every master collection (me_<key>) is visible.
- **All v13 collections** are ensured via createCollection (payments, destinations,
  tourpackages, websitebookings, testimonials, faqs, leaves, passengers, salaryslips, etc.),
  so the full v13 schema is visible too.

## All 80 masters wired into the engine
masterDefs.js now contains all 80 masters from the Scope-of-Work spec (not just Country /
Currency). 74 foreign-key fields are auto-detected and render as dynamic dropdowns from
their related master. Menus are grouped into 17 sections in the Company Owner sidebar.

## Login
The Company Owner login code was already correct in v14 — it failed only because the seed
had not been run, so owner@travel.com did not exist. Running the seed creates it
(owner@travel.com / owner123). Re-running the seed is safe.

## Head + Details masters
The 14 *Head masters currently render as flat forms. They will be upgraded to the multi-row
Head+Details UI one at a time as their Add/Edit screenshots are provided.

## To deploy
1. Ensure server/.env has the correct production MONGO_URI and JWT_SECRET, and CLIENT_URL
   includes the FRONTEND origin (https://travel360.salexo.co.in).
2. Run the seed against that database (npm run seed). It creates all logins + all collections.
3. Log in at /login/companyowner with owner@travel.com / owner123.
#   t r a v e l - e r p  
 #   t r a v e l - e r p  
 