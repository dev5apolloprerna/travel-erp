import PDFDocument from 'pdfkit';
import { SERVICE_CHARGES } from '../invoiceCalc.js';

const money = (n) => 'Rs. ' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

/**
 * Build the invoice PDF and stream it into `stream` (an HTTP response or a buffer collector).
 * @param {object} opts { order, settings, party }  party = customer or company
 */
export const buildInvoicePdf = ({ order, settings, party }, stream) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);

  const BRAND = '#4583fe';
  const INK = '#15223b';
  const MUTED = '#66748f';
  const pageW = doc.page.width - 80; // usable width

  // ---------- Header ----------
  doc.fillColor(BRAND).fontSize(18).font('Helvetica-Bold')
    .text(settings.companyName || '360 Travel Concierge Pvt Ltd', 40, 45);

  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  const addr = [
    settings.addressLine1, settings.addressLine2,
    [settings.city, settings.state, settings.pincode].filter(Boolean).join(', '),
    settings.phone ? `Phone: ${settings.phone}` : '',
    settings.email ? `Email: ${settings.email}` : '',
    settings.gstNumber ? `GSTIN: ${settings.gstNumber}` : '',
  ].filter(Boolean);
  doc.text(addr.join('\n'), 40, 68, { width: 300 });

  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold')
    .text('TAX INVOICE', 350, 45, { width: pageW - 310, align: 'right' });
  doc.fontSize(9).font('Helvetica').fillColor(MUTED)
    .text(`Invoice No: ${order.invoiceNo || '-'}`, 350, 70, { width: pageW - 310, align: 'right' })
    .text(`Invoice Date: ${dt(order.invoiceDate || order.createdAt)}`, { width: pageW - 310, align: 'right' })
    .text(`Order No: ${order.orderNo || '-'}`, { width: pageW - 310, align: 'right' })
    .text(`Type: ${order.invoiceType || 'DOMESTIC'}`, { width: pageW - 310, align: 'right' });

  doc.moveTo(40, 140).lineTo(40 + pageW, 140).strokeColor('#e2e8f2').stroke();

  // ---------- Bill To ----------
  let y = 155;
  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text('Bill To', 40, y);
  doc.fontSize(9).font('Helvetica').fillColor(MUTED);
  const partyLines = [
    party?.name || '-',
    party?.billingAddress || party?.address || '',
    [party?.city, party?.state].filter(Boolean).join(', '),
    party?.mobile || party?.contactNumber ? `Phone: ${party.mobile || party.contactNumber}` : '',
    party?.email ? `Email: ${party.email}` : '',
    party?.gstNumber || party?.gst ? `GSTIN: ${party.gstNumber || party.gst}` : '',
  ].filter(Boolean);
  doc.text(partyLines.join('\n'), 40, y + 15, { width: 260 });

  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text('Place of Supply', 320, y);
  doc.fontSize(9).font('Helvetica').fillColor(MUTED)
    .text(order.placeOfSupply || party?.state || '-', 320, y + 15, { width: 200 });

  // ---------- Booking reference + charges ----------
  y = 250;
  const line = (order.services || [])[0] || {};
  const detailBits = [
    line.serviceType || 'SERVICE',
    line.airline || line.hotelName || line.train || '',
    line.sectorFrom && line.sectorTo ? `${line.sectorFrom} - ${line.sectorTo}` : '',
    line.ticketNo ? `Ticket: ${line.ticketNo}` : '',
    line.airlinePnr || line.railwayPnr ? `PNR: ${line.airlinePnr || line.railwayPnr}` : '',
    line.travelDate ? dt(line.travelDate) : '',
  ].filter(Boolean).join('  |  ');
  doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text('Service', 40, y);
  doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(detailBits, 40, y + 15, { width: pageW });

  // Charge heads table — service-wise. For Hotel, list per-room rows; otherwise the
  // stored charge heads with their service labels.
  y += 45;
  const svc = (order.serviceCalcType || order.services?.[0]?.serviceType || 'FLIGHT').toUpperCase();
  const def = SERVICE_CHARGES[svc] || SERVICE_CHARGES.FLIGHT;
  let chargeRows;
  if (svc === 'HOTEL') {
    chargeRows = (order.invoiceRooms || []).map((r, i) => [
      `${r.roomType || 'Room'} (${Number(r.roomCount || r.rooms) || 0} × ${money(r.rate)}, ${Number(r.taxPercent) || 0}%)`,
      r.roomTotal,
    ]);
  } else {
    const ch = order.invoiceCharges || {};
    const keys = (def.charges || []).concat(def.markups || []);
    chargeRows = keys.map((k) => [def.labels[k] || k, ch[k]]).filter(([, v]) => Number(v) > 0);
  }

  doc.rect(40, y, pageW, 20).fill('#f4f7fc');
  doc.fillColor(INK).fontSize(8).font('Helvetica-Bold');
  doc.text('Charge', 46, y + 6);
  doc.text('Amount', 40 + pageW - 120, y + 6, { width: 110, align: 'right' });
  y += 22;

  doc.font('Helvetica').fontSize(9).fillColor(INK);
  chargeRows.forEach(([label, val]) => {
    if (y > 690) { doc.addPage(); y = 50; }
    doc.fillColor(MUTED).text(label, 46, y);
    doc.fillColor(INK).text(money(val), 40 + pageW - 120, y, { width: 110, align: 'right' });
    y += 15;
    doc.moveTo(40, y - 3).lineTo(40 + pageW, y - 3).strokeColor('#eef2f8').stroke();
  });

  // ---------- Totals footer (Gross - Discount - TDS - TCS + Govt Tax = Net) ----------
  y += 10;
  if (y > 620) { doc.addPage(); y = 50; }
  const labelX = 320, valX = 460, valW = 95;
  const row = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? INK : MUTED);
    doc.text(label, labelX, y, { width: 130, align: 'right' });
    doc.fillColor(INK).text(value, valX, y, { width: valW, align: 'right' });
    y += 15;
  };

  row('Gross Total', money(order.grossTotal), true);
  if (order.discountAmount) row('Discount', `- ${money(order.discountAmount)}`);
  if (order.tdsAmount) row('TDS', `- ${money(order.tdsAmount)}`);
  if (order.tcsAmount) row('TCS', `- ${money(order.tcsAmount)}`);
  if (order.govtTaxAmount) row('Govt Tax', `+ ${money(order.govtTaxAmount)}`);
  doc.moveTo(labelX, y).lineTo(40 + pageW, y).strokeColor('#e2e8f2').stroke();
  y += 6;
  row('Net Invoice Amount', money(order.netInvoiceAmount), true);

  if (order.module === 'RETAIL' && order.paidAmount) {
    row('Paid', money(order.paidAmount));
    row('Balance Due', money((order.netInvoiceAmount || 0) - (order.paidAmount || 0)), true);
  }

  // ---------- Bank + footer ----------
  y += 15;
  if (settings.bankName) {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9).text('Bank Details', 40, y);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
      [
        `Bank: ${settings.bankName}`,
        settings.bankAccount ? `A/C: ${settings.bankAccount}` : '',
        settings.bankIfsc ? `IFSC: ${settings.bankIfsc}` : '',
      ].filter(Boolean).join('\n'),
      40, y + 14, { width: 250 }
    );
  }

  doc.fontSize(7).fillColor(MUTED).text(
    'This is a computer generated invoice and does not require a signature.',
    40, 780, { width: pageW, align: 'center' }
  );

  doc.end();
  return doc;
};

/** Render the invoice into a Buffer (for emailing as an attachment). */
export const invoiceToBuffer = (opts) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const collector = {
      write: (c) => chunks.push(c),
      end: () => resolve(Buffer.concat(chunks)),
      on: () => {},
      once: () => {},
      emit: () => {},
    };
    try { buildInvoicePdf(opts, collector); } catch (e) { reject(e); }
  });
