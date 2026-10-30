// =============================================================================
//  REPORT RUNNERS (v60)
// -----------------------------------------------------------------------------
//  A runner turns a date range (+ optional query params) into a normalized
//  result the generic UI and PDF renderer understand:
//
//    { title, subtitle, columns:[{key,label,align,type}], rows:[{...}],
//      totals:{<key>:value}, meta:{...} }
//
//  column.type is one of: 'text' | 'date' | 'number' | 'money' | 'status'
//
//  Every runner is read-only (reporting), org-scoped via scopeToOrg so the
//  numbers respect tenant isolation exactly like the rest of the ERP, and
//  resilient to missing/legacy data.
//
//  These are the reports backed by live data today; the remaining catalog
//  entries are navigable placeholders (see registry.js). New runners plug in
//  here keyed by the `runner` value used in the registry.
// =============================================================================
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import CreditNote from '../models/CreditNote.js';
import SupplierInvoice from '../models/SupplierInvoice.js';
import Customer from '../models/Customer.js';
import { scopeToOrg } from '../middleware/auth.js';

// ---- helpers ----------------------------------------------------------------
const num = (v) => Number(v) || 0;
const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const monthKey = (d) => (d ? new Date(d).toISOString().slice(0, 7) : '');

/** Build an inclusive {$gte,$lte} range on `field`. Missing bounds are open. */
const dateRange = (from, to) => {
  const r = {};
  if (from) r.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) r.$lte = new Date(`${to}T23:59:59.999Z`);
  return Object.keys(r).length ? r : null;
};

const sumRows = (rows, keys) => {
  const t = {};
  for (const k of keys) t[k] = rows.reduce((a, r) => a + num(r[k]), 0);
  return t;
};

const partyOf = (o) =>
  o.customerId?.name ||
  o.companyId?.name ||
  o.societyPassenger?.name ||
  o.customerName ||
  '—';

const n2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// First / second tax head per service (the invoice charge heads differ by service,
// see invoiceCalc.js SERVICE_CHARGES). Mapped to the report's "Tax I" / "Tax II".
const TAX_HEADS = {
  FLIGHT: ['yqTax', 'yrTax'], TRAIN: ['irctc', 'gateway'], RAILWAY: ['irctc', 'gateway'],
  BUS: ['taxI', 'gateway'], CAB: ['borderTax', 'tollParking'], TAXI: ['borderTax', 'tollParking'],
  EVENT: ['tax', null], VISA: ['tax', null],
};

/**
 * Break an invoiced order's stored amounts into the report's column heads using
 * the ACTUAL invoice data (never dummy values). The charge breakdown is faithful
 * and reconciles to the stored net:
 *   Basic + TaxI + TaxII + Processing + Other  (= grossTotal + 360 service charge)
 *   − Discount − TDS − TCS + Government Tax     = Net Amount (order.netInvoiceAmount)
 * "Other" absorbs every remaining head (K3/OC/misc taxes, markup, service charge) so
 * no money is lost. "Rounded" is the round-off to the nearest rupee (0 when none).
 */
function chargeHeads(o) {
  const c = o.invoiceCharges || {};
  const st = ((o.services?.[0]?.serviceType) || o.serviceCalcType || 'FLIGHT').toUpperCase();
  const [t1, t2] = TAX_HEADS[st] || ['yqTax', 'yrTax'];
  const basic = num(c.basic) || num(c.basicAmount) || num(c.fee);
  const taxI = t1 ? num(c[t1]) : 0;
  const taxII = t2 ? num(c[t2]) : 0;
  const processing = num(c.processingCharges) || num(c.serviceCharge);
  const gross = num(o.grossTotal);
  const discount = num(o.discountAmount);
  const tds = num(o.tdsAmount);
  const tcs = num(o.tcsAmount);
  const govt = num(o.govtTaxAmount);
  const serviceCharge = num(o.serviceChargeAmount);
  const other = n2(gross - (basic + taxI + taxII + processing) + serviceCharge);
  const net = num(o.netInvoiceAmount) || n2(gross - discount - tds - tcs + govt + serviceCharge);
  const rounded = n2(Math.round(net) - net);
  return { basic, taxI, taxII, processing, other, discount, tds, tcs, govt, rounded, net };
}

// The numeric heads, in report order, shared by the three Sales reports.
const SALES_MONEY = ['basic', 'taxI', 'taxII', 'processing', 'other', 'discount', 'tds', 'tcs', 'govt', 'rounded', 'net'];
const MONEY_COLS = [
  { key: 'basic', label: 'Basic Amount', align: 'right', type: 'money' },
  { key: 'taxI', label: 'Tax I', align: 'right', type: 'money' },
  { key: 'taxII', label: 'Tax II', align: 'right', type: 'money' },
  { key: 'processing', label: 'Processing', align: 'right', type: 'money' },
  { key: 'other', label: 'Other', align: 'right', type: 'money' },
  { key: 'discount', label: 'Discount', align: 'right', type: 'money' },
  { key: 'tds', label: 'TDS', align: 'right', type: 'money' },
  { key: 'tcs', label: 'TCS', align: 'right', type: 'money' },
  { key: 'govt', label: 'Government Tax', align: 'right', type: 'money' },
  { key: 'rounded', label: 'Rounded', align: 'right', type: 'money' },
  { key: 'net', label: 'Net Amount', align: 'right', type: 'money' },
];
const ZERO_HEADS = { basic: 0, taxI: 0, taxII: 0, processing: 0, other: 0, discount: 0, tds: 0, tcs: 0, govt: 0, rounded: 0, net: 0 };

// Service label for an invoice row (distinct service types; packages flagged).
const serviceLabel = (o) => {
  const uniq = [...new Set((o.services || []).map((s) => s.serviceType).filter(Boolean))];
  if (o.isPackage) return `Package${uniq.length ? ` (${uniq.join(', ')})` : ''}`;
  return uniq.join(', ') || o.invoiceType || '—';
};

// Best-effort pulls for the Detail report's passenger/ticket fields (flight data is
// stored free-form on the service line / passenger, so several key spellings are tried).
const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '') || '';
const travelOn = (s, p) => pick(p?.travelDate, s?.travelDate, s?.journeyDate, s?.departureDate, s?.departDate, s?.date, s?.checkIn);

// Load invoiced SALES orders in range (by invoiceDate).
// v65: clubbed (superseded) source invoices are excluded so the consolidated invoice is counted
// once — no double counting of revenue/GST/outstanding.
async function loadSalesInvoices(req, from, to) {
  const filter = scopeToOrg({ invoiceGenerated: true, invoiceCancelled: { $ne: true }, clubbed: { $ne: true } }, req);
  const dr = dateRange(from, to);
  if (dr) filter.invoiceDate = dr;
  return Order.find(filter)
    .populate('customerId', 'name email')
    .populate('companyId', 'name')
    .sort('invoiceDate')
    .lean();
}

// =============================================================================
//  SALES  (columns + customer grouping per client reference screenshots)
// =============================================================================

// 1) Sales — Register : one row per invoice, grouped by customer.
export async function salesRegister(req, { from, to }) {
  const orders = await loadSalesInvoices(req, from, to);
  const rows = orders.map((o) => ({
    invoiceNo: o.invoiceNo || '—',
    date: o.invoiceDate || o.createdAt,
    service: serviceLabel(o),
    party: partyOf(o),            // group key (not shown as a column)
    ...chargeHeads(o),
  }));
  return {
    title: 'Sales Register',
    grouping: { key: 'party', label: 'Customer' },
    columns: [
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'service', label: 'Service', align: 'left', type: 'text' },
      ...MONEY_COLS,
    ],
    rows,
    totals: sumRows(rows, SALES_MONEY),
  };
}

// 2) Sales — Summary : customer-wise totals.
export async function salesSummary(req, { from, to }) {
  const orders = await loadSalesInvoices(req, from, to);
  const byParty = new Map();
  for (const o of orders) {
    const h = chargeHeads(o);
    const k = partyOf(o);
    const g = byParty.get(k) || { customer: k, ...{ ...ZERO_HEADS } };
    for (const key of SALES_MONEY) g[key] = n2(g[key] + h[key]);
    byParty.set(k, g);
  }
  const rows = [...byParty.values()].sort((a, b) => b.net - a.net);
  return {
    title: 'Sales Summary',
    columns: [
      { key: 'customer', label: 'Customer', align: 'left', type: 'text' },
      ...MONEY_COLS,
    ],
    rows,
    totals: sumRows(rows, SALES_MONEY),
  };
}

// 3) Sales — Detail : one row per passenger, grouped by customer. Invoice-level
//    amounts are placed on the FIRST row of each invoice so column totals stay
//    equal to the invoice totals (no double counting across passenger rows).
export async function salesDetail(req, { from, to }) {
  const orders = await loadSalesInvoices(req, from, to);
  const rows = [];
  for (const o of orders) {
    const heads = chargeHeads(o);
    const party = partyOf(o);
    const lines = o.services?.length ? o.services : [{}];
    let firstForInvoice = true;
    for (const s of lines) {
      const pax = (s.passengers?.length ? s.passengers : [{}]);
      for (const p of pax) {
        rows.push({
          invoiceNo: firstForInvoice ? (o.invoiceNo || '—') : '',
          date: firstForInvoice ? (o.invoiceDate || o.createdAt) : '',
          party,
          passenger: p.name || '—',
          ticketNo: pick(p.ticketNo, p.ticketNumber, s.ticketNo, s.ticketNumber),
          pnr: pick(p.pnr, p.pnrNo, s.pnr, s.pnrNo, s.pnrNumber),
          sector: pick(p.sector, s.sector, s.route, s.sectors),
          on: travelOn(s, p),
          ...(firstForInvoice ? heads : ZERO_HEADS),
        });
        firstForInvoice = false;
      }
    }
  }
  return {
    title: 'Sales Detail',
    grouping: { key: 'party', label: 'Customer' },
    columns: [
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'passenger', label: 'Passenger', align: 'left', type: 'text' },
      { key: 'ticketNo', label: 'Ticket No', align: 'left', type: 'text' },
      { key: 'pnr', label: 'PNR', align: 'left', type: 'text' },
      { key: 'sector', label: 'Sector', align: 'left', type: 'text' },
      { key: 'on', label: 'On', align: 'left', type: 'date' },
      ...MONEY_COLS,
    ],
    rows,
    totals: sumRows(rows, SALES_MONEY),
  };
}

// =============================================================================
//  SALES RETURN  (credit notes)
// =============================================================================
async function loadCreditNotes(req, from, to) {
  const filter = scopeToOrg({}, req);
  const dr = dateRange(from, to);
  if (dr) filter.createdAt = dr;
  return CreditNote.find(filter).sort('createdAt').lean();
}

export async function salesReturnRegister(req, { from, to }) {
  const cns = await loadCreditNotes(req, from, to);
  const rows = cns.map((c) => ({
    creditNoteNo: c.creditNoteNo || '—',
    date: c.createdAt,
    invoiceNo: c.invoiceNo || '—',
    reason: c.reason || '—',
    amount: num(c.amount),
  }));
  return {
    title: 'Sales Return Register',
    columns: [
      { key: 'creditNoteNo', label: 'Credit Note', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'invoiceNo', label: 'Against Invoice', align: 'left', type: 'text' },
      { key: 'reason', label: 'Reason', align: 'left', type: 'text' },
      { key: 'amount', label: 'Amount', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['amount']),
  };
}

export async function salesReturnSummary(req, { from, to }) {
  const cns = await loadCreditNotes(req, from, to);
  const byMonth = new Map();
  for (const c of cns) {
    const k = monthKey(c.createdAt);
    const g = byMonth.get(k) || { month: k, count: 0, amount: 0 };
    g.count += 1; g.amount += num(c.amount);
    byMonth.set(k, g);
  }
  const rows = [...byMonth.values()];
  return {
    title: 'Sales Return Summary',
    columns: [
      { key: 'month', label: 'Month', align: 'left', type: 'text' },
      { key: 'count', label: 'Credit Notes', align: 'right', type: 'number' },
      { key: 'amount', label: 'Amount', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['count', 'amount']),
  };
}

export async function creditNoteRegister(req, args) {
  const out = await salesReturnRegister(req, args);
  out.title = 'Credit Note Register';
  return out;
}

// =============================================================================
//  PURCHASE  (supplier invoices: Main Company -> 360)
// =============================================================================
async function loadSupplierInvoices(req, from, to) {
  const filter = scopeToOrg({}, req);
  const dr = dateRange(from, to);
  if (dr) filter.invoiceDate = dr;
  return SupplierInvoice.find(filter)
    .populate('mainCompanyId', 'name')
    .sort('invoiceDate')
    .lean();
}

export async function purchaseRegister(req, { from, to }) {
  const inv = await loadSupplierInvoices(req, from, to);
  const rows = inv.map((s) => ({
    invoiceNo: s.invoiceNo || '—',
    date: s.invoiceDate,
    supplier: s.mainCompanyId?.name || '—',
    direction: s.invoiceDirection || 'PURCHASE',
    gross: num(s.grossTotal),
    tds: num(s.tdsAmount),
    net: num(s.netInvoiceAmount),
  }));
  return {
    title: 'Purchase Register',
    columns: [
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'supplier', label: 'Supplier', align: 'left', type: 'text' },
      { key: 'gross', label: 'Gross', align: 'right', type: 'money' },
      { key: 'tds', label: 'TDS', align: 'right', type: 'money' },
      { key: 'net', label: 'Net', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['gross', 'tds', 'net']),
  };
}

export async function purchaseSummary(req, { from, to }) {
  const inv = await loadSupplierInvoices(req, from, to);
  const byCo = new Map();
  for (const s of inv) {
    const k = s.mainCompanyId?.name || '—';
    const g = byCo.get(k) || { supplier: k, count: 0, gross: 0, tds: 0, net: 0 };
    g.count += 1; g.gross += num(s.grossTotal); g.tds += num(s.tdsAmount); g.net += num(s.netInvoiceAmount);
    byCo.set(k, g);
  }
  const rows = [...byCo.values()];
  return {
    title: 'Purchase Summary',
    columns: [
      { key: 'supplier', label: 'Supplier', align: 'left', type: 'text' },
      { key: 'count', label: 'Invoices', align: 'right', type: 'number' },
      { key: 'gross', label: 'Gross', align: 'right', type: 'money' },
      { key: 'tds', label: 'TDS', align: 'right', type: 'money' },
      { key: 'net', label: 'Net', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['count', 'gross', 'tds', 'net']),
  };
}

// =============================================================================
//  PAYMENTS / CASH / DAY BOOK / LEDGER
// =============================================================================
async function loadPayments(req, from, to, extra = {}) {
  const filter = scopeToOrg({ ...extra }, req);
  const dr = dateRange(from, to);
  if (dr) filter.createdAt = dr;
  return Payment.find(filter)
    .populate({ path: 'orderId', select: 'invoiceNo module customerId companyId', populate: [{ path: 'customerId', select: 'name' }, { path: 'companyId', select: 'name' }] })
    .sort('createdAt')
    .lean();
}

export async function cashBook(req, { from, to }) {
  const pays = await loadPayments(req, from, to, { mode: 'CASH' });
  const rows = pays.map((p) => ({
    date: p.createdAt,
    invoiceNo: p.orderId?.invoiceNo || '—',
    party: p.orderId?.customerId?.name || p.orderId?.companyId?.name || '—',
    mode: p.mode || 'CASH',
    amount: num(p.amount),
  }));
  return {
    title: 'Cash Book',
    columns: [
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'mode', label: 'Mode', align: 'left', type: 'text' },
      { key: 'amount', label: 'Receipt', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['amount']),
  };
}

export async function dayBook(req, { from, to }) {
  // Vouchers = sales invoices (Dr) + receipts (Cr) + credit notes (Cr), by date.
  const [orders, pays, cns] = await Promise.all([
    loadSalesInvoices(req, from, to),
    loadPayments(req, from, to),
    loadCreditNotes(req, from, to),
  ]);
  const rows = [];
  for (const o of orders) rows.push({
    date: o.invoiceDate || o.createdAt, voucher: 'Sales Invoice', ref: o.invoiceNo || '—',
    particulars: partyOf(o), debit: num(o.totalAmount) || num(o.netInvoiceAmount), credit: 0,
  });
  for (const p of pays) rows.push({
    date: p.createdAt, voucher: 'Receipt', ref: p.orderId?.invoiceNo || '—',
    particulars: p.orderId?.customerId?.name || p.orderId?.companyId?.name || `${p.mode || ''} receipt`, debit: 0, credit: num(p.amount),
  });
  for (const c of cns) rows.push({
    date: c.createdAt, voucher: 'Credit Note', ref: c.creditNoteNo || '—',
    particulars: c.reason || c.invoiceNo || '—', debit: 0, credit: num(c.amount),
  });
  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  return {
    title: 'Day Book',
    columns: [
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'voucher', label: 'Voucher', align: 'left', type: 'text' },
      { key: 'ref', label: 'Ref No', align: 'left', type: 'text' },
      { key: 'particulars', label: 'Particulars', align: 'left', type: 'text' },
      { key: 'debit', label: 'Debit', align: 'right', type: 'money' },
      { key: 'credit', label: 'Credit', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['debit', 'credit']),
  };
}

export async function accountLedger(req, { from, to }) {
  // A running ledger across all parties (invoices debit, receipts credit).
  const [orders, pays] = await Promise.all([
    loadSalesInvoices(req, from, to),
    loadPayments(req, from, to),
  ]);
  const entries = [];
  for (const o of orders) entries.push({
    date: o.invoiceDate || o.createdAt, particulars: `Invoice ${o.invoiceNo || ''} — ${partyOf(o)}`,
    debit: num(o.totalAmount) || num(o.netInvoiceAmount), credit: 0,
  });
  for (const p of pays) entries.push({
    date: p.createdAt, particulars: `Receipt — ${p.orderId?.customerId?.name || p.orderId?.companyId?.name || p.mode || ''}`,
    debit: 0, credit: num(p.amount),
  });
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let bal = 0;
  const rows = entries.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; });
  return {
    title: 'Account Ledger',
    columns: [
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'particulars', label: 'Particulars', align: 'left', type: 'text' },
      { key: 'debit', label: 'Debit', align: 'right', type: 'money' },
      { key: 'credit', label: 'Credit', align: 'right', type: 'money' },
      { key: 'balance', label: 'Balance', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['debit', 'credit']),
  };
}

// =============================================================================
//  MANAGEMENT  (daily sales/purchase, gross profit)
// =============================================================================
export async function dailySales(req, { from, to }) {
  const orders = await loadSalesInvoices(req, from, to);
  const byDay = new Map();
  for (const o of orders) {
    const k = dayKey(o.invoiceDate || o.createdAt);
    const g = byDay.get(k) || { day: k, count: 0, taxable: 0, gst: 0, total: 0 };
    g.count += 1; g.taxable += num(o.subTotal) || num(o.grossTotal); g.gst += num(o.gstTotal); g.total += num(o.totalAmount) || num(o.netInvoiceAmount);
    byDay.set(k, g);
  }
  const rows = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return {
    title: 'Daily Sales',
    columns: [
      { key: 'day', label: 'Date', align: 'left', type: 'text' },
      { key: 'count', label: 'Invoices', align: 'right', type: 'number' },
      { key: 'taxable', label: 'Taxable', align: 'right', type: 'money' },
      { key: 'gst', label: 'GST', align: 'right', type: 'money' },
      { key: 'total', label: 'Total', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['count', 'taxable', 'gst', 'total']),
  };
}

export async function dailyPurchase(req, { from, to }) {
  const inv = await loadSupplierInvoices(req, from, to);
  const byDay = new Map();
  for (const s of inv) {
    const k = dayKey(s.invoiceDate);
    const g = byDay.get(k) || { day: k, count: 0, gross: 0, net: 0 };
    g.count += 1; g.gross += num(s.grossTotal); g.net += num(s.netInvoiceAmount);
    byDay.set(k, g);
  }
  const rows = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return {
    title: 'Daily Purchase',
    columns: [
      { key: 'day', label: 'Date', align: 'left', type: 'text' },
      { key: 'count', label: 'Invoices', align: 'right', type: 'number' },
      { key: 'gross', label: 'Gross', align: 'right', type: 'money' },
      { key: 'net', label: 'Net', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['count', 'gross', 'net']),
  };
}

export async function grossProfitSummary(req, { from, to }) {
  const [orders, inv] = await Promise.all([
    loadSalesInvoices(req, from, to),
    loadSupplierInvoices(req, from, to),
  ]);
  const sales = orders.reduce((a, o) => a + (num(o.totalAmount) || num(o.netInvoiceAmount)), 0);
  const salesTaxable = orders.reduce((a, o) => a + (num(o.subTotal) || num(o.grossTotal)), 0);
  const markup = orders.reduce((a, o) => a + num(o.markupTotal), 0);
  const purchase = inv.reduce((a, s) => a + num(s.netInvoiceAmount), 0);
  const rows = [
    { metric: 'Sales (gross)', amount: sales },
    { metric: 'Sales (taxable)', amount: salesTaxable },
    { metric: 'Purchase (net)', amount: purchase },
    { metric: 'Markup earned', amount: markup },
    { metric: 'Gross Profit (taxable sales − purchase)', amount: salesTaxable - purchase },
  ];
  return {
    title: 'Gross Profit (Summary)',
    columns: [
      { key: 'metric', label: 'Metric', align: 'left', type: 'text' },
      { key: 'amount', label: 'Amount', align: 'right', type: 'money' },
    ],
    rows,
    totals: {},
  };
}

export async function grossProfitDetail(req, { from, to }) {
  const orders = await loadSalesInvoices(req, from, to);
  const rows = orders.map((o) => {
    const taxable = num(o.subTotal) || num(o.grossTotal);
    const markup = num(o.markupTotal);
    return {
      invoiceNo: o.invoiceNo || '—',
      date: o.invoiceDate || o.createdAt,
      party: partyOf(o),
      taxable,
      markup,
      profitPct: taxable ? Math.round((markup / taxable) * 10000) / 100 : 0,
    };
  });
  return {
    title: 'Gross Profit (Detail)',
    columns: [
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'taxable', label: 'Taxable', align: 'right', type: 'money' },
      { key: 'markup', label: 'Markup', align: 'right', type: 'money' },
      { key: 'profitPct', label: 'Margin %', align: 'right', type: 'number' },
    ],
    rows,
    totals: sumRows(rows, ['taxable', 'markup']),
  };
}

// =============================================================================
//  OUTSTANDING
// =============================================================================
async function loadOutstanding(req, from, to) {
  const orders = await loadSalesInvoices(req, from, to);
  return orders
    .map((o) => ({ o, total: num(o.totalAmount) || num(o.netInvoiceAmount), paid: num(o.paidAmount) }))
    .filter(({ total, paid }) => total - paid > 0.01);
}

export async function outstandingStatement(req, args) {
  const list = await loadOutstanding(req, args.from, args.to);
  const rows = list.map(({ o, total, paid }) => ({
    invoiceNo: o.invoiceNo || '—',
    date: o.invoiceDate || o.createdAt,
    party: partyOf(o),
    total,
    paid,
    balance: total - paid,
    status: o.status || 'UNPAID',
  }));
  return {
    title: 'Outstanding Statement',
    columns: [
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'total', label: 'Total', align: 'right', type: 'money' },
      { key: 'paid', label: 'Paid', align: 'right', type: 'money' },
      { key: 'balance', label: 'Balance', align: 'right', type: 'money' },
      { key: 'status', label: 'Status', align: 'left', type: 'status' },
    ],
    rows,
    totals: sumRows(rows, ['total', 'paid', 'balance']),
  };
}

export async function outstandingSummary(req, args) {
  const list = await loadOutstanding(req, args.from, args.to);
  const byParty = new Map();
  for (const { o, total, paid } of list) {
    const k = partyOf(o);
    const g = byParty.get(k) || { party: k, invoices: 0, total: 0, paid: 0, balance: 0 };
    g.invoices += 1; g.total += total; g.paid += paid; g.balance += total - paid;
    byParty.set(k, g);
  }
  const rows = [...byParty.values()].sort((a, b) => b.balance - a.balance);
  return {
    title: 'Outstanding Summary',
    columns: [
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'invoices', label: 'Invoices', align: 'right', type: 'number' },
      { key: 'total', label: 'Total', align: 'right', type: 'money' },
      { key: 'paid', label: 'Paid', align: 'right', type: 'money' },
      { key: 'balance', label: 'Balance', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['invoices', 'total', 'paid', 'balance']),
  };
}

export async function ageingAnalysis(req, args) {
  const list = await loadOutstanding(req, args.from, args.to);
  const now = Date.now();
  const bucketOf = (d) => {
    const days = Math.floor((now - new Date(d).getTime()) / 86400000);
    if (days <= 30) return 'b0_30';
    if (days <= 60) return 'b31_60';
    if (days <= 90) return 'b61_90';
    return 'b90p';
  };
  const byParty = new Map();
  for (const { o, total, paid } of list) {
    const k = partyOf(o);
    const g = byParty.get(k) || { party: k, b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0, balance: 0 };
    const bal = total - paid;
    g[bucketOf(o.invoiceDate || o.createdAt)] += bal;
    g.balance += bal;
    byParty.set(k, g);
  }
  const rows = [...byParty.values()].sort((a, b) => b.balance - a.balance);
  return {
    title: 'Ageing Analysis',
    subtitle: 'Outstanding balance bucketed by invoice age',
    columns: [
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'b0_30', label: '0–30 days', align: 'right', type: 'money' },
      { key: 'b31_60', label: '31–60 days', align: 'right', type: 'money' },
      { key: 'b61_90', label: '61–90 days', align: 'right', type: 'money' },
      { key: 'b90p', label: '90+ days', align: 'right', type: 'money' },
      { key: 'balance', label: 'Total', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['b0_30', 'b31_60', 'b61_90', 'b90p', 'balance']),
  };
}

// =============================================================================
//  CONTACT / TOUR / GST
// =============================================================================
export async function contactRegister(req, { from, to }) {
  const filter = scopeToOrg({}, req);
  const dr = dateRange(from, to);
  if (dr) filter.createdAt = dr;
  const cs = await Customer.find(filter).sort('name').lean();
  const rows = cs.map((c) => ({
    name: c.name || '—',
    email: c.email || '—',
    mobile: c.mobile || c.phone || '—',
    city: c.city || '—',
    createdAt: c.createdAt,
  }));
  return {
    title: 'Contact Register',
    columns: [
      { key: 'name', label: 'Name', align: 'left', type: 'text' },
      { key: 'email', label: 'Email', align: 'left', type: 'text' },
      { key: 'mobile', label: 'Mobile', align: 'left', type: 'text' },
      { key: 'city', label: 'City', align: 'left', type: 'text' },
      { key: 'createdAt', label: 'Added', align: 'left', type: 'date' },
    ],
    rows,
    totals: {},
    meta: { count: rows.length },
  };
}

async function loadTourOrders(req, from, to) {
  const filter = scopeToOrg({ $or: [{ module: 'FIT' }, { isPackage: true }] }, req);
  const dr = dateRange(from, to);
  if (dr) filter.createdAt = dr;
  return Order.find(filter)
    .populate('customerId', 'name')
    .populate('companyId', 'name')
    .sort('createdAt')
    .lean();
}

export async function tourRegister(req, { from, to }) {
  const orders = await loadTourOrders(req, from, to);
  const rows = orders.map((o) => ({
    orderNo: o.orderNo || o.invoiceNo || '—',
    date: o.createdAt,
    party: partyOf(o),
    module: o.module || '—',
    pax: Array.isArray(o.passengers) ? o.passengers.length : 0,
    total: num(o.totalAmount) || num(o.grossTotal),
    status: o.status || 'UNPAID',
  }));
  return {
    title: 'Tour Register',
    columns: [
      { key: 'orderNo', label: 'Order / Inv No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'module', label: 'Module', align: 'left', type: 'text' },
      { key: 'pax', label: 'Pax', align: 'right', type: 'number' },
      { key: 'total', label: 'Total', align: 'right', type: 'money' },
      { key: 'status', label: 'Status', align: 'left', type: 'status' },
    ],
    rows,
    totals: sumRows(rows, ['pax', 'total']),
  };
}

export async function tourOutstandingRegister(req, { from, to }) {
  const orders = await loadTourOrders(req, from, to);
  const rows = orders
    .map((o) => {
      const total = num(o.totalAmount) || num(o.grossTotal);
      const paid = num(o.paidAmount);
      return { orderNo: o.orderNo || o.invoiceNo || '—', date: o.createdAt, party: partyOf(o), total, paid, balance: total - paid, status: o.status || 'UNPAID' };
    })
    .filter((r) => r.balance > 0.01);
  return {
    title: 'Tour Outstanding Register',
    columns: [
      { key: 'orderNo', label: 'Order / Inv No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'total', label: 'Total', align: 'right', type: 'money' },
      { key: 'paid', label: 'Paid', align: 'right', type: 'money' },
      { key: 'balance', label: 'Balance', align: 'right', type: 'money' },
      { key: 'status', label: 'Status', align: 'left', type: 'status' },
    ],
    rows,
    totals: sumRows(rows, ['total', 'paid', 'balance']),
  };
}

export async function gstr1B2b(req, { from, to }) {
  const orders = await loadSalesInvoices(req, from, to);
  const rows = orders.map((o) => ({
    invoiceNo: o.invoiceNo || '—',
    date: o.invoiceDate || o.createdAt,
    party: partyOf(o),
    taxable: num(o.subTotal) || num(o.grossTotal),
    cgst: num(o.cgstTotal),
    sgst: num(o.sgstTotal),
    igst: num(o.igstTotal),
    total: num(o.totalAmount) || num(o.netInvoiceAmount),
  }));
  return {
    title: 'GSTR 1 : B2B Tax Invoice',
    columns: [
      { key: 'invoiceNo', label: 'Invoice No', align: 'left', type: 'text' },
      { key: 'date', label: 'Date', align: 'left', type: 'date' },
      { key: 'party', label: 'Party', align: 'left', type: 'text' },
      { key: 'taxable', label: 'Taxable', align: 'right', type: 'money' },
      { key: 'cgst', label: 'CGST', align: 'right', type: 'money' },
      { key: 'sgst', label: 'SGST', align: 'right', type: 'money' },
      { key: 'igst', label: 'IGST', align: 'right', type: 'money' },
      { key: 'total', label: 'Total', align: 'right', type: 'money' },
    ],
    rows,
    totals: sumRows(rows, ['taxable', 'cgst', 'sgst', 'igst', 'total']),
  };
}

// ---- runner table -----------------------------------------------------------
export const RUNNERS = {
  salesRegister, salesSummary, salesDetail,
  salesReturnRegister, salesReturnSummary, creditNoteRegister,
  purchaseRegister, purchaseSummary,
  cashBook, dayBook, accountLedger,
  dailySales, dailyPurchase, grossProfitSummary, grossProfitDetail,
  outstandingStatement, outstandingSummary, ageingAnalysis,
  contactRegister, tourRegister, tourOutstandingRegister, gstr1B2b,
};
