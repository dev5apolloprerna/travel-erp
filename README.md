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
#   t r a v e l - e r p 
 
 #   t r a v e l - e r p 
 
 
---

# Update v20 — Website (Super Admin) destination/category/package changes

Only the Super Admin website section changed. Company Owner modules and other user sections
are untouched.

## Destination Categories
- Removed Sub Categories completely (tab, model, API, routes, and the subCategoryId link on
  Destinations and Packages).
- Main Category now has: Best Time, Ideal Duration (e.g. "10–18 Days"), Travel Style
  (e.g. "Culture · Cities · Beaches · Food").
- Repeatable Experiences: each with Label, single image upload, and a rich-text description.
- SEO: kept SEO title + SEO description; added Meta Keyword, Head and Body (rich text).

## Add Destination — SEO tab
- Kept SEO title; SEO description and SEO keywords are now rich text; added Head and Body
  (rich text). Sub category field removed.

## Add Package — SEO tab
- Same SEO additions: description + keywords rich text, new Head and Body (rich text).

## Rich text
- New lightweight editor client/src/components/ui/RichText.jsx (contentEditable, stores HTML,
  no new npm package).

## API + seed
- Public website navigation tree is now Region → Destinations (no sub level) and exposes the
  new category fields (bestTime, idealDuration, travelStyle, experiences).
- Seed adds a sample "Asia" category populated with the new fields.

No database migrations; existing collections/columns are reused (new fields are additive on
the same documents). All 58 backend modules import; all 127 API calls resolve.

---

# Update v21 — two new public website APIs

Additive only: two new read-only endpoints under /api/public. No existing API, frontend,
model, or DB changed. Company Owner and all other modules untouched.

## GET /api/public/destination_categories
Returns a lightweight list of active categories — only name and slug each.
Example: [ { "name": "Asia", "slug": "asia" }, ... ]

## GET /api/public/destinations_page?slug=<category-slug>
One bundle for a category landing page. Matches the slug to an active Destination Category
and returns:
- category    : the full matched category object (all fields incl. bestTime, idealDuration,
                travelStyle, experiences, SEO head/body)
- featured    : ALL featured destinations across the site (isFeatured = true) —
                name, slug, bannerImage, shortDescription, categoryId
- experiences : that category's experiences (label, image, description)
- categories  : all active categories (name, image, slug) for navigation
Returns 404 if the slug doesn't match an active category, 400 if slug is missing.

---

# Update v22 — destinations_page returns plain text (no HTML)

The rich-text fields are stored as HTML (from the v20 editor). In
GET /api/public/destinations_page?slug=<x> these are now returned as clean plain text
(tags removed, entities decoded, whitespace tidied):
category.description, seoDescription, seoKeywords, seoHead, seoBody, and each
experiences[].description.

The stored database values are unchanged — only this endpoint's response is cleaned. Only
destinations_page is affected; all other endpoints and the admin screens still keep HTML.
Non-HTML fields (bestTime, idealDuration, travelStyle, etc.) are returned as-is.
Only server/controllers/publicController.js changed.

(v22 fix) category.experiences[].description also returned as plain text — previously only the
top-level experiences array was cleaned while category.experiences kept raw HTML. Both now use
the same cleaned array, so no HTML/inline-style markup appears anywhere in the response.

---

# Update v22 (inquiry) — website contact inquiry

New public contact/inquiry form flow:
- POST /api/public/inquiry  { fullName, phone, email, travelRequirement } (all required)
  Always saves to the new front_inquiry collection (FrontInquiry model). Then emails the
  inquiry to INQUIRY_EMAIL (from .env) or the Settings company email if unset. If no
  recipient / SMTP is configured, the inquiry is still saved and no error is shown.
- Super Admin → Website → Inquiries: list (newest first) + delete.
  GET /api/cms/inquiries, DELETE /api/cms/inquiries/:id (staff-guarded).
- .env.example documents INQUIRY_EMAIL. The front_inquiry collection is pre-created by seed.

---

# Update v22 (booking dropdowns) — Hotel & Train fields bind to Company Owner masters

Super Admin → New booking:
- Hotel: "Hotel Name" is now a dropdown bound to the Company Owner Property master
  (strPropertyName); it stores the hotel name text. "Name of Guest" removed.
- Hotel rooms: "Meal Plan" is now a dropdown bound to the Meal Plan master (strMealPlanName),
  storing the plan name.
- Train: "Quota" is now a dropdown bound to the Quota master (strQuotaName), storing the name.

Mechanism: a new 'mname' field type (and byName mode on the booking dropdown) stores the
selected master's NAME rather than its id, so it stays compatible with the existing
hotel/train booking + invoice flow. The staff options endpoint whitelist now includes
property, mealPlan and quota. Seed adds a few realistic sample options for these three so the
dropdowns are populated. Company Owner modules unchanged.

---

# Update v23 — Phase 1: 3-layer company structure (Main Company → 360 → Customer)

Foundational multi-tenancy, phased "core first". Existing B2B Company model, masters, CMS,
HR, invoice calculations, and the protected OwnerLayout.jsx / MasterForm.jsx are untouched.

## New models
- Organization (server/models/Organization.js): type THREE_SIXTY | MAIN_COMPANY, parentId,
  business details, isDefault/isActive. Separate from the B2B `Company` model.
- SupplierInvoice (server/models/SupplierInvoice.js): Level-1 invoice Main Company → 360,
  SUP-000001 numbering, same footer convention (Net = Gross − Discount − TDS − TCS + Govt Tax).
  The customer Order now has parentInvoiceId linking the child (360 → Customer) invoice to it.

## Data isolation (additive, non-breaking)
- Optional organizationId added to User, Customer, Order (defaults; seed backfills existing
  rows to the default 360 org). Behavior unchanged today because there is one 360 org.
- Auth: protect attaches req.orgId; scopeToOrg(filter, req) and ownsOrg(doc, req) enforce
  tenant isolation server-side. SUPER_ADMIN bypasses (all current Super Admin flows unchanged);
  EMPLOYEE / COMPANY_OWNER are scoped to their org. Blocks cross-org ID/URL tampering.
- Applied to: employees (list/create/update/delete/get), retail customers (list/create) and
  orders (list/create). Retail portal user is stamped with the org so customer bookings resolve.

## COMPANY_OWNER (reused role) + APIs
- /api/org : list org + Main Companies, CRUD Main Companies, update 360 profile.
- /api/supplier-invoices : list/get/create/update/delete supplier invoices (org-scoped).
- Employee management already existed; now org-scoped and stamps organizationId on create.

## Frontend (no owner-file edits)
- New pages Main Companies and Supplier Invoices under Administration (/app/org/*), also
  routed under /owner/org/* by URL. Menu links added in the main app sidebar.

## Seed
- Creates default "360 Travel Concierge" (THREE_SIXTY) + a sample Main Company, and backfills
  existing users/customers/orders to the default org.

## Deferred to later phases (as agreed)
- Org-scoping the remaining modules (wireframe masters, HR, CMS, B2B), a company switcher
  (only if multiple 360 companies are needed later), and owner-sidebar links for the two new
  pages (would require editing the protected OwnerLayout.jsx — left for your approval).

---

# Update v24 — Company Owner invoice access + Employee field alignment (Reqs #1 & #2)

Builds on v23. The protected **OwnerLayout.jsx** and **MasterForm.jsx** are byte-for-byte
unchanged (verified by diff against v23). No breaking schema changes; one additive field.

## #1 — Company Owner invoice management (reused, org-scoped)
- Company Owner now reaches the **same** order→invoice screens the Super Admin uses
  (Create / View / Edit / List invoices, search / filter / pagination) — no duplicate UI.
  Reached via quick-links on the Owner dashboard into the shared `/app` screens, which are
  now open to `COMPANY_OWNER` with a role-filtered sidebar.
- **Backend isolation (not just UI).** Every invoice endpoint verifies ownership server-side
  with `ownsOrg(order, req)`: `getForInvoice`, `generateInvoiceNo`, `downloadInvoice`,
  `previewInvoice`, `emailInvoice`. A Company Owner requesting another company's invoice by
  changing the URL / order id gets **404**, never the data.
- The invoice **listing** is the org-scoped order list (`scopeToOrg`), so a Company Owner only
  ever sees their own company's invoices. Super Admin continues to see everything unchanged.
- Related retail records hardened the same way now that the role can reach them: `getCustomer`,
  `updateCustomer`, `deleteCustomer`, customer documents, `updateOrder`, `deleteOrder`,
  `addPayment` all check `ownsOrg`; `updateCustomer` also strips `organizationId` from the
  payload so a record can't be moved to another tenant.

## #2 — Employee fields aligned between Super Admin and Company Owner
- Company Owner uses the **same** employee Add / Edit / List screens (`admin/EmployeeForm`,
  `admin/EmployeeList`) as the Super Admin — consistent labels, input types, and validation.
- Added the missing **Phone** field end-to-end: `User.phone` (additive, defaults `''`,
  backward-compatible), create/update/read in `authController`, the Add/Edit form, and a new
  **Phone** column in the listing.
- Isolation preserved: employee list/create/update/delete/get are org-scoped; `createEmployee`
  pins the org to the caller's own (only Super Admin may set `organizationId` via payload);
  `resetUserPassword` and `toggleActive` now also check `ownsOrg` to block cross-org id tampering.

## Files changed (11)
- client: `App.jsx` (STAFF includes COMPANY_OWNER), `menuConfig.js` (CO-allowed menus),
  `pages/admin/EmployeeForm.jsx`, `pages/admin/EmployeeList.jsx`, `pages/owner/OwnerDashboard.jsx`.
- server: `models/User.js`, `controllers/authController.js`, `controllers/invoiceController.js`,
  `controllers/retailController.js`, `routes/authRoutes.js`, `routes/retailRoutes.js`.

## Verified
- `node --check` + runtime import of all changed server modules — OK.
- `vite build` — OK. Isolation helper unit checks (CO-A blocked from CO-B's records,
  Super Admin unrestricted, legacy rows not blocked) — all pass.
- `OwnerLayout.jsx` / `MasterForm.jsx` diff vs v23 — identical.

## Pending (awaiting screenshots)
- #3 Account 4-tab form, #4 Contact 3-tab form, #5 Hotel 4-tab form — to be built as dedicated
  tabbed pages once the reference screenshots are provided.

---

# Update v25 — Tabbed Account / Contact / Hotel forms (Reqs #3, #4, #5)

Implemented from the reference screenshots in *Claude_Understandable_Code_Generation_Prompt.docx*.
Built as **dedicated tabbed pages** that reuse the existing master definition + `/owner/masters`
API and the shared `MasterField` renderer. The protected **OwnerLayout.jsx** and **MasterForm.jsx**
are byte-for-byte unchanged (verified by diff vs v23); the generic form still serves the other 77
masters. A single `form` object spans all tabs, so **values are never lost when switching tabs**.

## #3 — Account form, six tabs
Order per the screenshots: **Primary → Contact → Statutory → Additional → TDS & Forex → Ticket.**
All existing `account` fields are mapped to the correct tab; any field not shown in the screenshots
is preserved under an "Other information" group so nothing is dropped. Seven screenshot fields the
schema did not carry were **added additively** (backward-compatible): Currency, Opening Balance,
Opening Type (Debit/Credit), Closing Balance, Rate of Exchange, Forex Amount, Approval Control.

## #4 — Contact form, three tabs
**Personal / Family / Employee.** Personal uses the existing `contactHead` master. Family and
Employee are **repeatable child grids** with real persisted records (list + Add/Edit modal + delete),
backed by two new detail collections `contactFamily` and `contactEmployee`, each scoped to its
Contact head. New contacts save Personal first (**Save & add details**), then the grids unlock.

## #5 — Hotel form, four tabs
**Basic / Room Configuration / Season Configuration / Terms and Conditions.** Basic uses the
existing `hotelHead` master plus additive multi-selects — Meal Plan (Per Night / Package) and
Facility load their options from the existing `mealPlan` / `facility` masters, Weekend Days is fixed.
Room and Season are repeatable child grids backed by new `hotelRoom` / `hotelSeason` collections.
Terms is seven additive textareas (Includes, Excludes, Terms & Condition, Notes, Cancellation Policy,
Refund, Supplement).

## Backend (additive, backward-compatible)
- `masterEngine/masterDetails.js` (new): appends the Account/Hotel screenshot fields and registers
  four **hidden, parent-scoped** detail masters (`contactFamily`, `contactEmployee`, `hotelRoom`,
  `hotelSeason`). Stored like every master (an `me_<key>` collection), reusing the whole owner CRUD
  pipeline — no new routes needed.
- `masterController.js`: catalog now hides detail masters; `list` accepts `?parentId=` to scope a
  detail master to its parent head. Nothing else changed.

## Files changed / added (v25)
- client: `App.jsx` (6 dedicated routes, static-ranked above the generic `:key`), new
  `pages/owner/forms/` → `AccountForm.jsx`, `ContactForm.jsx`, `HotelForm.jsx`, `formHelpers.jsx`
  (shared `FieldsGrid`, `DetailGrid`, `MultiCheck`).
- server: `masterEngine/masterDetails.js` (new), `masterEngine/masterController.js`.

## Verified
- `vite build` — OK (159 modules). All server modules import — OK.
- Master-engine CRUD tests through the real controller (in-memory model): catalog hides details;
  create with enum + number coercion; required-field validation; **parent-scoped list with no
  cross-parent leakage**; multi-select arrays and terms textareas persist; update/delete round-trip —
  all pass. (A live-DB round-trip wasn't run because the sandbox can't fetch the MongoDB binary.)
- `OwnerLayout.jsx` / `MasterForm.jsx` and `server/package.json` — identical to v23.

## Notes / assumptions (screenshot-driven)
- Account "Analysis Account", "Registration Type", and Contact "Reference Account" are kept with
  their existing field types (not converted to new dropdowns) to avoid inventing relationships the
  schema/screenshots don't establish. Country/State on the Account Contact tab appear disabled in the
  screenshot and are represented by the existing City reference. Room "Sharing" options
  (Both/Single/Double/Triple) are a sensible default — confirm the exact list if it differs.

---

# Update v26 — Company Owner: accounts, bookings, B2B access, employee parity, Master-menu fix

Implemented from *Claude_Understandable_Employee_CompanyOwner_OrderBooking_Prompt.docx* (7 screenshots
of the running app). Decisions confirmed with the client: keep the two Employee entities but make each
reachable by both roles; new Company Owners belong to the default **360 organization**; Company Owner
menus = Masters + Orders/Booking + Invoices + Employees + Retail & B2B (Society/FIT excluded).
The protected **OwnerLayout.jsx** / **MasterForm.jsx** and **server/package.json** are unchanged vs v23.

## #4 — "Master menu logs me out" (root-caused and fixed)
Cause: the `/owner` master area was `COMPANY_OWNER`-only **and** the `Protected` route guard redirected
to the **login page** on any role mismatch (and the axios interceptor hard-redirects on 401). So a
Super Admin (or any non-CO) opening the Master menu landed on the login screen — looking like a forced
logout. Fix: `Protected` now keeps an authenticated user signed in and bounces a wrong-role visit to
**their own home** (never `/login`); the owner area + `/api/owner/*` now allow **COMPANY_OWNER and
SUPER_ADMIN** (admin access), with record-level isolation still enforced in the controllers.

## #3 — Superadmin creates & manages Company Owner accounts (new)
- Backend (Super-Admin-only): `GET/POST/GET:id/PUT/DELETE /api/auth/company-owners`. New Company Owners
  are created as `COMPANY_OWNER` users bound to the default 360 org and isolated by the usual tenant rules.
- Frontend: **Administration → Company Owners** (`/app/admin/company-owners`) — list + add/edit (name,
  email, phone, password, active). Super-Admin-gated in the UI and on every endpoint.

## #1 / #2 — Employee forms consistent across roles ("keep both")
The two Employee screens are different entities and stay distinct: *Team/Employees* = **login users**
(email/password/role + module/menu/service permissions); *Employee* = **HR staff master** (personal/HR
fields, no login). Both are now reachable by **both** roles through the same shared components:
Super Admin reaches the HR Employee master via the owner area (unlocked by the #4 fix); Company Owner
reaches the login-User Team/Employees form (org-scoped, from v24). No duplicate schema was created.

## #5 / #6 — Company Owner Order/Booking + Retail & B2B menus
- Company Owner now sees **Retail** and **B2B** menus and uses the **same** booking screens as Super Admin
  — including the B2B booking flow (Company → Requested-by member → Booking type → Bus/Cab/Event/Flight/
  Hotel/Registration/Train/Visa), reached from B2B → Companies → New booking. Retail order booking was
  already available (v24). No booking component, API, validation or business logic was duplicated.

## #7 — Tenant/company data isolation (extended to B2B)
- Added `organizationId` to the **Company** model (additive, backfilled to the 360 org in the seed).
- `b2bController` is now fully org-scoped: `listCompanies` uses `scopeToOrg`; `createCompany`/`createOrder`
  stamp the caller's org and strip any client-supplied `organizationId`; every company sub-resource
  (get/update/delete, members, contacts, documents, passengers, payments, company orders) is guarded by a
  `loadOwnedCompany` ownership check; payment allocations must target the same company's orders. A Company
  Owner can never read or write another company's companies, members, bookings or payments; Super Admin is
  unrestricted; B2B routes now allow `COMPANY_OWNER`.

## Files changed / added (v26)
- client: `App.jsx` (guard fix + SA-only CO routes + owner area opens to SA), `menuConfig.js`
  (CO Retail+B2B, Company Owners menu), new `pages/admin/CompanyOwnerList.jsx`, `pages/admin/CompanyOwnerForm.jsx`.
- server: `controllers/authController.js` (CO account CRUD), `controllers/b2bController.js` (org isolation),
  `routes/authRoutes.js`, `routes/b2bRoutes.js`, `routes/ownerRoutes.js`, `models/Company.js` (organizationId),
  `utils/seed.js` (Company org backfill).

## Verified
- `vite build` — OK (161 modules). All server modules import — OK.
- Route introspection confirms the 5 `/api/auth/company-owners` endpoints and the CO-accessible B2B routes.
- Isolation helpers re-checked (CO blocked cross-org, Super Admin unrestricted, `scopeToOrg` adds the org
  filter). B2B controller audited: no unguarded Company/Order/User access remains.
- `OwnerLayout.jsx` / `MasterForm.jsx` / `server/package.json` — identical to v23. (A live-DB round-trip
  wasn't run because the sandbox can't fetch the MongoDB binary; isolation reuses the v24/v25 pattern
  already verified end-to-end.)

## Notes / assumptions
- "Keep both" employee forms per your decision — the two remain separate records (login user vs HR staff),
  now consistently reachable by both roles rather than merged into one schema.
- New Company Owners are bound to the default 360 organization (your decision); the Company Owner account
  form therefore has no org picker.

---

# Update v27 — Company Owner operates inside its own login (no more "redirected to Super Admin")

Fixes the reported issue: the Company Owner dashboard's quick-links (Orders & Invoices, Employees,
Supplier Invoices, Main Companies) sent the CO into the **/app** (Super Admin) shell, where the CO
landed on the admin layout and saw its menus. Now every one of those features runs **inside the
Company Owner login** (the `/owner` shell), and the Company Owner is no longer routed into `/app` at all.
Backend permissions/isolation are unchanged (already done in v24/v26). Protected **OwnerLayout.jsx** /
**MasterForm.jsx** and **server/package.json** remain byte-for-byte identical to v23.

## What changed
- **Shell-aware navigation.** New `hooks/useShellBase.js` returns the current shell root (`/owner` or
  `/app`) from the URL. The shared feature pages now navigate with that base instead of a hardcoded
  `/app`, so a page keeps you in whichever shell you opened it from:
  retail `OrderList`, `BookingFlow`, `OrderDetail`, `CustomerList`, `CustomerForm`; `InvoiceGenerate`;
  admin `EmployeeList`, `EmployeeForm`; b2b `CompanyList`, `CompanyForm`, `CompanyDetail`, `BookingFlow`.
- **Features mounted under `/owner`** (same components as `/app`, so nothing is duplicated):
  `retail/customers`, `retail/orders` (+ new / detail), `b2b/companies` (+ new / detail / booking),
  `admin/employees` (+ new / edit), `invoices/:orderId/generate`. `org/main-companies` and
  `org/supplier-invoices` were already under `/owner`.
- **Dashboard quick-links** (`OwnerDashboard.jsx`) now point to `/owner/...` — Orders & Invoices,
  Employees, Supplier Invoices, Main Companies — so they open in the owner shell.
- **Company Owner removed from the `/app` shell.** `STAFF` is now `['EMPLOYEE','SUPER_ADMIN']`. A CO
  that hits any `/app` URL is bounced to `/owner` (never logged out), so it can no longer see the Super
  Admin menus. Super Admin still reaches the owner area (`OWNER_AREA`) for administrative access.

## Why this is safe
- No backend change: the retail / b2b / employees / invoice / org APIs already allow `COMPANY_OWNER`
  and enforce per-record org isolation (v24/v26), so the CO sees only its own company's data here too.
- The CO master sidebar (`OwnerLayout.jsx`) is a protected file and was not touched; the Dashboard
  (with its quick-links) remains the navigation hub, and each feature renders in the owner shell's Outlet.

## Files changed / added (v27)
- client: new `hooks/useShellBase.js`; `App.jsx` (owner routes + STAFF); `pages/owner/OwnerDashboard.jsx`
  (quick-links to /owner); shell-aware edits to the 12 shared pages listed above.

## Verified
- `vite build` — OK (162 modules). No hardcoded `/app` navigation remains in any CO-reachable page
  (only comments / Super-Admin-only / FIT pages, which a Company Owner never opens).
- `OwnerLayout.jsx` / `MasterForm.jsx` / `server/package.json` — identical to v23.

---

# Update v28 — Superadmin/Company-Owner authorization, Change Service, common employee fields

Implemented from the "Superadmin & Company Owner Updates" spec. Decision confirmed: employee fields
are unified as a **union of fields, keeping two records**. Protected **OwnerLayout.jsx** /
**MasterForm.jsx** and **server/package.json** remain byte-for-byte identical to v23.

## #1 — Superadmin → Company Owner (no auto-redirect) + explicit "Login as"
- The Super Admin sidebar item "Company Owner" linked straight to `/owner`, dropping the admin onto
  the Company Owner dashboard. It now opens the **Company Owners management page**
  (`/app/admin/company-owners`) and stays in the Super Admin panel.
- Added explicit impersonation: **"Login as"** on each Company Owner row → `POST /api/auth/company-owners/:id/login-as`
  (Super-Admin-only) issues that owner's session while keeping the admin's own token. A top banner
  ("Viewing as Company Owner — Return to Super Admin") switches back in one click. No automatic redirect.

## #2 — Order creation: Back / Change Service
- All three booking flows (retail, B2B, FIT) now show a prominent **"← Change Service"** control at the
  top of the service form (and on the action row), returning to the service picker without using the
  browser Back button. Consistent across every service type.

## #3 — Common employee fields (union, two records)
- **Superadmin Team/Employee form** gains an **HR / Personal details** section (address, city, mobile,
  birth/anniversary/join/resign dates, department, designation, licence (+date), badge (+date), basic
  salary, opening leave, RBI authority, GDS sign-ins Amadeus/Galileo/Abacus, bank, KYC date). Stored on
  the User as an additive `hr` object; create/update/read wired in `authController`. City/Department/
  Designation are dropdowns sourced from the shared masters.
- **Company Owner HR Employee form** gains the login/access fields — Employee Type, Account Status,
  Module Access, Menu Access, Service Booking Rights — added to the `employee` master. `MasterField`
  now renders multi-select and multi-ref checklists. (No plaintext password is stored on HR records —
  credentials live only on real User logins; the rest of the login/permission *data* is captured.)
- Both forms now present the same complete field set; each role still saves to its own record type.

## #4 / #6 — Company Owner access control (backend-enforced)
- **Main Companies** and **Supplier Invoices** removed from the Company Owner (dashboard links and
  `/owner` routes), and their APIs locked to **Super Admin only** (`organizationRoutes`,
  `supplierInvoiceRoutes` changed from `COMPANY_OWNER + SUPER_ADMIN` to `SUPER_ADMIN`). A Company Owner
  that calls those endpoints directly now gets **403**, not just a hidden menu.
- The Company Owner already runs entirely in its own `/owner` shell (v27) and cannot reach `/app`
  (`STAFF = EMPLOYEE, SUPER_ADMIN`); a wrong-shell URL bounces home without logging out.

## #5 — Company-specific invoice
- The Company Owner's **Orders & Invoices** (order→invoice) runs in the `/owner` shell and is already
  org-scoped on the backend (v24): `scopeToOrg` on the order list, `ownsOrg` on every invoice endpoint,
  and the company is taken from the authenticated user — a Company Owner sees and edits only its own
  company's invoices, never another company's or the Super Admin's.

## Access matrix (enforced at route/controller/DB level)
- Company Owner Management / Create / Edit / Login-as, Main Companies, Supplier Invoices → **Super Admin only**.
- Company Employee Management, Invoice Management → **Company Owner (own company only)** + Super Admin.
- Cross-company employees/invoices → blocked for Company Owner (org isolation from v24/v26).

## Files changed / added (v28)
- client: `App.jsx` (impersonation banner mount, org routes off `/owner`), `menuConfig.js` (Company Owner
  menu → management page; CO_ALLOWED trimmed), `context/AuthContext.jsx` (loginAsOwner / returnToAdmin),
  new `components/ImpersonationBanner.jsx`, `pages/admin/CompanyOwnerList.jsx` (Login as),
  `pages/owner/OwnerDashboard.jsx` (links trimmed), `pages/owner/MasterField.jsx` (multiselect/multiref),
  `pages/admin/EmployeeForm.jsx` (HR section), `pages/retail/BookingFlow.jsx`, `pages/b2b/BookingFlow.jsx`,
  `pages/fit/BookingFlow.jsx` (Change Service).
- server: `controllers/authController.js` (login-as + employee `hr`), `routes/authRoutes.js`,
  `routes/organizationRoutes.js`, `routes/supplierInvoiceRoutes.js` (SA-only), `models/User.js` (`hr`),
  `masterEngine/masterDetails.js` (employee access fields).

## Verified
- `vite build` — OK (163 modules). All server modules import; `login-as` route registered Super-Admin-only;
  org/supplier routes Super-Admin-only. Master-controller test: employee enum/boolean/multiselect/multiref
  access fields create, persist and update correctly (8/8).
- `OwnerLayout.jsx` / `MasterForm.jsx` / `server/package.json` — identical to v23. (No live-DB round-trip:
  the sandbox can't fetch the MongoDB binary; isolation reuses the v24/v26 pattern verified earlier.)

## Assumptions
- Supplier Invoices treated as a 360/Super-Admin function and removed from the Company Owner (the access
  matrix lists it among Super-Admin-only areas; easily re-enabled if you want COs to keep it).
- Employee HR records do not store a login password (security); if you want a Company Owner "employee" to
  also be a login, that's the "one shared schema" option — say the word and I'll switch to it.

---

# Update v29 — One Employee form for both roles + Company-Owner Order→Service→Invoice + security audit

Implemented from the "Employee Form & Company Owner Access" spec. Protected **OwnerLayout.jsx** /
**MasterForm.jsx** and **server/package.json** remain byte-for-byte identical to v23.

## #1 / #6 — Superadmin and Company Owner Employee forms are now the SAME form
Per the spec ("reuse the Superadmin components for Company Owner instead of maintaining two
implementations"), the Company Owner no longer has a separate HR-only Employee form. Both roles now
use the **single login-User "Team / Employees" form** (same component, same design, same fields —
including the HR/personal section added in v28). The old HR-only `employee` wireframe master is
**hidden from the Company Owner catalog** so it no longer appears as a second, differently-designed
form, and any stale `/owner/employee…` link redirects to the unified form (`/owner/admin/employees`).
The master's data is preserved and it still works as a dropdown source (e.g. Contact → Preferred
Driver). Company-Owner employee data stays **org-scoped** (v24): a CO manages only its own company's
employees — enforced in the API (`scopeToOrg` on list, `ownsOrg` on get/update/delete), not just the UI.

## #3 / #4 — Company Owner Order → Service → Invoice now works end-to-end
Found and fixed a real blocker: `GET /services` (needed to pick a service during booking) allowed only
Employee + Super Admin, so the Company Owner's Order→Service step silently returned nothing. Services
are global master data, so **read access now includes `COMPANY_OWNER`** (`GET /services`,
`GET /services/master-options`); creating/editing the service master stays admin-only. The Company
Owner's Orders, booking (service selection), and invoice generation all run inside the `/owner` shell
(v27) and are company-scoped: the invoice's company is taken from the authenticated user and every
invoice endpoint enforces `ownsOrg` (v24) — a CO creates/sees invoices only for its own company's orders.

## #2 / #5 / #7 / #8 — Company Owner cannot reach Super Admin (verified)
- The Company Owner runs entirely in its own `/owner` shell and is **not** in the `/app` (Super Admin)
  shell (`STAFF = EMPLOYEE, SUPER_ADMIN`, v27); any `/app` URL bounces it home without logging out.
- Backend route-guard audit (ran against the real `allow` guards) confirms, for a Company Owner token:
  - **Denied 403**: Company Owner management, Main Companies, Supplier Invoices, service-master writes,
    HR, CMS, FIT, Settings (Super-Admin / admin-only areas).
  - **Allowed (own company only, org-scoped)**: employees, retail orders/customers, B2B, read services,
    its own master area, invoices.
  - Super Admin access is unchanged.

## Files changed (v29)
- server: `routes/serviceRoutes.js` (CO read access), `masterEngine/masterDetails.js` (hide HR `employee`
  master; remove the now-obsolete HR-form access fields).
- client: `App.jsx` (redirect stale HR-employee routes to the unified form).

## Verified
- `vite build` — OK (163 modules). Catalog hides the HR `employee` master (79 visible; Department /
  Designation remain). `GET /services` guard now admits Company Owner.
- Route-guard audit: Company Owner denied on all Super-Admin-only areas, allowed only where intended;
  Super Admin unchanged (all assertions pass).
- `OwnerLayout.jsx` / `MasterForm.jsx` / `server/package.json` — identical to v23. (No live-DB round-trip:
  the sandbox can't fetch the MongoDB binary; data isolation reuses the v24/v26 pattern verified earlier.)

## Note
- The single Employee form is the login-User form, so a Company Owner's "employee" is a login account
  (the design the spec asked for: reuse the Super Admin form). The retired HR-only master kept its data;
  say the word if you want its standalone form back as well.

---

# Update v30 — Fix: retail customers could not see their own orders/invoices (403)

## Bug
A logged-in Retail Customer's portal calls `GET /api/retail/orders?customerId=…`, but that route was
guarded by `staff = EMPLOYEE, SUPER_ADMIN, COMPANY_OWNER` — which excludes `RETAIL_CUSTOMER`. So the
request was rejected with **403 "Forbidden: insufficient role"** before the controller ran, even though
`listOrders` is written to scope a retail customer to their own `customerId`. Result: an order/booking
created for a customer from Super Admin never appeared in that customer's login, and invoices didn't
show either (the portal couldn't load the orders they hang off).

## Fix (backend only)
- `routes/retailRoutes.js`: `GET /orders` and `GET /orders/:id` now allow `RETAIL_CUSTOMER` in addition
  to staff. The controller still **forces** a retail customer to their own `customerId` (list) and
  rejects any other customer's order (detail), so a customer sees only their own data.
- `controllers/retailController.js`: `getOrder` now also checks, for a `RETAIL_CUSTOMER`, that the order's
  `customerId` matches the caller — defense-in-depth so one customer can't open another's order by id.
- B2B member portal was already correct (`GET /b2b/my-orders`, allowed for `B2B_MEMBER`); no change.

## Verified
- Route-guard check: `RETAIL_CUSTOMER` is now admitted on `GET /retail/orders`; `SUPER_ADMIN` still
  admitted; `B2B_MEMBER` still not on the retail route (they use `/b2b/my-orders`).
- `OwnerLayout.jsx` / `MasterForm.jsx` / `server/package.json` — unchanged vs v23.

---

# Update v31 — Company Owner dashboard/menu reshuffle + Sales/Purchase invoice direction

Protected **OwnerLayout.jsx** / **MasterForm.jsx** and **server/package.json** remain identical to v23.

## #1 / #2 / #6 — Order & Invoices and Employees move from dashboard buttons to the Company menu
- Removed the two dashboard quick-link buttons (Orders & Invoices, Employees) from the Company Owner
  dashboard. The functionality and data are untouched.
- Added **Order & Invoices** and **Employees** under the **Company** section of the Company Owner
  sidebar menu. Because the sidebar is generated from the `/owner/masters` catalog (and OwnerLayout is a
  protected file), these are injected as two `virtual` catalog entries (`menu: 'Company'`) that reuse the
  existing routed pages — Order & Invoices → `/owner/retail/orders`, Employees → `/owner/admin/employees`
  (the unified login-User Employee form from v29). The dashboard filters the virtual entries out of its
  master-card grid, so they appear only in the Company menu — no duplicate Employee entry, no OwnerLayout edit.

## #4 — Sales vs Purchase invoice direction (server-determined)
- The architecture already separates the two: a customer **Order→invoice** (Company Owner / 360 selling to
  a customer) vs the **SupplierInvoice** (360 ← Main Company). I made the direction explicit:
  - `Order.invoiceDirection` (enum SALES/PURCHASE, default **SALES**), stamped **server-side** in
    `generateInvoiceNo` — never from a client value. A customer invoice is always a **Sales Invoice**.
  - `SupplierInvoice.invoiceDirection` defaults to **PURCHASE**.
- A Company Owner can only create **Sales** invoices (customer Order→invoice, org-scoped). The **Purchase**
  (Supplier) invoice module is **Super-Admin-only** (v28), so a Company Owner can never create or see a
  purchase invoice. The existing 360/Super-Admin supplier-invoice workflow is unchanged.
- The invoice screen shows a **Sales Invoice / Purchase Invoice** badge.

## #3 / #5 — Company isolation (verified, already enforced)
- Employee: `createEmployee` pins the org to the authenticated user (only Super Admin may pass
  `organizationId`; a Company Owner is always pinned to its own org); list is `scopeToOrg`, and
  get/update/delete use `ownsOrg`. A Company Owner can't see or edit another company's employees, and an
  id from the browser can't cross companies.
- Invoice: `generateInvoiceNo` / `getForInvoice` enforce `ownsOrg`, so a Company Owner invoices only its
  own company's orders. `invoiceDirection` is server-set, so a client can't flip Sales↔Purchase.

## Files changed (v31)
- server: `masterEngine/masterController.js` (Company-menu virtual entries), `models/Order.js` +
  `controllers/invoiceController.js` (invoiceDirection SALES), `models/SupplierInvoice.js` (PURCHASE).
- client: `pages/owner/OwnerDashboard.jsx` (remove buttons; hide virtual cards),
  `pages/invoice/InvoiceGenerate.jsx` (Sales/Purchase badge).

## Verified
- `vite build` — OK (163 modules). Catalog now lists Order & Invoices + Employees under the Company menu
  (virtual), HR employee master stays hidden; employee org-pinning + isolation confirmed in the controller.
- `OwnerLayout.jsx` / `MasterForm.jsx` / `server/package.json` — identical to v23.

## Assumption (flag)
- "Company Owner creates Sales, 360/Super-Admin creates Purchase" is mapped to the existing two modules:
  every customer Order→invoice is a **Sales** invoice (what the Company Owner creates), and the
  Super-Admin-only Supplier-invoice module is the **Purchase** invoice. If you instead meant that a
  customer invoice should be tagged **Purchase** when a Super Admin (rather than a Company Owner) clicks
  Generate, tell me and I'll switch to role-based stamping on that screen.

---

## v32  Orders edit/cancel, leave approval, modal scroll, supplier-invoice download, non-destructive seeder

Seven changes, all built on the v31 code and reusing existing models/controllers/components.

### 1. Order  Edit (only before invoice)
- `models/Order.js`: added `cancelled` / `cancelledAt` / `cancelReason` (additive).
- `controllers/retailController.js` `updateOrder`: now 400s if `invoiceGenerated` (or cancelled)  edit
  is blocked on the backend, not just hidden.
- UI `retail/OrderList.jsx` + `retail/OrderDetail.jsx`: **Edit** shows only when no invoice yet and not
  cancelled; it opens the booking form in edit mode (`retail/orders/:id/edit`  reuses `BookingFlow`).

### 2. Order  Cancel (only after invoice)
- `controllers/retailController.js` `cancelOrder` + route `PUT /retail/orders/:id/cancel`: 400s unless
  `invoiceGenerated` is true; soft-cancels (keeps the record for invoice history).
- UI: **Cancel** shows only when an invoice exists and the order is not already cancelled; a Cancelled
  badge is shown in the listing and on the detail page.

### 3. Employee leave  no self-approval
- `controllers/hrController.js` `decideLeave`: requires an authorized approver (`isAdmin`  SUPER_ADMIN
  or `ALL` menu) and 403s if the approver is the same user who submitted the request.
- UI `hr/LeaveRequests.jsx`: hides Approve/Reject on the user's own rows (Your own request) and for
  non-approvers (Awaiting approval).

### 4 & 6. Modal scrolling (Supplier Invoice + Testimonial)
- `components/ui/index.jsx` `Modal` (shared by both and every other modal): the card is capped at
  `max-h-[90vh]` with a fixed header and a scrollable body, so Create/Save/Cancel stay reachable on any
  resolution. One central fix  no per-screen duplication, short modals unaffected.

### 5. Supplier Invoice  Download
- `utils/invoicePdf.js`: added a generic `order.pdfLines` row source (additive) so the **existing** PDF
  builder is reused rather than duplicated.
- `controllers/supplierInvoiceController.js` `downloadInvoice` + route `GET /supplier-invoices/:id/pdf`
  (Super-Admin-only, org-scoped  users can only download invoices they may access).
- UI `org/SupplierInvoices.jsx`: **Download** action (authenticated blob request).

### 7. MongoDB  non-destructive seeder
- `utils/seed.js` rewritten: **all** `deleteMany()`/`drop()` removed; every record is check-before-insert
  (find-then-create). Existing collections/data are never cleared or overwritten (existing user passwords
  are kept). The org backfill only fills a **missing** `organizationId` and never changes a set value.

### Verified
- `vite build`  OK (163 modules). `node --check` + ESM import OK on every changed server file.
  New routes present in the router stacks (`/orders/:id/cancel`, `/supplier-invoices/:id/pdf`).
- `grep` confirms **no** deleteMany/drop/truncate/remove in `seed.js` (only the header comment names them).
- `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` / `server/package.json`  untouched (identical to v23/v31).

### Assumptions
- "Authorized approver" for leave = the existing `isAdmin` rule (SUPER_ADMIN or the `ALL` menu); no new
  manager role was introduced since the role/permission structure already models approvers this way.
- The supplier-invoice PDF reuses the customer-invoice template; the Main Company (supplier) is shown as
  the billing party and the document is typed PURCHASE.

---

## v33 — Order hold, delete-lock, booking PNR/PO, hierarchy service charge, invoice cancel + credit note, permission matrix

Nine changes, built on v32, reusing existing models/controllers/components. Inspection-first; two
items were clarified before coding (service-charge mechanic = manual at billing time; permissions =
replace the flat menu list with a per-menu 7-action matrix).

### 1. Order Hold
- `models/Order.js`: added `onHold`/`heldAt`/`holdReason` (additive) + a `lifecycleStatus` virtual
  (Cancelled > Invoice Cancelled > Invoiced > On Hold > Open) for a clear single status.
- `controllers/retailController.js` `holdOrder`/`releaseOrder` + routes `PUT /retail/orders/:id/hold`
  and `/release`. A held order cannot be invoiced — `invoiceController.generateInvoiceNo` 400s while
  `onHold`. UI: Hold/Release buttons and an "On hold" badge on the listing and detail pages.

### 2. No delete after invoice / cancellation
- `deleteOrder` now 400s when `invoiceGenerated` or `cancelled` (kept for audit/reporting; never
  physically removed). The Delete button is hidden in those states on the listing.

### 3–6. PNR / Purchase Order Unique Number (Cab, Visa, Event, Hotel)
- The four services share the common `serviceLineSchema` (strict:false) + the shared form system, so
  one reusable field key `pnrPoNumber` was added to CAB/VISA/EVENT/HOTEL in `shared/serviceForms.js`.
  Stored automatically, shown automatically on the order detail (via `formFor`), and printed on the
  invoice PDF detail line. No new tables/fields per service.

### 7. 360 → Company Owner → Employee → Customer/B2B/Society billing + service charge
- Service-charge mechanic is **manual at billing time** (per your answer): added a manual
  `serviceChargeAmount` to the invoice footer in `invoiceCalc.js` (client + server),
  `invoiceController.computeInvoiceTotals`, the Order model, the Generate screen and the PDF.
  Net = Gross − Discount − TDS − TCS + Govt Tax **+ Service Charge** (defaults to 0, so existing
  invoices are unchanged).
- The hierarchy distinction is recorded on each invoice via `billedToType`
  (RETAIL_CUSTOMER / B2B_COMPANY / SOCIETY), stamped server-side at generation. Roles
  (SUPER_ADMIN / COMPANY_OWNER / EMPLOYEE) and the existing org layer already separate the actors.

### 8. Invoice cancellation + Credit Note (Super Admin only)
- New `models/CreditNote.js` (CN-###### per org, references the order + a snapshot of the cancelled
  invoice). `invoiceController.cancelInvoice` + `POST /invoices/:orderId/cancel`, guarded by
  `allow(SUPER_ADMIN)` — a Company Owner/Employee cannot cancel even via a direct API call.
  Cancelling flags the order (`invoiceCancelled`, `creditNoteNo`) and raises the linked credit note;
  the original invoice/order is never deleted. New `GET /invoices/credit-notes` + a Credit Notes page.
  The PDF shows a "CANCELLED — Credit Note …" stamp.

### 9. Menu-wise 7-action permission matrix
- `models/User.js`: added `permissions` (`{ menuKey: ['SELECT','READ','CREATE','EDIT','DELETE',
  'EXPORT','IMPORT'] }`) and `PERMISSION_ACTIONS`; `menus` is now **derived** from it on save so the
  existing sidebar keeps working. `EmployeeForm.jsx`: the old flat menu checklist is replaced by a
  per-menu action matrix (column/row/all toggles).
- Backend enforcement: `middleware/auth.js` `hasPermission`/`can(menuKey, action)`. Applied to the
  retail order routes (create=CREATE, edit/hold/release/cancel=EDIT, delete=DELETE). Super Admin
  bypasses; Company Owner may create/edit but never DELETE (req #8); employees are governed by their
  matrix; legacy employees (menus only, no matrix) fall back to full access on a granted menu so
  nothing breaks. Invoice cancel stays Super-Admin-only via the route guard.

### Database changes (all additive, backward-compatible)
- Order: `onHold, heldAt, holdReason, serviceChargeAmount, billedToType, invoiceCancelled,
  invoiceCancelledAt, invoiceCancelReason, creditNoteId, creditNoteNo` + `lifecycleStatus` virtual.
- User: `permissions`.
- New collection: `creditnotes` (created on first credit note). No migrations needed; no data touched.

### New / changed routes
- `PUT /api/retail/orders/:id/hold`, `PUT /api/retail/orders/:id/release`
- `POST /api/invoices/:orderId/cancel` (Super Admin only), `GET /api/invoices/credit-notes`
- Permission checks added to `POST/PUT/DELETE /api/retail/orders*`.

### Verified
- `vite build` OK (164 modules). `node --check` + ESM import OK on every changed/new server file.
  Router stacks confirm the new endpoints (hold/release/cancel, credit-notes, invoice cancel).
- `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` / `server/package.json` — untouched.
- Seeder remains non-destructive (v32); no new destructive operations introduced.

### Assumptions
- #7: with "manual at billing time", the 360 service charge is a manual footer amount included in
  the net; `billedToType` records the party distinction. No automatic commission/margin was invented.
- #9: the per-menu matrix is enforced on the Orders routes (the spec's worked example) and invoice
  cancel (SA-only); the same `can()` guard can be extended to other menus' routes identically. The
  reference screenshot wasn't provided, so the matrix follows the exact 7 actions listed in the spec.

### Remaining / notes
- Backend action-permission enforcement is wired on the Order (and invoice-cancel) routes as the
  concrete example; extending `can()` to every other module's routes is mechanical and can follow.

---

## v34 — Permission matrix "All"-first, form validation messages, scrolling, and real permission enforcement

Four fixes to the v33 permission work, done in the existing architecture (no rebuild).

### 1. "All" is the first permission column
- `admin/EmployeeForm.jsx`: in the menu permission matrix the per-row **All** toggle now renders as
  the first column (before Select/Read/Create/Edit/Delete/Export/Import). It still selects/clears
  every action for the row and stays in sync; the column header toggles and "Grant all"/"Clear all"
  are unchanged.

### 2. Validation / error messages are shown
- Forms that previously swallowed errors now surface them in a visible alert and keep the entered
  values: `admin/EmployeeForm.jsx`, `hr/HolidayMaster.jsx`, `masters/{Cluster,Division,Grade,
  Department,Service}Master.jsx`, `retail/CustomerList.jsx`. Server messages (e.g. a 403 from a
  permission check, or "Email already in use") are displayed; no stack traces/SQL are exposed.

### 3. Horizontal + vertical scrolling
- `components/ui/index.jsx` `Table`: the wrapper was `overflow-hidden` (which **clipped** wide
  tables); it is now `overflow-x-auto`, so every wide table — and the permission matrix — scrolls
  horizontally instead of hiding columns/action controls. The app shell's `main` already scrolls
  vertically, so long pages/tables remain usable; no nested scroll traps were introduced.

### 4. Permission enforcement (Holiday Master regression + consistent rollout)
Root cause: list screens rendered Edit/Delete unconditionally and the mutating routes were guarded
only by role (`allow(EMPLOYEE, SUPER_ADMIN)`), never by the per-action matrix — so a Select/Read
user saw the buttons and could call the endpoints directly.
- **Frontend:** added `can(menuKey, action)` to `AuthContext` (mirrors the backend exactly:
  SUPER_ADMIN/`ALL` full; COMPANY_OWNER all-but-DELETE; EMPLOYEE by matrix; legacy employees fall
  back to menu access). Action controls are now gated on: Holiday Master (the regression), the
  Society masters (Cluster/Division/Grade/Department), Service Master, Customers, and FAQ &
  Testimonials. Edit/Delete/Create appear only when the user holds that action.
- **Backend:** applied `can(menuKey, action)` to the mutating routes for holidays (`hr-holidays`),
  FIT masters/doctors/employees/orders, services (`admin-services`), CMS
  (categories/destinations/packages/`cms-content`), retail customers, and B2B companies. Reads stay
  open to anyone who can see the menu; Super Admin bypasses; a direct API call without the action is
  rejected 403. (Retail orders + invoice-cancel were already enforced in v33.)
- **Regression check (Holiday Master):** with only Select + Read granted, the Add/Edit form is
  hidden, the row Edit/Delete actions are not rendered, and `PUT/DELETE /api/hr/holidays/:id` return
  403 — while the list remains viewable.

### Files changed
- client: `context/AuthContext.jsx`, `components/ui/index.jsx`, `pages/admin/EmployeeForm.jsx`,
  `pages/hr/HolidayMaster.jsx`, `pages/masters/{Cluster,Division,Grade,Department,Service}Master.jsx`,
  `pages/retail/CustomerList.jsx`, `pages/cms/ContentMaster.jsx`.
- server: `middleware/auth.js` (already had `can`), `routes/{hr,fit,service,cms,retail,b2b}Routes.js`.
- No model/DB/migration changes; no data touched; seeder unchanged.

### Verified
- `vite build` OK (164 modules); `node --check` + ESM import OK on all changed server routes.
- `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` / `server/package.json` — untouched.

### Assumptions / notes
- Each screen maps to its existing menu key (e.g. Holiday Master → `hr-holidays`). The same two-line
  `can()` gate + route guard pattern is applied consistently and can be extended to any remaining
  list screen (e.g. Doctor/Society-member lists, which are already enforced server-side) identically.
- Reads (list/detail) are governed by menu visibility, not a separate READ gate, matching the
  existing design; mutations are the actions enforced per the matrix.

---

## v35 — Order-permission gating for "Book Now" / "Order" actions (Retail Customers + Companies)

**Root cause.** When the Orders permission (`retail-orders`, labelled "Orders") is removed from an
employee, `visibleMenu` correctly hides the Orders menu (and drops the empty parent), but the
order-creation actions on the Retail Customer listing and the Companies listing were rendered
unconditionally and keyed off nothing — and the B2B order route had no per-action guard. So the
buttons stayed visible and `POST /api/b2b/orders` was reachable directly.

**Fix (uses the existing `can()` helper + `retail-orders` key — no new key invented).** The app has a
single Orders permission key (`retail-orders`); there is no separate B2B-orders menu, so the same key
governs order creation on both screens, applied identically per the spec.

- `retail/CustomerList.jsx`: "Book now" now requires `retail-orders` **CREATE**; the "Orders" button
  requires `retail-orders` **READ/SELECT**. Customer Edit/Delete stay on their own `retail-customers`
  permission (unchanged from v34).
- `b2b/CompanyList.jsx`: header "New booking" and the row "Book" require `retail-orders` **CREATE**.
  "New company" / "Open" / company Edit/Delete are left as-is (not order actions).
- `b2b/CompanyDetail.jsx` (Booking history tab): "+ New booking" requires `retail-orders` **CREATE**.
  Also passed the shell `base` into `OrdersTab` (it was out of scope), so the gated button — and the
  tab's invoice links — resolve correctly for authorized users.
- `routes/b2bRoutes.js`: `POST /orders` now guarded by `can('retail-orders','CREATE')` — a direct
  request without the Orders permission is rejected 403 even when the button is hidden. (Retail order
  creation was already guarded in v33; FIT in v34.)

**Frontend vs backend.** Visibility is enforced in the UI via the shared `can(menuKey, action)`
(AuthContext), which mirrors the server exactly; authorization is enforced on the server via the
`can()` middleware on the order-creation routes, so hidden buttons can't be bypassed by URL/API.

**Menu (#1).** No change needed — `visibleMenu` already hides `retail-orders` when it has no granted
action and drops a parent section whose children are all inaccessible. Verified by inspection.

**Files changed:** `client/src/pages/retail/CustomerList.jsx`, `client/src/pages/b2b/CompanyList.jsx`,
`client/src/pages/b2b/CompanyDetail.jsx`, `server/routes/b2bRoutes.js`.

**Verified:** `vite build` OK (164 modules); `node --check` + import OK on `b2bRoutes.js`.
`owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` / `server/package.json` — untouched. No DB/model
changes.

**Assumption:** B2B order actions use the existing `retail-orders` ("Orders") permission because the
application has no separate B2B-orders menu/permission key; this matches the report that removing the
single Order permission must hide Book/Order on both listings.

---

## v36 — Credit note on employee cancel, invoice role permissions, multi-service package booking

### 1. Credit note is generated when a Company Employee cancels an invoice
**Root cause.** The cancel endpoint (`POST /api/invoices/:orderId/cancel`, v33) was guarded by
`allow(SUPER_ADMIN)` only. So when a company employee tried to cancel an invoice they raised, the
request was rejected 403 and the `cancelInvoice` controller — which creates the credit note — never
ran. The credit-note code was fine; the authorization blocked employees from reaching it.
**Fix.**
- Route now `allow(SUPER_ADMIN, EMPLOYEE)` — Super Admin and Employees can cancel; Company Owner is
  intentionally excluded (req #2). Enforced server-side, so a direct request from a CO is rejected.
- `cancelInvoice` hardened: idempotent (a repeat cancel returns the existing credit note instead of a
  new one — no duplicates), the credit note is persisted **before** the invoice is flagged cancelled
  (so a failure can't leave a cancelled invoice without a credit note), failures return a 500 and do
  **not** mark the invoice cancelled, and a duplicate-key race is caught and reconciled.
- Added a **unique index on `CreditNote.orderId`** as the final duplicate guard.
- The credit note carries invoice no/date, amount (invoice net), order ref, reason and creator — all
  via the existing relationships. Works regardless of which role created the original invoice.

### 2. Invoice edit/cancel/delete permissions by role
- **Company Owner:** view ✓, edit (regenerate) ✓, cancel ✗, delete ✗.
- **Super Admin:** view ✓, edit ✓, cancel ✓, delete ✓ (subject to the existing rule that an
  invoiced/cancelled order can't be deleted — v33).
- **Employee:** unchanged except they can now cancel (required by #1).
- Frontend: the "Cancel invoice & raise credit note" button on the invoice screen shows for Super
  Admin and Employees, hidden for Company Owners; the Edit/Regenerate action stays available to CO.
- Backend: the route guard above is the enforcement; order delete already excludes CO (matrix DELETE,
  v34) and blocks invoiced/cancelled orders (v33). No bypass via direct API/URL.

### 3. Multi-service package booking (one order, many services)
`Order.services[]` already holds multiple heterogeneous service lines and `Order.isPackage` existed
but was unused; invoicing assumed a single service type. Added, on the retail booking path:
- **Booking:** `retail/BookingFlow.jsx` gains a *Single service* / *Package* mode toggle. In package
  mode the user adds ≥2 services (each with its own booking-detail form + passengers) and saves **one**
  order with `isPackage: true` and all services in `services[]`. Single-service booking is unchanged.
- **Validation (backend):** `retailController` validates a package has ≥2 lines and every line
  references a real, active Service; prices/totals are never taken from the client.
- **Invoicing:** `invoiceController.generateInvoiceNo` branches for packages — the operator enters one
  amount per included service, gross = their sum (recomputed server-side), then the usual footer
  (Discount/TDS/TCS/Govt Tax/Service Charge) applies; a package gets its own `PKG-######` number.
  The breakdown is stored in `Order.invoicePackageLines` and rendered on the PDF (reusing the invoice
  template). `getForInvoice` exposes `isPackage` + the included services for the screen.
- **UI:** `InvoiceGenerate.jsx` shows a "Package services" amount grid for package orders;
  `OrderDetail.jsx` shows a "Package · N services" badge and already lists every service's details.

**Database (additive, no migration):** `Order.invoicePackageLines` (new optional field);
`CreditNote.orderId` unique index. No data touched.

**New/changed routes:** `POST /api/invoices/:orderId/cancel` now `allow(SUPER_ADMIN, EMPLOYEE)`.

**Verified:** `vite build` OK (164 modules); `node --check` + import OK on all changed server files
(duplicate-index warning resolved). `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` /
`server/package.json` untouched.

**Assumptions / limitations:** Package booking is implemented on the **retail** flow (the primary
booking path); B2B and FIT remain single-service and can be extended with the same pattern. Package
pricing follows the app's existing "manual at invoice generation" model (one amount per service),
since no pre-defined package price list exists for internal ERP services (the CMS `TourPackage` is a
separate website concept and was left untouched). Live DB transactions require a replica set, which
isn't available in this sandbox; the cancel flow instead uses persist-credit-note-first ordering plus
the unique index and idempotency checks to guarantee a consistent state.

---

## v37 — Invoice Cancel/Delete = Superadmin only; Credit Note verification, listing & download

### 1. Invoice actions by role (Edit/Hold for CO + Employee; Cancel/Delete Superadmin-only)
This refines v36. The rule is now: **Company Owner and Company Employee may Edit and Hold invoices/
orders, but may NOT Cancel or Delete; only Superadmin can Cancel and Delete.**
- `routes/invoiceRoutes.js`: `POST /:orderId/cancel` reverted to `allow(SUPER_ADMIN)` (v36 had also
  allowed EMPLOYEE — removed). A direct API/URL cancel by a CO or Employee is rejected 403.
- `InvoiceGenerate.jsx`: the "Cancel invoice & raise credit note" button shows only for Superadmin;
  the Edit/Regenerate action stays available to CO and Employee.
- **Hold** (order hold, v33) and **Edit** remain gated by `can('retail-orders','EDIT')`, which both CO
  and (permitted) Employees have — unchanged. **Delete** of an invoiced order is already blocked for
  everyone (v33) and for CO by the matrix (v34); Superadmin delete remains subject to that rule.
- Credit note still generates correctly when a **Superadmin** cancels an invoice that was created by
  an employee (the generator never depended on the creator's role — only the cancel authorization did).

### 2. Credit Note generation — verified, listed, linked and downloadable
**Investigation result: credit notes are BOTH generated AND were accessible; this release makes them
easier to find and adds a downloadable document.**
- **Generated:** `invoiceController.cancelInvoice` (v33) creates a `CreditNote` (CN-######) inside the
  cancel flow — credit-note-first, idempotent, unique index on `orderId` (no duplicates), amount =
  invoice net, linked to the order and stamped on the order as `creditNoteId` / `creditNoteNo`.
  This was confirmed by tracing the workflow; generation was **not** failing.
- **Navigation path:** **Administration → Credit Notes** (`/app/invoices/credit-notes`), the listing
  page added in v33. This release enriches it to show Credit Note no, original Invoice no,
  **Customer/Company**, Order no, Amount, **Status (Issued)** and Date.
- **Download:** new `GET /api/invoices/credit-notes/:id/pdf` renders the credit note document
  (reuses the invoice PDF template with a "CREDIT NOTE" title, numbered with the CN number and a note
  referencing the original invoice). A **Download** button is on each listing row.
- **Invoice → Credit Note link:** on a cancelled invoice the screen now shows a "Download credit note"
  button next to the cancelled banner (which already names the CN number).
- No duplicates / no regeneration of valid records: the idempotency check + unique index are kept; no
  backfilling is performed.

### Files changed
- server: `routes/invoiceRoutes.js` (cancel guard; CN pdf route), `controllers/invoiceController.js`
  (enriched `listCreditNotes`; new `downloadCreditNote`), `utils/invoicePdf.js` (`docTitle` option).
- client: `pages/invoice/InvoiceGenerate.jsx` (cancel SA-only; download-credit-note link),
  `pages/invoice/CreditNotes.jsx` (party/status columns + download).

**Database:** no schema/migration changes; no data touched. **API:** additive only (one new GET
route; `listCreditNotes` rows gain a convenience `party` field — existing fields unchanged).

**Verified:** `vite build` OK (164 modules); `node --check` + import OK; routes include
`GET /credit-notes/:id/pdf` and `POST /:orderId/cancel` (SA-only). `owner/OwnerLayout.jsx` /
`owner/MasterForm.jsx` / `server/package.json` untouched.

### What existed / fixed / new
- **Existed:** credit-note generation on Superadmin cancel; the Credit Notes listing + menu (v33).
- **Fixed:** cancel permission tightened to Superadmin-only (CO & Employee can no longer cancel,
  front- and back-end).
- **New:** credit note customer/company + status in the listing, a downloadable Credit Note PDF, and
  a download link from the cancelled invoice to its credit note.

### Limitations / assumptions
- `CreditNote` has no explicit status column, so Status shows "Issued" (a credit note existing means
  it was issued); amounts/relationships use the existing schema. DB transactions need a replica set
  (not available here), so consistency relies on persist-CN-first + unique index + idempotency.

---

## v38 — Activity logs, package flight removal, customer-email uniqueness, order-action permissions, 4-section dashboard

### 1. Activity logs (new)
- New `models/ActivityLog.js` + `utils/activityLog.js` (`logActivity`, `diffFields`). Logging is
  fire-and-forget and fully guarded in try/catch, so a logging failure never breaks the main
  operation; it is called only AFTER an operation succeeds (one row per real event, no duplicates).
  Sensitive keys (password/token/secret/…) are stripped before writing.
- Instrumented backend operations: Order create/update/delete/cancel/hold/release, Customer
  create/update(with field-level old→new diff)/delete, Invoice generate, Invoice cancel.
- `GET /api/activity-logs` (controller + route, org-scoped, newest first, module/action filters).
  Viewer at **Master → Administration → Activity Logs** (`/app/activity-logs`) showing when, who,
  role, action, module, record and details (with the change diff for updates).

### 2. Flight removed from Package Booking
- `retail/BookingFlow.jsx`: the package service picker now excludes Flight (`packageBookable`).
- `retailController.validatePackage`: rejects a package line whose service is Flight (backend guard).
- Standalone / single-service flight booking is unchanged.

### 3. Duplicate customer email prevented
- `retailController.createCustomer`: email is normalised (trim + lowercase) and checked
  case-insensitively, **scoped to the organisation** (matching the app's per-tenant customer model).
  A duplicate returns 400 "A customer with this email already exists." The existing customer forms
  already surface server errors (CustomerForm, NewCustomerModal). No existing data touched; no unique
  DB index added because existing data may legitimately contain historical duplicates.

### 4. Employee Order permissions (Delete showing despite no permission)
**Root cause:** the retail Order listing rendered View/Edit/Hold/Cancel/Delete unconditionally — it
never consulted the permission matrix (the backend routes were already guarded in v33). Fix:
`retail/OrderList.jsx` now gates every action via `can('retail-orders', …)` — New order=CREATE,
View=READ/SELECT, Edit/Hold/Release/Cancel=EDIT, Delete=DELETE. An employee with only
Select/Create/Read no longer sees Edit or Delete, and the backend already rejects unauthorised
direct requests.

### 5. Four-section dashboard navigation
- Landing page (`EmployeeDashboard.jsx`) now shows four cards — **Website, Booking, Account,
  Master** — and only the sections the user is authorised for.
- `menuConfig.js`: every group tagged with an `area`; added `AREAS`, `availableAreas(user)` and
  `areaForPath()`. Mapping: Website = CMS menus; Booking = Retail / B2B / Society orders & bookings;
  Account = Supplier Invoices, Credit Notes, Company Profile + personal (My Profile, Change Password);
  Master = Service Master, Team/Employees, Main Companies, Company Owners, Activity Logs, Society
  Masters, HR.
- `Sidebar.jsx`: a four-button section switcher shows only accessible areas and renders only the
  active area's groups (Home always shown); the active section follows the current page. Permissions
  are respected (unchanged `visibleMenu`), and backend authorization still blocks direct URLs.

### Files
- server (new): `models/ActivityLog.js`, `utils/activityLog.js`, `controllers/activityLogController.js`,
  `routes/activityLogRoutes.js`. server (changed): `server.js` (mount), `controllers/retailController.js`
  (email check, flight-in-package guard, activity logs), `controllers/invoiceController.js` (activity logs).
- client (new): `pages/admin/ActivityLogs.jsx`. client (changed): `menuConfig.js`,
  `components/layout/Sidebar.jsx`, `pages/EmployeeDashboard.jsx`, `pages/retail/OrderList.jsx`,
  `pages/retail/BookingFlow.jsx`, `App.jsx`.

### Database / API
- New `activitylogs` collection (created on first log). No migration; no existing data changed.
  API additions are additive (one new GET route).

### Verified
- `vite build` OK (165 modules); `node --check` + import OK on all changed/new server files; the
  `/api/activity-logs` route is mounted. `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` /
  `server/package.json` untouched.

### Root causes / assumptions / limitations
- #4 root cause: UI didn't check the matrix (backend already did). Fixed on the retail Order listing
  (the reported screen); the same `can()` pattern already covers other listings from v34/v35.
- #5: the four-section landing is implemented for the **/app** staff shell (Superadmin + Employee).
  Company Owners run in the separate, protected `/owner` shell (OwnerLayout is off-limits in this
  engagement), so their navigation is unchanged; the same area mapping can be applied there if that
  file is unlocked. Per-type invoice *creation* stays inline on the order screens (Booking) per the
  existing workflow; Account holds the invoice/accounting management screens.
- #1: activity logging covers the retail order/customer and invoice flows (the "important
  activities" named in the spec); the reusable `logActivity` helper can be dropped into B2B/FIT/CMS
  controllers identically. No DB transaction is used for the log itself by design (it must never
  affect or roll back the main operation).
- #3: uniqueness is enforced at the application layer scoped to the org; a DB unique index was
  deliberately not added so pre-existing duplicates are preserved (per "do not delete/merge data").

---

## v39 — Website masters, public APIs & website-customer accounts

Built on v38. Every new table uses MongoDB's `_id` as its unique primary key; email fields that must
be unique also carry a unique index. Seeders are non-destructive (sample rows only when empty).

### New database tables (models + seed)
- `banners` (Banner) — title, bannerImage, created_date, timestamps.
- `videogalleries` (VideoGallery) — title, description, video_url_link, timestamps.
- `ourteem_website` (OurTeam) — name, designation, photo, department, flag (dropdown: first | second).
- `travelinspirations` (TravelInspiration) — email (**unique**).
- `customizetrips` (CustomizeTrip) — like_to_tavel, PreferredDestination, number_of_days,
  Travellerscount, Preferred_Travel_Date, Trip_Type, Hotel_Preference, budget_of_planing, Budget_Type,
  name, phone, email, Special_Requirements, package_id — all default null; create_at / update_at.
- `wishlists` (Wishlist) — websitecustomer_id, package_id (unique pair).
- `websitecustomers` (WebsiteCustomer) — name, mobile, email (**unique**), passwordHash, reset fields.

### Super Admin — Website menu (new submenus, full CRUD, permission-gated)
- **Banner Master** (`/app/cms/banners`), **Video Gallery** (`/app/cms/videos`), **Our Team**
  (`/app/cms/team`) — list / create / edit / delete, gated by the permission matrix
  (`cms-banners`, `cms-videos`, `cms-team`).
- **Travel Inspiration** (`/app/cms/travel-inspiration`) — listing with email search + **Export to
  Excel** (CSV).
- **Customize Trip** (`/app/cms/customize-trip`) — listing with package + date filters, an eye-icon
  **detail** view, and **Export to Excel** (CSV).
- Admin routes: `GET/POST/PUT/DELETE /api/cms/{banners,videos,team}`, `GET /api/cms/travel-inspirations`,
  `GET /api/cms/customize-trips`, `GET /api/cms/customize-trips/:id`.

### Public APIs (Node.js only — no React storefront)
- `POST /api/public/travel-inspiration` — stores an email; a repeat email is not duplicated (unique).
- `POST /api/public/customize-trip` — stores a customise-trip request (all fields optional/null).
- `GET  /api/public/our-team` — lists team members (with absolute photo_url).
- `POST /api/public/wishlist` — body `{ websitecustomer_id, package_id }`; no duplicate pair.
- `GET  /api/public/destination_categories` — **updated only** to also return `image_url` (absolute);
  all other existing public APIs are unchanged.

### Website-customer accounts (Node.js only) — mounted at `/api/public/customer`
- `POST /register` (name, mobile, email, password, conform_passwrd) → creates the account and sends a
  welcome email; if SMTP isn't configured the signup still succeeds (mail errors are swallowed).
- `POST /login` (email + password) → returns a website-customer JWT.
- `POST /forgot-password` → if the email exists, stores a 1-hour reset token and emails it (generic
  response either way).
- `POST /reset-password` (token, password, conform_passwrd).
- `GET  /profile` (auth), `POST /change-password` (auth).
- `GET  /wishlist` (auth) → the logged-in customer's wishlist with package details.
- Auth is a separate JWT (`kind: websitecustomer`) verified by `middleware/websiteAuth.js`; it never
  mixes with the ERP `User`/`Customer` auth.

### Files
- server (new): models `Banner, VideoGallery, OurTeam, TravelInspiration, CustomizeTrip, Wishlist,
  WebsiteCustomer`; `middleware/websiteAuth.js`; controllers `websiteCustomerController.js`,
  `websiteMasterController.js`; routes `websiteCustomerRoutes.js`.
- server (changed): `controllers/publicController.js` (store endpoints + image_url), `routes/publicRoutes.js`,
  `routes/cmsRoutes.js`, `server.js` (mounts), `utils/seed.js` (non-destructive seed).
- client (new): `pages/cms/{BannerMaster,VideoGalleryMaster,OurTeamMaster,TravelInspirationList,
  CustomizeTripList}.jsx`, `utils/exportCsv.js`.
- client (changed): `App.jsx` (routes), `menuConfig.js` (Website submenus).

### Verified
- `vite build` OK (171 modules); `node --check` + ESM import OK on all new/changed server files;
  route introspection confirms the new public, website-customer and CMS endpoints.
- `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` / `server/package.json` untouched. No existing
  user-facing code or other APIs changed.

### Notes / assumptions
- The website storefront itself is **not** built in React (per the request) — only the Node public
  APIs for it. The Super Admin master screens are React (they belong to the existing /app admin).
- Seed adds a sample website customer: `webuser@example.com / webuser123`.
- Run `npm run seed` once to create the new collections with sample rows (safe to re-run; existing
  data is never cleared).

---

## v40 — Complete activity logging, header section selector, Company-Owner Master menus

### 1. Activity logs now cover all modules (root cause fixed)
**Root cause:** v38 added the `logActivity` helper but only wired it into the retail order/customer
and invoice controllers, so Create/Edit/Delete in every other module were never logged. Fix: the
`logActivity` call (log-after-success, guarded, no secrets, keeps a snapshot label/id so the entry
survives record deletion) is now invoked from every relevant controller:
- **Retail:** order create/update/delete/cancel/hold/release, customer create/update(diff)/delete, payment.
- **B2B:** company create/update/delete, order create, lump-sum payment.
- **Society (FIT):** cluster/division/grade/department (shared CRUD factory), passenger (DR),
  society member, society order create/delete.
- **Invoices:** generate, cancel (+ credit note).
- **Supplier invoices:** create/update/delete.
- **Service master:** create/update/delete.
- **Employees & permissions:** employee create/update/delete; Company Owner create/update/delete.
- **HR:** holiday create/update/delete; leave apply / approve / reject / cancel; salary slip upload/delete.
- **Main companies:** create/update/delete.
- **CMS / masters:** destination category, destination, tour package, FAQ, testimonial create/update/delete.
- **Website masters (v39):** banner, video, our-team already logged.
Failed operations never log (the call is after the successful write), and each business event logs
once. The Activity Logs screen (Master → Administration → Activity Logs) now filters by all these
modules and the APPROVE/REJECT/PAYMENT/HOLD/CANCEL actions.

### 2/3. Header section selector (replaces the four sidebar buttons)
- The four prominent in-sidebar section buttons (v38) are **removed**. A compact section selector now
  lives in the top header: a segmented control on desktop, a dropdown on mobile, with a clear active
  state and keyboard focus ring. Active section is shared via a small `AreaContext`, stays in sync
  with the current page, and switching it filters the sidebar to that section's menus without a full
  reload. The landing page's four cards still work and now drive the same shared state.
- Files: new `context/AreaContext.jsx`; `components/layout/{AppLayout,Topbar,Sidebar}.jsx`,
  `pages/EmployeeDashboard.jsx`.

### 2D/4. Company Owner sees Master menus
- **Root cause:** the Company-Owner allow-list in `menuConfig` didn't include any Master-area data
  menu, so the Master section was sparse for that role. Fix: `admin-services` (Service Master) is
  added to the Company-Owner visibility list, so Master now shows Team/Employees + Service Master for
  a Company Owner. Visibility is separated from action authorization — the backend still enforces who
  may create/edit/delete (a visible menu grants no new CRUD). The 360-level org-admin menus (Company
  Owners, Main Companies, Supplier Invoices, Credit Notes, Activity Logs) and the Society/FIT module
  remain excluded for Company Owners by the existing business rules.

### Files changed
- server: `controllers/{service,organization,supplierInvoice,auth,hr,b2b,cms,fit,retail}Controller.js`
  (activity logging).
- client: `context/AreaContext.jsx` (new); `components/layout/AppLayout.jsx`, `Topbar.jsx`, `Sidebar.jsx`;
  `pages/EmployeeDashboard.jsx`; `pages/admin/ActivityLogs.jsx` (filters); `menuConfig.js` (CO visibility).

### Database / API
- No schema/migration changes. `activitylogs` (v38) is reused. API response structures unchanged.

### Verified
- `vite build` OK; `node --check` + ESM import OK on every changed controller. `owner/OwnerLayout.jsx`
  / `owner/MasterForm.jsx` / `server/package.json` untouched.

### Notes / limitations
- The four-section nav applies to the `/app` staff shell (Superadmin + Employee). Company Owners run
  in the separate, protected `/owner` shell (OwnerLayout is off-limits in this engagement); the same
  header-selector pattern can be applied there if that file is unlocked.
- View/Read audit logging is intentionally not emitted for ordinary list/detail GETs (would be noisy);
  the helper supports a READ action if specific screens need it later.
- A couple of low-traffic endpoints (e.g. the separate passenger-master controller, website-booking
  admin edits) are not yet instrumented; the same one-line `logActivity` call extends to them identically.

---

## v41 — Activity-log breadth, invoice fix, Account dropdowns, banner/team images, public banner API

### 1. Login / logout in the activity log
- `authController.login` now records a `LOGIN` entry (no password/token stored); a new
  `POST /api/auth/logout` records `LOGOUT` and the client calls it on sign-out (best effort). The
  Activity Logs screen gained an `Auth` module filter and LOGIN/LOGOUT styling. (v40 already covers
  create/edit/delete/hold/cancel/approve/reject/payment across all modules.)

### 2. Super Admin can reach all Company-Owner master modules
- **Root cause:** the `/owner` master-engine area already allows `SUPER_ADMIN` (route + backend), but
  Super Admin's menu never linked to it. Fix: a single **Company Master Data** item under Master →
  Administration opens the full Company master catalog (all ~80 engine masters, grouped). No menu
  hardcoding, no duplicate routes; action authorization is unchanged (visibility ≠ CRUD).

### 3. Customer invoice now saves correctly; PDF shows the real amount (was 0)
- **Root cause:** `ensureInvoiceNo()` returned **before saving** whenever the order already had an
  invoice number (a regenerate, or after a preview/download pre-assigned the number). The freshly
  computed charge heads and totals were therefore never persisted, so the stored amount — and the
  PDF — stayed 0, even though an activity-log row appeared. Fix: `ensureInvoiceNo` now only
  *generates* the number when missing and **always persists** the order, so charges/subtotal/tax/
  net are saved and the PDF reads the persisted amount. Logging still runs only after the successful
  save; regenerating reuses the same number (no duplicate invoice).

### 4. PNR on the Airline (Flight) service
- The Flight form shows a PNR / Purchase-Order field (in addition to the existing Airline/CRS PNRs),
  saved and redisplayed with the rest of the booking detail.

### 5/6/7. Airline, Bus & Hotel dropdowns from the Account tab
- **Root cause / source:** the "Account tab" is the `account` master (`tblAccountMaster`,
  `strAccountName`). Fix: `account` is whitelisted in the staff dropdown-options API (active records
  only), and the Flight **Airline**, Bus **Bus** and Hotel **Hotel Name** fields are now dynamic
  dropdowns sourced from it (reusing the existing `mname` dropdown component + search). The selected
  value is saved on the booking and redisplayed on edit/view; no duplicate master table, no hardcoded
  options. The backend validates against the whitelisted master.

### 8. Banner Master listing
- **Root cause:** the listing rendered the stored relative path (`/uploads/...`) directly, which the
  admin origin can't resolve. Fix: the thumbnail now uses the backend-absolute URL (same helper as
  the edit form), with a graceful fallback for missing images. The **Created** and **Updated**
  columns were removed from the listing (the `created_at`/`updated_at` DB fields are untouched).

### 9. Public Banner API
- `GET /api/public/banners` (no auth) returns `{ id, title, image_url }` with absolute image URLs,
  newest first; no internal/admin fields exposed. Example:
  `[ { "id": "...", "title": "Summer Escapes", "image_url": "https://host/uploads/cms/x.jpg" } ]`

### 10. Our Team Master listing images
- Same relative-path root cause as the banner listing; the listing thumbnail now uses the
  backend-absolute URL with a graceful fallback. The edit form is unchanged.

### Files changed
- server: `controllers/invoiceController.js` (ensureInvoiceNo), `controllers/authController.js`
  (login/logout) + `routes/authRoutes.js`, `controllers/masterOptionsController.js` (account),
  `controllers/publicController.js` + `routes/publicRoutes.js` (public banners).
- client: `context/AuthContext.jsx` (logout call), `pages/admin/ActivityLogs.jsx` (Auth filter),
  `pages/shared/serviceForms.js` (Airline/Bus/Hotel dropdowns + Flight PNR),
  `pages/cms/BannerMaster.jsx`, `pages/cms/OurTeamMaster.jsx` (listing images; banner columns),
  `menuConfig.js` (Company Master Data link).

### Database / API
- No schema or migration changes. New public route `GET /api/public/banners`; new
  `POST /api/auth/logout`. Existing response structures preserved.

### Verified
- `vite build` OK; `node --check` + ESM import OK; route introspection confirms the new public/auth
  routes. `owner/OwnerLayout.jsx` / `owner/MasterForm.jsx` / `server/package.json` untouched.

### Notes / assumptions
- Airline/Bus/Hotel all draw from the single `account` master (the Account tab); if you keep separate
  account groups per type we can filter the dropdown by group — tell me the group identifiers (not
  hardcoded here). The Hotel field was switched from the `property` master to `account` per req #7.
- `account` master records are created in the Company-Owner Account master; the seeder's sample row
  makes at least one option available immediately.

---

## v42 — Service dropdown classification, master-engine activity logs, Super Admin master menu, public Video API

Six requirements. Root cause found first; existing tables/models/routes reused; no hardcoded ids;
protected **OwnerLayout.jsx** / **MasterForm.jsx** and **server/package.json** untouched.

### #1/#2/#3 — Airline / Bus / Hotel dropdowns classified from `tblAccountMaster`
Refines v41 (which drew all three from the whole `account` master). Each service dropdown now
filters the Account records by the **existing account classification** — the linked Account *group*
(`intGroupID` → `tblGroupMaster`, matched on `strGroupName` / `strNatureOfGroup`) — plus
account-level signals already on the record:
- **Airline** — group named like *Airline/Air/Aviation/Carrier*, **or** a non-empty IATA
  `strAccountAirCode`, **or** `bitAccountLCCCarrier = true`.
- **Bus** — group named like *Bus/Coach/Roadways/Travels*.
- **Hotel** — group named like *Hotel/Resort/Property/Accommodation*, **or** the account is
  referenced by the existing Hotel head master (`tblHotelHead.intAccountID`).

No ids are hardcoded; group ids are resolved live. **Graceful fallback:** if nothing is classified
yet (fresh DB with no account groups), the dropdown returns all *active* accounts so it stays usable
instead of empty. Create/edit/view are unchanged — the selected name (`mname`) is still stored and
printed on the invoice. Active-status filter (`bitAccountActiveStatus ≠ false`) is preserved.
- `server/controllers/masterOptionsController.js` — `?class=airline|bus|hotel` on the existing
  `GET /api/services/master-options/account`; group-id resolver; fallback.
- `client/src/pages/shared/serviceForms.js` — FLIGHT `account:airline`, BUS `account:bus`,
  HOTEL `account:hotel`.
- `client/src/pages/shared/ServiceBookingForm.jsx` — `MRefSelect` splits `key:class` → `?class=`.

### #4 — Activity logging on the master engine (the remaining gap)
Login/logout (v41) and all booking/invoice/credit-note/payment/CMS events (v40) were already logged.
The one broad gap was **master-data changes** — the 80 master modules (incl. the Account records that
back Airline/Bus/Hotel). Added logging in `server/masterEngine/masterController.js`:
- `create` → `CREATE`, `update` → `UPDATE` (with a field-level before/after `diffFields` diff),
  `remove` → `DELETE`, `bulkRemove` → one `DELETE` with a count.
- Logged **only after** the DB operation succeeds (no phantom/duplicate entries); secrets are
  stripped by the existing sanitiser; `module: 'Master'`, the specific master in the message +
  `meta.master`/`meta.key`.
- `client/src/pages/admin/ActivityLogs.jsx` — added `Master` to the module filter.

### #5 — Super Admin Master menu opens INSIDE the Super Admin panel (fixes the v41 redirect)
v41 surfaced a single **“Company Master Data”** link that pointed at `/owner`, dropping the Super
Admin into the Company Owner shell. Replaced with the real grouped master menu rendered in the
Super Admin’s own `/app` panel, navigating only within `/app` — never redirecting to the CO area.
- The master pages are mounted under **`/app/master-data/*`** (Super-Admin-only) using the SAME
  components and the SAME `/api/owner/masters` API as `/owner`.
- The protected `OwnerLayout.jsx` / `MasterForm.jsx` are left byte-for-byte: `MasterList`,
  `AccountForm`, `ContactForm`, `HotelForm` were made **base-aware** via a new `useMasterBase()`
  hook (derives `/owner` vs `/app/master-data` from the URL), and a base-aware **`MasterFormApp.jsx`**
  sibling serves the generic create/edit under `/app` (the protected `MasterForm` still serves
  `/owner`). `/owner` behaviour is unchanged.
- `client/src/components/layout/Sidebar.jsx` — for Super Admin in the Master area, fetches the
  catalog and renders the full grouped master menu (`Master · <category>`) linking to
  `/app/master-data/:key`.
- `client/src/pages/owner/MasterHub.jsx` — a “Master Data” hub landing listing every master by
  category. `menuConfig.js` entry re-pointed from `/owner` to `/app/master-data`.
- Authorization unchanged: `/app/master-data/*` is wrapped in `SAOnly`; the backend master API
  already allows `SUPER_ADMIN`.

### #6 — Public Video Gallery listing API
`GET /api/public/video-gallery` — public, read-only, no auth. Reuses the existing `VideoGallery`
model/data (no new table). Newest first; relative links made absolute via the shared helper.
The schema carries no active/publish flag, so every gallery row is public (consistent with the
other public listers). Response matches the project’s existing public convention (a bare array),
as in `/api/public/banners` and `/api/public/our-team`:
```json
[{ "id": "…", "title": "Intro", "description": "…", "video_url": "https://…/video.mp4" }]
```
- `server/controllers/publicController.js` — `listVideosPublic`.
- `server/routes/publicRoutes.js` — `GET /video-gallery`.

### Verification
- `node --check` + ESM import OK on all changed server files; route introspection confirms PUBLIC
  includes `/video-gallery` and the master controller exports create/update/remove/bulkRemove.
- `vite build` OK (175 modules).
- Protected `OwnerLayout.jsx` / `MasterForm.jsx` and `server/package.json` — unchanged.

---

## v43 — Fix: Airline / Bus / Hotel dropdowns showed no records from `me_account`

**Root cause.** The dropdowns fetch from the correct source (`modelForMaster('account')` → the
`me_account` collection — the same model the Account listing uses), so the source was never the
problem. The bug was an over-eager filter introduced when the account dropdown was first added:

```js
// server/controllers/masterOptionsController.js  (before)
const filter = key === 'account' ? { bitAccountActiveStatus: { $ne: false } } : {};
```

`bitAccountActiveStatus` is a boolean saved by the Account form's **Active** toggle, which defaults
**off**. Accounts created without explicitly turning it on are stored with `bitAccountActiveStatus:
false`, so `{ $ne: false }` silently excluded them. The result: `me_account` held the records and the
**Account listing showed them** (its query applies no status filter), but **every service dropdown
came back empty** — the exact listing-vs-dropdown inconsistency.

**Fix.** Make the dropdown consistent with the Account listing: drop the status exclusion and read
the same records. Account classification (Airline / Bus / Hotel by the linked account **group**, plus
airline air-code / Hotel-head signals) is kept as a refinement, and when the accounts aren't
classified yet the dropdown falls back to **all** accounts instead of hiding them. Added try/catch so
a query failure returns a 500 (surfacing the error) rather than a silent empty list.

- `server/controllers/masterOptionsController.js` — `baseFilter = {}` (was the `bitAccountActiveStatus`
  exclusion); classification + fallback now run against the unfiltered set; error handling added.
- No client change (v42 already sends `?class=airline|bus|hotel`); no new tables, no hardcoded ids,
  no duplicate records; create/edit/view and the stored value (account name) are unchanged.

**Verification (logic test, old vs new, representative `me_account` rows saved with Active off):**
- OLD `{ bitAccountActiveStatus: { $ne: false } }` → **0** rows (empty dropdown — bug reproduced).
- NEW `{}` → **all** rows returned (matches the Account listing).
- Classified Airline when a group is named "Airlines" → returns only that account.
- Classified Airline when no group/signal matches → falls back to all accounts (nothing hidden).
- `node --check` + ESM import OK. Protected `OwnerLayout.jsx` / `MasterForm.jsx` and
  `server/package.json` unchanged.

If you want the dropdowns to show *active-only* accounts, that filter should be applied to the Account
listing too (so the two stay consistent) and the Active flag set deliberately on each account — tell
me and I'll wire it on both. If accounts are classified by a field other than the account group, send
the field/values and I'll match it precisely.

---

## v44 — Searchable account dropdowns, service-aware PNR From, auth activity logs, Forgot-Password email fix

Six requirements. Root cause found first; existing `me_account` data reused; no hardcoded ids/names;
protected `OwnerLayout.jsx` / `MasterForm.jsx` and `server/package.json` untouched.

### #1/#2/#3 — Airline / Bus / Hotel: searchable autocomplete over ALL accounts (server-side)
Per the common rule ("all account records should be available for selection/search, not only a
subset; do not apply restrictive category filters"), the v42/v43 Airline/Bus/Hotel classification is
**removed** for these dropdowns. Each is now a **searchable autocomplete** that searches the entire
`me_account` collection server-side:
- `server/controllers/masterOptionsController.js` — `GET /api/services/master-options/account`
  accepts `?search=<partial name>&limit=<n>` (case-insensitive regex on `strAccountName`, capped at
  25/response). Search scans the whole table, so any account is findable without loading them all;
  non-searchable masters (CRS, Quota, Meal Plan, Bus Type, Vehicle) are unchanged. Wrapped in
  try/catch → 500 on failure instead of a silent empty list.
- `client/src/pages/shared/ServiceBookingForm.jsx` — new `MSearchSelect` autocomplete (debounced
  typeahead, suggestion list, outside-click close). Stores the account **name** (so it still prints
  on the invoice and existing bookings stay compatible) and shows the saved value when editing.
- `client/src/pages/shared/serviceForms.js` — Airline / Bus / Hotel fields use the new `msearch`
  type → master `account`. Tenant/permission gating (`readStaff`) is unchanged.

### #4 — Airline "PNR From" scoped to the selected service (Railway pattern)
Railway's service-specific behavior is a master-sourced dropdown scoped to the service. Applied the
same to the Airline **PNR From** (sourced from the CRS master):
- `masterOptionsController.js` — `GET …/cRS?service=<SERVICE>` returns CRS entries whose
  `strCRSName` / `tintCRSType` match the service, falling back to all CRS when nothing is tagged
  (never empty), reusing the existing CRS master (no hardcoded options).
- `ServiceBookingForm.jsx` — `MRefSelect` forwards the current service for CRS-sourced fields and
  **re-fetches when the service changes**, so options stay in sync. Railway's own dropdowns are
  untouched. (Interpretation note: "PNR From" exists only on the Airline form and the CRS master
  carries `tintCRSType`; if you want a precise CRS-type→service mapping, send the type codes and
  I'll match them exactly. The selected value is constrained to CRS options client-side and stored
  like other booking details.)

### #5 — Activity log: authentication / password events
Added the events the log was missing, each written only after the operation succeeds, never storing
tokens or passwords (the logger also sanitises):
- `FORGOT_PASSWORD` (module `WebsiteAuth`) with a success/failure flag + reason — so a failed
  delivery is auditable, not silently "sent".
- `PASSWORD_RESET` on website-customer token reset and on admin reset of a staff user
  (`authController.resetUserPassword`).
- `REGISTER` and `LOGIN` for website customers.
- `client/src/pages/admin/ActivityLogs.jsx` — added the `WebsiteAuth` module filter and the new
  action styles.

### #6 — Forgot Password email not being sent (root cause + fix)
**Root cause.** Two problems: (1) the mailer only reads SMTP from Company-Profile Settings
(`getTransporter` returns `null` when `smtpHost`/`smtpUser` are blank) — if Settings SMTP was never
filled in, no transporter is created and no mail is sent; and (2) `forgotPassword` wrapped the send
in `try { … } catch { /* ignore */ }` and **always returned success**, so a non-send was invisible
to both the caller and the server.
**Fix** (`server/utils/mailer.js`, `server/controllers/websiteCustomerController.js`):
- `getTransporter` now falls back to environment SMTP when Settings has none —
  `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_SECURE/SMTP_FROM[/_NAME]` (also accepts the
  `MAIL_*` aliases). Nothing hardcoded; Settings still wins when present. `secure` auto-set for 465.
- `forgotPassword` checks `sendMail`'s `{ sent, error }` result, logs the real failure reason
  server-side (never the token), and records the outcome in the activity log. The API response
  stays generic ("if an account exists…") so account existence isn't revealed. Registration's
  welcome-mail failure is now logged too.
- Password reset still validates the token + expiry and stores the new password via the existing
  hashing (`setPassword`); existing login/registration/reset flows are unchanged.

**Environment still required for live delivery:** valid SMTP must exist either in Settings → Company
Profile or in the server environment (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_FROM`; optional `SMTP_SECURE`, `CLIENT_URL` for the reset link). With neither, the code now
logs "reset email NOT sent … SMTP not configured" instead of claiming success.

### Verification
- `node --check` + ESM import OK on all changed server files; `vite build` OK (175 modules).
- Protected `OwnerLayout.jsx` / `MasterForm.jsx` and `server/package.json` unchanged.

---

## v45 — Section-switch popup, master record counts, credit-note workflow audit

Five requirements. Existing components/permissions reused; protected `OwnerLayout.jsx` /
`MasterForm.jsx` and `server/package.json` untouched; no schema changes.

### #1/#2 — "Switch section" popup replaces the header section tabs (+ opens once after login)
- `client/src/components/layout/Topbar.jsx` — removed the four direct section controls
  (Website / Booking / Account / Master). The header now shows a **profile dropdown** (click the
  name) with **Switch section** and **Log out**. Clean, responsive, matches the design system.
- `client/src/components/layout/SectionSwitcher.jsx` (new) — one reusable popup listing the
  sections the signed-in user is authorised for (`availableAreas`), routing to that section's
  landing via the existing menu/area logic. Shown "no access" state when a user has no sections.
- `client/src/components/layout/AppLayout.jsx` — owns the popup open-state, passes the trigger to
  the Topbar dropdown, and **auto-opens the popup once after login** by consuming a one-shot
  `sessionStorage` flag — so it does **not** reopen on refresh or navigation.
- `client/src/context/AuthContext.jsx` — `login()` sets that one-shot flag for Super Admin /
  Employee only; Company Owner's separate `/owner` shell is unaffected.
- Same component + logic drive both the header dropdown and the post-login popup (no duplication).
  Destinations stay guarded by the existing authorization middleware.

### #3/#4 — Master record counts (Super Admin hub + Company Owner dashboard)
- `server/masterEngine/masterController.js` — new `counts` controller returning
  `{ <masterKey>: total }` for every non-hidden master, read in parallel with
  `estimatedDocumentCount` (fast, collection-level, matches the listing's unfiltered total). One
  batched call — no per-card queries.
- `server/routes/ownerRoutes.js` — `GET /api/owner/masters/counts` (registered before
  `/masters/:key` so it isn't captured by the param route; same `COMPANY_OWNER` + `SUPER_ADMIN`
  guard as the rest of the master area).
- `client/src/pages/owner/MasterHub.jsx` (Super Admin → Administration → Master Data) and
  `client/src/pages/owner/OwnerDashboard.jsx` (Company Owner) now show a count badge beside each
  master name; empty tables show `0`. Cards keep their existing layout, links and navigation.
- Scope note: the master-engine collections are company-global, so Super Admin and Company Owner
  see the same totals for these masters; counts follow the same (no-status-filter) rule as the
  listing pages. Masters that carry an organization would be scoped by their own controllers.

### #5 — Invoice cancellation → credit note (audit; already correct, no change needed)
Full trace of the existing workflow:
- **Behavior:** cancelling a generated invoice **automatically raises a linked Credit Note** (option
  1). The credit note is created FIRST; the invoice is marked cancelled only after it persists, so a
  failed accounting step never yields a "cancelled" invoice without its note (no false success —
  returns 500 and leaves the invoice un-cancelled).
- **Table/model:** `creditnotes` collection — `server/models/CreditNote.js`
  (controller `server/controllers/invoiceController.js`).
- **Link to invoice:** `CreditNote.orderId` → the Order that held the invoice, plus a snapshot of
  `invoiceNo` / `invoiceDate` / `amount`; the order stores `creditNoteId` / `creditNoteNo`.
  A **unique index on `orderId`** prevents duplicate credit notes (idempotent on repeat/raced calls).
- **Numbering:** sequential `CN-000001` per organization (`nextCreditNoteNo`).
- **Viewing:** Credit Notes listing at `/app/invoices/credit-notes`
  (`GET /api/invoices/credit-notes`, org-scoped for non-Super-Admins), with PDF at
  `/api/invoices/credit-notes/:id/pdf`.
- **Activity log:** `INVOICE_CANCEL` is recorded with the credit-note number and reason.
- **Roles:** cancellation is **Super-Admin-only** by design — route `allow(SUPER_ADMIN)` and the UI
  button is gated to `SUPER_ADMIN` (`InvoiceGenerate.jsx`). Employee and Company Owner may generate,
  edit and hold invoices but cannot cancel; this intentional difference is preserved. Credit notes
  raised from an employee-created invoice still generate correctly when the Super Admin cancels.
- **Conclusion:** the workflow generates, persists, links, numbers, logs and displays credit notes
  correctly for the authorized role; **no fix required**. (If you later want Company Owners to cancel
  their own org's invoices, that's a one-line route/permission change — tell me and I'll add it.)

### Verification
- `node --check` + ESM import OK; route introspection confirms `/masters/counts` precedes
  `/masters/:key`; `vite build` OK.
- Protected `OwnerLayout.jsx` / `MasterForm.jsx` and `server/package.json` unchanged.

---

## v46 — Standardized user dropdown (all roles) + credit note on order cancellation

Two work areas. Existing credit-note process reused (no second implementation); permissions and
numbering preserved; no schema changes. `MasterForm.jsx` and `server/package.json` untouched;
`OwnerLayout.jsx` was changed intentionally for this request (the header-dropdown standardization).

### #1 — Same user-name dropdown for Super Admin, Employee and Company Owner
Root cause of the difference: Super Admin / Employee share the `/app` header (Topbar) which carried
the dropdown, while the Company Owner `/owner` shell had its logout as a plain button in the sidebar
footer and no header dropdown.
- `client/src/components/layout/UserMenu.jsx` (new) — one reusable dropdown: avatar + name + role,
  an optional items list (e.g. "Switch section"), and a **Log out** action. Outside-click close,
  responsive (name row collapses into the menu on mobile).
- `Topbar.jsx` (Super Admin / Employee) now renders `UserMenu` with Switch section + Log out.
- `pages/owner/OwnerLayout.jsx` (Company Owner) gains a header bar with the **same** `UserMenu`
  (Log out only); the duplicate sidebar-footer logout button was removed (the name stays).
- Logout routes are preserved per role: Super Admin / Employee → `/login/employee`,
  Company Owner → `/login/companyowner`; each clears its own token/session via the existing
  `AuthContext.logout()` (which also calls the backend `/auth/logout`). Protected routes remain
  guarded, so a logged-out user can't reach them without re-authenticating.

### #2/#3/#4/#5 — Cancel Order now raises the credit note (shared service)
Root cause of the inconsistency: credit-note creation lived **inline inside** `cancelInvoice`, so the
**Cancel Order** action (`retailController.cancelOrder`) never produced one — cancelling an invoiced
order left no credit note.
- `server/services/creditNoteService.js` (new) — `ensureCreditNoteForOrder(order, { user, reason })`,
  the single shared routine both flows now use. It validates the invoice exists, reuses the existing
  `CreditNote` model + `nextCreditNoteNo` numbering + `netInvoiceAmount` figure, links the note to
  the order/invoice, and is idempotent. Returns `{ status: 'no-invoice' | 'exists' | 'created' }`.
- `controllers/invoiceController.js` — `cancelInvoice` refactored to call the shared service
  (behaviour unchanged: Super-Admin-only, raises/links the note, no false success on failure).
- `controllers/retailController.js` — `cancelOrder` now calls the shared service:
  - **Scenario A (no invoice):** the existing rule still blocks cancelling a pre-invoice order
    (those are edited/deleted); the service also returns `no-invoice` so no note is ever raised
    without an invoice.
  - **Scenario B (invoice exists):** the credit note is raised and linked, then the order is marked
    cancelled in the same save. If the note fails, the order is **not** cancelled (no partial state).
  - **Scenario C (repeat / already credited):** idempotent — the existing note is reused, never
    duplicated; a second attempt on an already-cancelled order returns "already cancelled".
- Duplicate prevention: the **unique index on `CreditNote.orderId`** is the hard guard (works on
  standalone MongoDB and under concurrent submits); the create-note-then-save-order ordering keeps
  state consistent. (Multi-document transactions require a MongoDB replica set; on a standalone
  server the unique-index idempotency is the correct mechanism and is what's used.)
- Activity Log: order cancellation logs `CANCEL` (Order); when a note is created it additionally logs
  `INVOICE_CANCEL` with the credit-note number — only after the note is persisted, no duplicates.
- `pages/retail/OrderDetail.jsx` + `OrderList.jsx` — the cancel confirmation now tells the user a
  credit note will be raised against the invoice.

### Roles (verified by code path)
- **Cancel Invoice** stays **Super-Admin-only** (route `allow(SUPER_ADMIN)` + button gated).
- **Cancel Order** keeps its existing permission (`can('retail-orders','EDIT')`), so whichever role
  is already allowed to cancel an order now also triggers the shared credit-note rule. No new
  cancellation rights were granted. Credit-note listing stays org-scoped (tenant isolation intact).

### Verification
- `node --check` + ESM import OK (service, `cancelInvoice`, `cancelOrder`); `vite build` OK.
- `MasterForm.jsx` and `server/package.json` unchanged.
- Runtime note: the end-to-end cancel → credit-note flow needs the live app/DB to exercise; the
  shared service mirrors the already-working `cancelInvoice` logic and all static checks pass.

---

## v47 — Back button on inner pages, B2B order/invoice visibility, Society order cancel

Three requirements. Existing credit-note service reused (no duplicate logic); permissions and tenant
isolation preserved; no schema changes. `OwnerLayout.jsx` is the v46 header change; `MasterForm.jsx`
and `server/package.json` remain untouched.

### #1 — Consistent Back button on every inner page
Implemented once in the shared `PageHeader` so it covers all roles/modules without editing each page.
- `client/src/components/ui/index.jsx` — `PageHeader` now renders a Back button on **inner** pages,
  detected by the last URL segment: a record id or an action word (`new` / `create` / `edit` /
  `generate`). Add/Edit/View and detail pages (orders, invoices, customers, companies, employees,
  services, packages, website items, master forms) get it; listing/section pages (last segment a
  plain word like `orders`) don't. `back={false}` suppresses it; `back="/path"` forces it with an
  explicit fallback.
- Navigation: uses in-app history (`navigate(-1)`); when the page was opened directly/deep-linked
  (React Router `location.key === 'default'`, i.e. no in-app history), it routes to the **parent**
  path instead of leaving the app. It sits in the header next to the title, doesn't touch forms or
  submit buttons, and the master-engine pages (which have their own Back) don't use `PageHeader`, so
  there's no duplication.

### #2 — B2B user now sees their company's orders + invoices
Root cause: `b2bController.myOrders` filtered orders by `requestedByMemberId: req.user._id` only, so
orders an Admin / Company Owner / employee created for the company (blank or different requesting
member) were excluded — the member saw an empty list even though invoices existed.
- `server/controllers/b2bController.js` — `myOrders` now scopes to the member's **company**
  (`companyId: req.user.companyId`), which includes admin-created company orders while keeping tenant
  isolation (never another company's orders); falls back to `requestedByMemberId` only if the member
  has no company link. Invoice data already lives on each Order, so it comes through automatically.
- `client/src/pages/portal/MemberPortal.jsx` — the "My orders" table now shows **Invoice** (number)
  and **Status** (Pending / Invoiced / Invoice cancelled / Cancelled) columns.
- No hardcoded ids; existing models/relationships reused.

### #3 — Society (FIT) order listing: Cancel action + credit note
The Society order list had only Delete. Added Cancel, reusing the **same** shared credit-note service.
- `server/controllers/fitController.js` — new `cancelOrder`: requires a generated invoice, blocks a
  repeat cancel, calls `ensureCreditNoteForOrder` (Scenario A no invoice → no note; B invoice → note
  raised + linked; C repeat → idempotent, no duplicate), marks the order cancelled only after the
  note persists, and logs `CANCEL` (Order) plus `INVOICE_CANCEL` when a note is created.
- `server/routes/fitRoutes.js` — `PUT /api/fit/orders/:id/cancel`, gated by `can('fit-orders','EDIT')`
  (backend-enforced, same permission model as retail cancel; no new rights granted).
- `client/src/pages/fit/FitOrderList.jsx` — a **Cancel** action shown only when the order has an
  invoice, isn't already cancelled, and the user has EDIT; confirmation popup; a Status column; and
  Delete now hidden once invoiced/cancelled (mirrors the retail list).

### Verification
- `node --check` + ESM import OK; route introspection confirms `PUT /orders/:id/cancel`; `vite build` OK.
- `MasterForm.jsx` and `server/package.json` unchanged.

> Separate ops note (not a code issue): the login error `secretOrPrivateKey must have a value` means
> `JWT_SECRET` isn't set in the server environment. Add `JWT_SECRET=<a long random string>` (and
> `JWT_EXPIRES_IN=7d`) to `server/.env` — see `server/.env.example` — and restart the server. The code
> already reads it correctly; it's purely a missing environment variable.

---

## v48 — Hide/Show (collapse/expand) sidebar

Frontend-only. Implemented centrally in the shared layouts — no new sidebar, no role-permission or
route changes. Only the two shells that have a sidebar are affected; the B2B/customer portals have no
sidebar and are untouched. `MasterForm.jsx` and `server/package.json` unchanged.

### What was added
- A **desktop collapse** toggle in the header (panel-collapse icon) that **hides** the sidebar and lets
  the main content take the full width; clicking again **shows** it. Accessible: `aria-label` /
  `title` switch between "Hide sidebar" and "Show sidebar", `aria-pressed` reflects state, visible
  focus ring, keyboard-operable. Smooth via the existing `transition` classes.
- The **mobile drawer** behaviour is unchanged and kept on a **separate** state, so the desktop
  collapsed state and the mobile open/close never conflict (the toggle is desktop-only `md:` ;
  the hamburger stays mobile-only).
- **Persistence:** the preference is saved to `localStorage` under `sidebarCollapsed` and restored on
  load, shared across both shells and across page navigation. Wrapped in try/catch (no crash in
  private mode); nothing sensitive stored.

### Files modified
- `client/src/components/layout/AppLayout.jsx` — owns the `collapsed` state + `localStorage`
  persistence (Super Admin / Employee), passes it to the sidebar and header.
- `client/src/components/layout/Sidebar.jsx` — accepts `collapsed`; adds `md:hidden` when collapsed
  so the sidebar hides on desktop and the `flex-1` main content auto-expands (no fixed-width math,
  no horizontal overflow).
- `client/src/components/layout/Topbar.jsx` — the desktop collapse/expand toggle button.
- `client/src/pages/owner/OwnerLayout.jsx` — the same toggle + `collapsed` behaviour for the Company
  Owner shell, sharing the same `sidebarCollapsed` key.

### Behaviour notes
- Collapse = hide/show (not an icon-only rail), because the existing menu items are text labels with
  no per-item icons; this matches the "Hide Sidebar / Show Sidebar" intent and the current design,
  and keeps active-menu highlighting, the section selector and submenus fully intact when shown.
- Roles: Super Admin, Employee and Company Owner (the shells with sidebars) all get it via the shared
  layouts; menu visibility, permissions, routes and authorization are unchanged.

### Verification
- `vite build` OK. Main content resizes via flexbox (collapsed → full width; expanded → 264px rail);
  no horizontal overflow; dropdowns/modals/tables unaffected. `MasterForm.jsx` /
  `server/package.json` unchanged.

---

## v49 — Fix: clear "Expand sidebar" affordance when collapsed

Follow-up to v48. Root cause: the collapse/expand toggle already lived in the always-visible header
and worked without a refresh, but it rendered the **same icon in both states** — only the tooltip
changed — so once collapsed there was no obvious *Expand* cue; it read as "missing".
Fix (icon only, no behaviour/layout change): the toggle icon is now **state-aware**.
- Collapsed → an unmistakable **expand/menu** icon (three lines + a right chevron), tooltip/label
  "Show sidebar".
- Expanded → a **collapse** icon (sidebar panel + a left chevron), tooltip/label "Hide sidebar".
The button stays in the header on every page/role, remains keyboard-accessible with a focus ring and
`aria-pressed`, toggles instantly via React state, and the `localStorage` persistence is unchanged.
- Files: `client/src/components/layout/Topbar.jsx` (Super Admin / Employee) and
  `client/src/pages/owner/OwnerLayout.jsx` (Company Owner). `vite build` OK.

---

## v50 — Icon-rail sidebar, upgraded public booking API, wishlist removal, profile-update API, docs

Six tasks. Existing architecture/conventions reused; MongoDB (no SQL migrations); protected
`MasterForm.jsx` and `server/package.json` unchanged.

### Task 1 — Proper collapsed (icon-rail) sidebar (replaces hide/show)
Root cause of the old behaviour: collapse simply hid the sidebar (`md:hidden`) because menu items had
no icons. v50 adds per-item icons and a real rail.
- `client/src/menuConfig.js` — `iconFor(key)` lookup (one map; MENU array untouched).
- `client/src/components/layout/Sidebar.jsx` (Super Admin / Employee) and
  `client/src/pages/owner/OwnerLayout.jsx` (Company Owner): collapsed now renders a **64px icon rail**
  — icons only, menu text hidden, **native tooltips (`title`) + `aria-label`** showing the menu name,
  active highlight preserved, navigation via `NavLink` (no refresh). Expanded restores the full width,
  labels and grouped/sub-menus. `flex-1` main content auto-adjusts (64px ↔ 264px); no overflow.
- Collapsed is **desktop-only** (`md:` classes); mobile keeps the full off-canvas drawer. State still
  persists in `localStorage` (`sidebarCollapsed`). B2B/customer portals have no sidebar.

### Task 2 — `POST /api/public/bookings` upgraded
- Customer identification (`server/controllers/websiteBookingController.js`): `websitecustomer_id`
  supplied → must exist (else 400, no silent create); otherwise find by **email** (case-insensitive)
  and reuse, else **create** a new `websitecustomers` record (name/email/mobile/address…). Duplicate
  creation is prevented by the unique email index (concurrent race resolves to the winner).
- Security: new accounts get a **secure random password** + a 7-day **account-setup token**; the
  welcome email sends a **setup link** (`/reset-password?token=…`) + login URL — never a reusable
  plaintext password (per the task's security preference; documented in the integration guide).
- Welcome email sent **only** for genuinely new customers, **after** the booking saves, best-effort
  (mail failure never rolls back); retries reuse the customer and send no duplicate email.
- Structured `passengers` (firstName/lastName/dob/gender/nationality/passportNumber; snake_case
  aliases accepted); validation for email, mobile, counts, travel date, and passenger rows.
- Booking stores the resolved `websitecustomer_id`. Response adds `customerId`, `customerCreated`,
  `customerEmailSent`. Models: `WebsiteBooking.websitecustomer_id` + structured `passengers`;
  `WebsiteCustomer` gains address/city/state/country (+ in `toPublic`).
- **`pending` field (req 2.6):** added to `WebsiteBooking`, **default `null`** (reserved
  booking-workflow flag; no behaviour attached beyond storage; existing docs read as null; Mongo =
  no migration).

### Task 3 — Public wishlist API removed
- Removed `POST /api/public/wishlist` (route + `publicController.storeWishlist`) and
  `GET /api/public/customer/wishlist` (route + `websiteCustomerController.myWishlist`), and the now
  unused `Wishlist` imports. The `wishlists` model/collection is **kept** (no data deleted). Both
  endpoints now return the standard not-found response; no public frontend in this repo referenced them.

### Task 4 — Public customer profile-update API
- `PUT /api/public/customer/profile` (auth; `websiteCustomerController.updateProfile`). Identity comes
  from the token — a body id is never trusted, so a customer can update only their own record. Updates
  only supplied fields (omitted fields preserved), validates name/email/mobile, enforces unique
  email/mobile excluding self, never returns the hash.

### Task 5 — Integration docs
- `docs/PUBLIC_API_INTEGRATION.md` — base URL/env/CORS, booking API + passenger shape + customer
  flow, registration/welcome email, login, profile-update, wishlist removal, DB/`pending` setup,
  fetch examples (guest vs logged-in), and troubleshooting — all matching the implemented routes.

### Verification
- `node --check` + ESM import OK (models, booking/customer controllers, routes); route introspection
  confirms `PUT /customer/profile` present and both wishlist routes gone; `vite build` OK.
- Protected `MasterForm.jsx` / `server/package.json` unchanged.

> Reminder: live email + customer login need `JWT_SECRET`, `CLIENT_URL` and SMTP set in the server
> environment (see `docs/PUBLIC_API_INTEGRATION.md`).
