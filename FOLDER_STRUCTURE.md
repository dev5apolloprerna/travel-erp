# 360 Travel Concierge Pvt Ltd — Project Folder Structure

Stack: **MongoDB + Express (Node.js) + React (Vite) + Tailwind CSS**
`node_modules/` and `dist/` are excluded.

```
travel-erp/
├── client/
│   ├── public/
│   │   └── logo.png
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Topbar.jsx
│   │   │   └── ui/
│   │   │       ├── ConfirmDialog.jsx
│   │   │       ├── DocumentManager.jsx
│   │   │       ├── ImageUpload.jsx
│   │   │       ├── ProfilePicUpload.jsx
│   │   │       └── index.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── account/
│   │   │   │   ├── ChangePassword.jsx
│   │   │   │   └── MyProfile.jsx
│   │   │   ├── admin/
│   │   │   │   ├── EmployeeForm.jsx
│   │   │   │   └── EmployeeList.jsx
│   │   │   ├── auth/
│   │   │   │   └── Login.jsx
│   │   │   ├── b2b/
│   │   │   │   ├── BookingFlow.jsx
│   │   │   │   ├── CompanyDetail.jsx
│   │   │   │   ├── CompanyForm.jsx
│   │   │   │   └── CompanyList.jsx
│   │   │   ├── cms/
│   │   │   │   ├── CategoryMaster.jsx
│   │   │   │   ├── ContentMaster.jsx
│   │   │   │   ├── DestinationMaster.jsx
│   │   │   │   ├── PackageMaster.jsx
│   │   │   │   └── WebsiteBookings.jsx
│   │   │   ├── fit/
│   │   │   │   ├── BookingFlow.jsx
│   │   │   │   ├── DoctorList.jsx
│   │   │   │   ├── FitDashboard.jsx
│   │   │   │   ├── FitEmployeeList.jsx
│   │   │   │   └── FitOrderList.jsx
│   │   │   ├── hr/
│   │   │   │   ├── HolidayMaster.jsx
│   │   │   │   ├── LeaveRequests.jsx
│   │   │   │   ├── MyLeave.jsx
│   │   │   │   ├── MySalarySlips.jsx
│   │   │   │   └── SalarySlips.jsx
│   │   │   ├── invoice/
│   │   │   │   └── InvoiceGenerate.jsx
│   │   │   ├── masters/
│   │   │   │   ├── ClusterMaster.jsx
│   │   │   │   ├── DepartmentMaster.jsx
│   │   │   │   ├── DivisionMaster.jsx
│   │   │   │   ├── GradeMaster.jsx
│   │   │   │   └── ServiceMaster.jsx
│   │   │   ├── portal/
│   │   │   │   ├── CustomerPortal.jsx
│   │   │   │   └── MemberPortal.jsx
│   │   │   ├── retail/
│   │   │   │   ├── BookingFlow.jsx
│   │   │   │   ├── CustomerForm.jsx
│   │   │   │   ├── CustomerList.jsx
│   │   │   │   ├── OrderDetail.jsx
│   │   │   │   └── OrderList.jsx
│   │   │   ├── settings/
│   │   │   │   └── CompanyProfile.jsx
│   │   │   ├── shared/
│   │   │   │   ├── ServiceBookingForm.jsx
│   │   │   │   ├── serviceFields.js
│   │   │   │   └── serviceForms.js
│   │   │   └── EmployeeDashboard.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── main.jsx
│   │   └── menuConfig.js
│   ├── .env
│   ├── .env.example
│   ├── .env.production
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── b2bController.js
│   │   ├── cmsController.js
│   │   ├── fitController.js
│   │   ├── hrController.js
│   │   ├── invoiceController.js
│   │   ├── passengerController.js
│   │   ├── publicController.js
│   │   ├── retailController.js
│   │   ├── serviceController.js
│   │   ├── settingsController.js
│   │   └── websiteBookingController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── error.js
│   ├── models/
│   │   ├── Company.js
│   │   ├── Content.js
│   │   ├── Customer.js
│   │   ├── Destination.js
│   │   ├── FitMasters.js
│   │   ├── Holiday.js
│   │   ├── Leave.js
│   │   ├── Order.js
│   │   ├── Passenger.js
│   │   ├── Payment.js
│   │   ├── SalarySlip.js
│   │   ├── Service.js
│   │   ├── Settings.js
│   │   ├── TourPackage.js
│   │   ├── User.js
│   │   ├── WebsiteBooking.js
│   │   └── shared.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── b2bRoutes.js
│   │   ├── cmsRoutes.js
│   │   ├── fitRoutes.js
│   │   ├── hrRoutes.js
│   │   ├── invoiceRoutes.js
│   │   ├── publicRoutes.js
│   │   ├── retailRoutes.js
│   │   ├── serviceRoutes.js
│   │   └── settingsRoutes.js
│   ├── uploads/
│   │   └── .gitkeep
│   ├── utils/
│   │   ├── gst.js
│   │   ├── invoicePdf.js
│   │   ├── mailer.js
│   │   ├── payments.js
│   │   ├── seed.js
│   │   └── upload.js
│   ├── .env
│   ├── .env.example
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
├── .gitignore
├── API_WEBSITE.md
├── DEPLOY_TO_HOSTINGER.md
├── FOLDER_STRUCTURE.md
└── README.md
```

## Notable this release
- `client/src/pages/invoice/InvoiceGenerate.jsx` — invoice screen (charge heads + Gross/Net footer), shared by Retail, B2B, Society
- `server/controllers/invoiceController.js` — `computeInvoiceTotals`, `generateInvoiceNo`, `getForInvoice`
- `server/utils/invoicePdf.js` — PDF with named charge heads and the Gross − Discount − TDS − TCS + Govt Tax = Net footer
- Orders capture booking details; pricing + manual tax entered at invoice generation
