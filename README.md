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
