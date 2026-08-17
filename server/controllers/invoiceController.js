import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import Settings from '../models/Settings.js';
import Service from '../models/Service.js';
import { buildInvoicePdf, invoiceToBuffer } from '../utils/invoicePdf.js';
import { sendMail } from '../utils/mailer.js';

// Load order + the party it's billed to (retail customer or B2B company)
const loadInvoiceData = async (orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return null;

  let party = null;
  if (order.customerId) party = await Customer.findById(order.customerId);
  else if (order.companyId) party = await Company.findById(order.companyId);

  const settings = await Settings.getSettings();
  return { order, party, settings };
};

/**
 * Resolve the invoice prefix for an order from its service.
 * Orders carry one service, so the prefix is that service's `invoicePrefix`
 * (set by the admin in Service Master). Falls back sensibly for older data.
 */
const prefixForOrder = async (order) => {
  const line = (order.services || [])[0];
  if (line?.serviceRef) {
    const master = await Service.findById(line.serviceRef).select('invoicePrefix name').lean();
    if (master?.invoicePrefix) return master.invoicePrefix;
    // No prefix configured yet -> derive one from the service name (FLIGHT -> FLI)
    if (master?.name) return master.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  }
  if (line?.serviceType) return line.serviceType.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
  // Last resort: the old domestic / international scheme
  return order.invoiceType === 'INTERNATIONAL' ? 'INT' : 'DOM';
};

/** Assign an invoice number on first generation, e.g. FLT-000001. */
const ensureInvoiceNo = async (order) => {
  if (order.invoiceNo) return order;
  order.invoiceNo = await Order.nextInvoiceNo(await prefixForOrder(order));
  if (!order.invoiceDate) order.invoiceDate = new Date();
  await order.save();
  return order;
};

// GET /api/invoices/:orderId/pdf  -> streams the PDF
export const downloadInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data) return res.status(404).json({ message: 'Order not found' });

  await ensureInvoiceNo(data.order);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${data.order.invoiceNo}.pdf"`);
  buildInvoicePdf(data, res);
};

// GET /api/invoices/:orderId/preview -> inline PDF (opens in browser tab)
export const previewInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data) return res.status(404).json({ message: 'Order not found' });

  await ensureInvoiceNo(data.order);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${data.order.invoiceNo}.pdf"`);
  buildInvoicePdf(data, res);
};

// POST /api/invoices/:orderId/email  { to? }
export const emailInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data) return res.status(404).json({ message: 'Order not found' });

  const { order, party, settings } = data;
  await ensureInvoiceNo(order);

  const to = req.body.to || party?.email;
  if (!to) return res.status(400).json({ message: 'No recipient email found for this order' });

  const pdf = await invoiceToBuffer(data);

  const result = await sendMail({
    to,
    subject: `Invoice ${order.invoiceNo} — ${settings.companyName}`,
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#15223b">
        <p>Dear ${party?.name || 'Customer'},</p>
        <p>Please find attached invoice <b>${order.invoiceNo}</b>
           dated ${new Date(order.invoiceDate).toLocaleDateString('en-IN')}
           for a total of <b>Rs. ${(order.totalAmount || 0).toLocaleString('en-IN')}</b>.</p>
        <p>Thank you for your business.</p>
        <p>Regards,<br/>${settings.companyName}</p>
      </div>`,
    attachments: [{ filename: `${order.invoiceNo}.pdf`, content: pdf }],
  });

  if (!result.sent) return res.status(400).json({ message: result.error || 'Failed to send invoice email' });
  res.json({ message: `Invoice emailed to ${to}`, invoiceNo: order.invoiceNo });
};

// Compute gross + net from the manually-entered charge heads.
// Net = Gross - Discount - TDS - TCS + Govt Tax   (sign convention confirmed with client)
export const computeInvoiceTotals = (charges = {}, footer = {}) => {
  const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const c = {
    basic: num(charges.basic), yqTax: num(charges.yqTax), yrTax: num(charges.yrTax),
    k3Tax: num(charges.k3Tax), ocTax: num(charges.ocTax), otherTax: num(charges.otherTax),
    processingCharges: num(charges.processingCharges), otherCharges: num(charges.otherCharges),
    markup: num(charges.markup),
  };
  const grossTotal = num(
    c.basic + c.yqTax + c.yrTax + c.k3Tax + c.ocTax + c.otherTax +
    c.processingCharges + c.otherCharges + c.markup
  );
  const discountAmount = num(footer.discountAmount);
  const tdsAmount = num(footer.tdsAmount);
  const govtTaxAmount = num(footer.govtTaxAmount);
  const tcsAmount = num(footer.tcsAmount);
  const netInvoiceAmount = num(grossTotal - discountAmount - tdsAmount - tcsAmount + govtTaxAmount);
  return { charges: c, grossTotal, discountAmount, tdsAmount, govtTaxAmount, tcsAmount, netInvoiceAmount };
};

// GET /api/invoices/:orderId  -> order + party (works for retail/b2b/society)
export const getForInvoice = async (req, res) => {
  const data = await loadInvoiceData(req.params.orderId);
  if (!data) return res.status(404).json({ message: 'Order not found' });
  res.json({ order: data.order, party: data.party });
};

// POST /api/invoices/:orderId/generate
// Body: { charges:{...}, discountAmount, tdsAmount, govtTaxAmount, tcsAmount, invoiceDate, invoiceNotes }
// Saves the charge heads, computes totals, assigns the service-prefixed number.
export const generateInvoiceNo = async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const t = computeInvoiceTotals(req.body.charges || {}, req.body);

  order.invoiceCharges = t.charges;
  order.grossTotal = t.grossTotal;
  order.discountAmount = t.discountAmount;
  order.tdsAmount = t.tdsAmount;
  order.govtTaxAmount = t.govtTaxAmount;
  order.tcsAmount = t.tcsAmount;
  order.netInvoiceAmount = t.netInvoiceAmount;
  order.totalAmount = t.netInvoiceAmount;       // keep legacy total in sync for lists/portal
  order.invoiceGenerated = true;
  if (req.body.invoiceNotes !== undefined) order.invoiceNotes = req.body.invoiceNotes;
  if (req.body.invoiceDate) order.invoiceDate = new Date(req.body.invoiceDate);

  await ensureInvoiceNo(order);                 // assigns number + saves

  res.json({
    invoiceNo: order.invoiceNo,
    invoiceDate: order.invoiceDate,
    grossTotal: order.grossTotal,
    netInvoiceAmount: order.netInvoiceAmount,
  });
};
