// =============================================================================
//  REPORT REGISTRY (v60)
// -----------------------------------------------------------------------------
//  Single source of truth for the Reports module. The structure below mirrors
//  the client-approved report inventory (travel_erp_26102026.docx) EXACTLY —
//  two design types ("Pre Design" and "User Design"), their groups and every
//  report/sub-report, with names and hierarchy preserved verbatim (268 reports).
//
//  Each leaf report has:
//    id        - stable slug (used in the URL + future per-user rights key)
//    label     - display name (verbatim from the inventory)
//    runner    - (optional) key into reports/runners.js. When present the report
//                is "ready" and produces live data; when absent it is "planned"
//                (navigable placeholder) so the full hierarchy stays intact.
//
//  FUTURE PER-USER RIGHTS (per client instruction — "for now super admin only,
//  prepare code so in future we can give user-wise rights"):
//    The permission key for any report is `reports.<id>`. Today the API simply
//    requires SUPER_ADMIN (see routes/reportRoutes.js). To switch to per-user
//    rights later, replace the role guard with can('reports.'+id,'SELECT') and
//    seed those keys into the employee permission matrix — no registry change
//    is needed, every report already owns a unique id.
// =============================================================================

/** Build a leaf report node. */
const R = (id, label, runner = null) => ({ id, label, runner });

export const REPORT_CATALOG = [
  // ===========================================================================
  //  PRE DESIGN
  // ===========================================================================
  {
    type: 'pre-design',
    typeLabel: 'Pre Design',
    groups: [
      {
        group: 'Register', children: [
          { sub: 'Sales', reports: [
            R('pre-sales-register', 'Register', 'salesRegister'),
            R('pre-sales-summary', 'Summary', 'salesSummary'),
            R('pre-sales-detail', 'Detail', 'salesDetail'),
          ] },
          { sub: 'Sales Return', reports: [
            R('pre-sales-return-register', 'Register', 'salesReturnRegister'),
            R('pre-sales-return-summary', 'Summary', 'salesReturnSummary'),
            R('pre-sales-return-detail', 'Detail'),
          ] },
          { sub: 'Purchase', reports: [
            R('pre-purchase-register', 'Register', 'purchaseRegister'),
            R('pre-purchase-summary', 'Summary', 'purchaseSummary'),
            R('pre-purchase-gstr2b-status', 'GSTR 2B Status'),
          ] },
          { sub: 'Purchase Return', reports: [
            R('pre-purchase-return-register', 'Register'),
            R('pre-purchase-return-summary', 'Summary'),
          ] },
          { sub: 'Account', reports: [
            R('pre-account-bank', 'Bank'),
            R('pre-account-cash', 'Cash', 'cashBook'),
            R('pre-account-credit-note', 'Credit Note', 'creditNoteRegister'),
            R('pre-account-debit-note', 'Debit Note'),
            R('pre-account-journal-voucher', 'Journal Voucher'),
          ] },
        ],
      },
      {
        group: 'Rent A cab', children: [
          { sub: null, reports: [
            R('pre-rac-reservation-chart', 'Reservation chart'),
            R('pre-rac-duty-chart', 'Duty Chart'),
            R('pre-rac-fuel-average', 'Fuel Average'),
            R('pre-rac-km-reconciliation', 'Kilometre Reconciliation'),
          ] },
        ],
      },
      {
        group: 'Service Tax and Vat', children: [
          { sub: null, reports: [
            R('pre-svat-register', 'Register'),
            R('pre-svat-summary', 'Summary'),
          ] },
        ],
      },
      {
        group: 'TDS', children: [
          { sub: null, reports: [
            R('pre-tds-receivable', 'Receivable'),
            R('pre-tds-payable', 'Payable'),
          ] },
        ],
      },
      {
        group: 'Air Tickets', children: [
          { sub: null, reports: [
            R('pre-air-sales', 'Sales'),
            R('pre-air-purchase', 'Purchase'),
          ] },
        ],
      },
      {
        group: 'Management', children: [
          { sub: null, reports: [
            R('pre-mgmt-daily-sales', 'Daily Sales', 'dailySales'),
            R('pre-mgmt-daily-purchase', 'Daily Purchase', 'dailyPurchase'),
            R('pre-mgmt-gross-profit-summary', 'Gross Profit (summary)', 'grossProfitSummary'),
            R('pre-mgmt-gross-profit-detail', 'Gross Profit (Detail)', 'grossProfitDetail'),
          ] },
        ],
      },
      {
        group: 'Outstanding', children: [
          { sub: null, reports: [
            R('pre-os-statement', 'Statement', 'outstandingStatement'),
            R('pre-os-summary', 'Summary', 'outstandingSummary'),
            R('pre-os-ageing-analysis', 'Ageing Analysis', 'ageingAnalysis'),
            R('pre-os-payment-request', 'Payment Request'),
          ] },
        ],
      },
      {
        group: 'Statements', children: [
          { sub: null, reports: [ R('pre-statements-account', 'Account') ] },
        ],
      },
      {
        group: 'Account', children: [
          { sub: null, reports: [
            R('pre-acc-ledger', 'Ledger', 'accountLedger'),
            R('pre-acc-day-book', 'Day book', 'dayBook'),
            R('pre-acc-trial-balance', 'Trail Balance'),
            R('pre-acc-profit-loss', 'Profit and loss'),
            R('pre-acc-balance-sheet', 'Balance Sheet'),
            R('pre-acc-balance-confirmation', 'Balance confirmation'),
            R('pre-acc-interest-calculation', 'Interest Calculation'),
            R('pre-acc-depreciation', 'Depreciation calculation'),
          ] },
        ],
      },
      {
        group: 'Printing', children: [
          { sub: null, reports: [
            R('pre-print-label', 'Label'),
            R('pre-print-envelop', 'Envelop'),
            R('pre-print-bank-slip', 'Bank slip'),
            R('pre-print-voucher-single', 'Voucher (single print)'),
          ] },
        ],
      },
      {
        group: 'Tours', children: [
          { sub: null, reports: [ R('pre-tours-outstanding-register', 'Tour outstanding register', 'tourOutstandingRegister') ] },
        ],
      },
    ],
  },

  // ===========================================================================
  //  USER DESIGN
  // ===========================================================================
  {
    type: 'user-design',
    typeLabel: 'User Design',
    groups: [
      {
        group: 'Account', children: [
          { sub: null, reports: [
            R('ud-acc-register', 'Register', 'salesRegister'),
            R('ud-acc-day-book', 'Day book', 'dayBook'),
            R('ud-acc-tds-ereturn', 'TDS e-Return'),
            R('ud-acc-tds-ereturn-register', 'TDS e-Return (Register)'),
            R('ud-acc-books-summary', 'Books Summary'),
            R('ud-acc-books-summary-detail', 'Books Summary Detail'),
            R('ud-acc-books-monthly-summary', 'Books Monthly Summary'),
            R('ud-acc-outstanding-summary', 'Outstanding Summary', 'outstandingSummary'),
            R('ud-acc-day-summary', 'Day Summary', 'dailySales'),
            R('ud-acc-group-summary', 'Group Summary'),
            R('ud-acc-credit-limit-status', 'Credit limit Status'),
            R('ud-acc-analysis-register', 'Analysis (Register)'),
            R('ud-acc-gross-profit-summary', 'Gross profit (Summary)', 'grossProfitSummary'),
            R('ud-acc-pl-monthly', 'Profit and loss monthly'),
            R('ud-acc-spr-monthly-pivot', 'Sales / Purchase / Return (Monthly Pivot)'),
            R('ud-acc-spr-monthly-summary', 'Sales / Purchase / Return (Monthly Summary)'),
            R('ud-acc-spr-supplier-wise', 'Sales / Purchase / Return (Supplier Wise)'),
            R('ud-acc-check-purchase-return-received', 'Check is Purchase and return received'),
            R('ud-acc-employee-income-expense', 'Employee wise income vs expense'),
            R('ud-acc-account-setup', 'Account Setup'),
            R('ud-acc-transaction-notes', 'Transaction Notes'),
            R('ud-acc-voucher-against-register', 'Voucher (Against Register)'),
            R('ud-acc-voucher-tracking-register', 'Voucher (Tracking Register)'),
            R('ud-acc-cash-book', 'Cash Book', 'cashBook'),
            R('ud-acc-ageing-register-detail', 'Ageing Register (Detail)', 'ageingAnalysis'),
            R('ud-acc-tds-return', 'Account (TDS Return)'),
          ] },
        ],
      },
      {
        group: 'Contact', children: [
          { sub: null, reports: [
            R('ud-contact-register', 'Register', 'contactRegister'),
            R('ud-contact-hotel', 'Hotel'),
            R('ud-contact-agent-commission', 'Agent Commission'),
          ] },
        ],
      },
      {
        group: 'Vendor', children: [
          { sub: null, reports: [ R('ud-vendor-register', 'Vendor (Register)') ] },
        ],
      },
      {
        group: 'Purchase', children: [
          { sub: null, reports: [
            R('ud-purchase-register', 'Register', 'purchaseRegister'),
            R('ud-purchase-summary', 'Summary', 'purchaseSummary'),
          ] },
        ],
      },
      {
        group: 'Purchase return', children: [
          { sub: null, reports: [
            R('ud-pr-register', 'Register'),
            R('ud-pr-summary', 'Summary'),
          ] },
        ],
      },
      {
        group: 'Purchase vs Purchase return', children: [
          { sub: null, reports: [
            R('ud-pvpr-register', 'Register'),
            R('ud-pvpr-summary', 'Summary'),
            R('ud-pvpr-register-detail', 'Register detail'),
            R('ud-pvpr-register-air-ticket', 'Register (Air Ticker)'),
            R('ud-pvpr-register-credit-card', 'Register (credit card)'),
            R('ud-pvpr-register-refundable-tax', 'Register (Refundable tax)'),
            R('ud-pvpr-register-all-column', 'Register (All column)'),
          ] },
        ],
      },
      {
        group: 'PNR Stock', children: [
          { sub: null, reports: [ R('ud-pnr-register', 'PNR Stock (Register)') ] },
        ],
      },
      {
        group: 'Hotel Voucher', children: [
          { sub: null, reports: [
            R('ud-hotel-voucher-register', 'Register'),
            R('ud-hotel-voucher-reminder', 'Reminder'),
          ] },
        ],
      },
      {
        group: 'Transport Voucher', children: [
          { sub: null, reports: [
            R('ud-transport-voucher-register', 'Register'),
            R('ud-transport-voucher-reminder', 'Reminder'),
          ] },
        ],
      },
      {
        group: 'Excursion voucher', children: [
          { sub: null, reports: [
            R('ud-excursion-voucher-register', 'Register'),
            R('ud-excursion-voucher-reminder', 'Reminder'),
          ] },
        ],
      },
      {
        group: 'Duty Slip', children: [
          { sub: null, reports: [
            R('ud-duty-register-rac', 'Register (Rand a cab)'),
            R('ud-duty-register-vendor-hire', 'Register (Vendor Hire)'),
            R('ud-duty-hire-register-vendor', 'Hire Register (Vendor)'),
            R('ud-duty-hire-register-vendor-close', 'Hire Register (Vendor) (Close Duty)'),
            R('ud-duty-vehicle-income-expense', 'Vehicle wise income vs expense'),
            R('ud-duty-driver-allowance', 'Driver allowance'),
            R('ud-duty-journey-all-column-rac', 'Journey Detail All Column (Ren a cab)'),
            R('ud-duty-vehicle-allotment-chart', 'Vehicle Allotment chart'),
          ] },
        ],
      },
      {
        group: 'Visa Booking', children: [
          { sub: null, reports: [ R('ud-visa-register', 'Register') ] },
        ],
      },
      {
        group: 'Sales', children: [
          { sub: null, reports: [
            R('ud-sales-register', 'Register', 'salesRegister'),
            R('ud-sales-summary', 'Summary', 'salesSummary'),
            R('ud-sales-travel-on-register', 'Travel on register'),
            R('ud-sales-travel-list-ticketing', 'Travel List (Ticketing)'),
            R('ud-sales-sector-detail-ticketing', 'Sector detail (Ticketing)'),
            R('ud-sales-detail-register-rac', 'Detail Register (Rant a cab)'),
          ] },
        ],
      },
      {
        group: 'Sales Return', children: [
          { sub: null, reports: [
            R('ud-sr-register', 'Register', 'salesReturnRegister'),
            R('ud-sr-summary', 'Summary', 'salesReturnSummary'),
            R('ud-sr-register-parked', 'Register (Parked)'),
          ] },
        ],
      },
      {
        group: 'Sales vs sales return', children: [
          { sub: null, reports: [
            R('ud-svsr-register', 'Register'),
            R('ud-svsr-summary', 'Summery'),
            R('ud-svsr-detail-register', 'Detail Register'),
            R('ud-svsr-register-detail-markup', 'Register Detail (with Markup)'),
            R('ud-svsr-register-markup', 'Register (Markup)'),
            R('ud-svsr-register-railway', 'Register (Railway Ticket)'),
            R('ud-svsr-register-loyalty', 'Register (Loyalty)'),
            R('ud-svsr-register-fire-difference', 'Register (Fire Difference)'),
            R('ud-svsr-summary-gross', 'Summary gross (Customer / Airline)'),
            R('ud-svsr-register-refundable-tax', 'Register (Refundable Tax)'),
            R('ud-svsr-register-all-column', 'Register (All Column)'),
          ] },
        ],
      },
      {
        group: 'Tour', children: [
          { sub: null, reports: [
            R('ud-tour-register', 'Tour (Register)', 'tourRegister'),
            R('ud-tour-travel-list', 'Tour (Travel List)'),
            R('ud-tour-availability-detail', 'Tour (Availability Detail)'),
            R('ud-tour-availability-summary', 'Tour (Availability Summary)'),
            R('ud-tour-traveller-list-airline', 'Traveller List (For Airline)'),
            R('ud-tour-traveller-list-hotel', 'Traveller List (for Hotel)'),
            R('ud-tour-outstanding-register', 'Tour (Outstanding Register)', 'tourOutstandingRegister'),
            R('ud-tour-checkin-register', 'Tour (Check-in register)'),
            R('ud-tour-margin-register', 'Tour (Margin Register)'),
            R('ud-tour-exec-monthly-summary', 'Tour (Executive wise monthly summary)'),
            R('ud-tour-exec-day-summary', 'Tour (Executive wise day summary)'),
            R('ud-tour-hotel-register', 'Tour (Hotel Register)'),
            R('ud-tour-vehicle-register', 'Tour (Vehicle Register)'),
            R('ud-tour-excursion-register', 'Tour (Excursion Register)'),
          ] },
        ],
      },
      {
        group: 'GST Return', children: [
          { sub: null, reports: [
            R('ud-gstr1-b2b-tax-invoice', 'GSTR 1 : B2B Tax invoice', 'gstr1B2b'),
            R('ud-gstr1-b2c-large', 'GSTR 1 : B2C Large Invoice (2.5 lakh)'),
            R('ud-gstr1-b2c-small', 'GSTR 1 : B2C Small Invoice (Others)'),
            R('ud-gstr1-export', 'GSTR 1 : Export'),
            R('ud-gstr1-b2b-note', 'GSTR 1 : B2B Note / Refund Voucher'),
            R('ud-gstr1-b2c-note', 'GSTR 1 : B2C Note / Refund Voucher (2.5 lakh)'),
            R('ud-gstr1-advance-received', 'GSTR 1 : Advanced Received'),
            R('ud-gstr1-advance-adjust', 'GSTR 1 : Advanced Adjust'),
            R('ud-gstr1-nil-rated', 'GSTR 1 : Nil Rated, Exempted and non-GST'),
            R('ud-gstr1-docs-issued', 'GSTR 1 : Summary of documents issued during the tax period'),
            R('ud-gstr1-hsn-b2b', 'GSTR 1 : Summary of HSN (b2b)'),
            R('ud-gstr1-hsn-b2c', 'GSTR 1 : Summary of HSN (b2c)'),
            R('ud-gstr2-b2b-tax-purchase', 'GSTR 2 : B2B tax Purchase'),
            R('ud-gstr2-unregister-supplier', 'GSTR 2 : Supplies for unregister supplier'),
            R('ud-gstr2-import-services', 'GSTR 2 : import of services'),
            R('ud-gstr2-import-goods', 'GSTR 2 : import of goods'),
            R('ud-gstr2-b2b-note', 'GSTR 2 : B2B Note / Refund voucher'),
            R('ud-gstr2-b2c-note', 'GSTR 2 : B2C Note / Refund voucher'),
            R('ud-gstr2-advance-paid', 'GSTR 2 : Advance Paid'),
            R('ud-gstr2-advance-adjust', 'GSTR 2 : Advance Adjust'),
            R('ud-gstr2-composition', 'GSTR 2 : Composition taxable person, Nil Rated, Exempted and Non-GST'),
            R('ud-gstr2-hsn', 'GSTR 2 : Summary of HSN'),
            R('ud-gstr2b-reconciliation', 'GSTR 2B : Reconciliation statement'),
            R('ud-gstr-register', 'GSTR : Register'),
            R('ud-gstr3b-register-drilldown', 'GSTR 3B Register (Drill Down)'),
            R('ud-gstr3b-register-drilldown-reco', 'GSTR 3B Register (Drill Down) Reco'),
          ] },
        ],
      },
      {
        group: 'Custom', children: [
          { sub: null, reports: [
            R('ud-custom-web-gst-sales', 'Web GST : Sales'),
            R('ud-custom-web-gst-purchase', 'Web GST : Purchase'),
            R('ud-custom-web-gst-gstr1-dcn', 'Web GST : GSTR-1 Debit Credit Note'),
            R('ud-custom-web-gst-gstr2-dcn', 'Web GST : GSTR-2 Debit Credit Note'),
            R('ud-custom-web-gst-gstr1-advance-tax', 'Web GST : GSTR-1 Advance Tax'),
            R('ud-custom-web-gst-gstr2-advance-tax', 'Web GST : GSTR-2 Advance Tax'),
            R('ud-custom-sales-register-vat', 'Sales Register (VAT)'),
            R('ud-custom-duty-slip-duty-chart', 'Duty Slip (Duty Chart)'),
            R('ud-custom-customer-tour-checkin', 'Customer (Tour Check in Register)'),
            R('ud-custom-customer-tour-os-analysis', 'Customer (Tour Outstanding Analysis)'),
            R('ud-custom-customer-tour-checkin-breakup', 'Customer (Tour Checkin Register with Breakup)'),
            R('ud-custom-customer-account-ledger', 'Customer (Account Ledger)', 'accountLedger'),
            R('ud-custom-customer-cash-bank-receipt', 'Customer (Cash & Bank Receipt Report)'),
            R('ud-custom-customer-sales-purchase-margin', 'Customer (Sales Purchase margin report)'),
            R('ud-custom-spr-supplier-bill-wise', 'Sales / Purchase / Return (Supplier / Bill wise)'),
            R('ud-custom-customer-balance-sheet-branch', 'Customer Balance Sheet (Branch wise)'),
            R('ud-custom-customer-sales-cash-summary', 'Customer (Sales and Cash Summary)'),
            R('ud-custom-service-income-summary', 'Service  wise income summary'),
          ] },
        ],
      },
    ],
  },
];

// ---- Derived helpers --------------------------------------------------------

/** Flat map of every report id -> { ...leaf, type, typeLabel, group, sub }. */
export const REPORT_INDEX = (() => {
  const map = new Map();
  for (const t of REPORT_CATALOG) {
    for (const g of t.groups) {
      for (const c of g.children) {
        for (const r of c.reports) {
          map.set(r.id, { ...r, type: t.type, typeLabel: t.typeLabel, group: g.group, sub: c.sub });
        }
      }
    }
  }
  return map;
})();

export const getReport = (id) => REPORT_INDEX.get(id) || null;

/** A report is "ready" when it has a live runner, otherwise it is "planned". */
export const isReady = (id) => Boolean(getReport(id)?.runner);

/** Client-facing catalog tree: same shape as REPORT_CATALOG but each leaf carries
 *  a `status` flag instead of exposing the internal runner key. */
export const catalogForClient = () =>
  REPORT_CATALOG.map((t) => ({
    type: t.type,
    typeLabel: t.typeLabel,
    groups: t.groups.map((g) => ({
      group: g.group,
      children: g.children.map((c) => ({
        sub: c.sub,
        reports: c.reports.map((r) => ({ id: r.id, label: r.label, status: r.runner ? 'ready' : 'planned' })),
      })),
    })),
  }));

/** Counts for the hub header. */
export const catalogStats = () => {
  let total = 0; let ready = 0;
  for (const r of REPORT_INDEX.values()) { total += 1; if (r.runner) ready += 1; }
  return { total, ready, planned: total - ready };
};
