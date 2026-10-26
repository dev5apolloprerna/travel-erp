import PDFDocument from 'pdfkit';

const dt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const money = (cur, n) => `${cur || ''} ${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();

/**
 * Build a website-booking bill/receipt PDF and stream it into `stream` (the HTTP response).
 * @param {object} opts { booking, settings }
 */
export const buildBookingBillPdf = ({ booking, settings = {} }, stream) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);

  const BRAND = '#4583fe';
  const INK = '#15223b';
  const MUTED = '#66748f';
  const cur = booking.currency || 'INR';
  const left = 40;
  const rightX = 320;

  // Header
  doc.fillColor(BRAND).fontSize(18).font('Helvetica-Bold')
    .text(settings.companyName || '360 Travel Concierge', left, 45);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  const addr = [settings.companyAddress, settings.companyEmail, settings.companyPhone].filter(Boolean).join('  |  ');
  if (addr) doc.text(addr, left, 68);

  doc.fillColor(INK).fontSize(14).font('Helvetica-Bold').text('BOOKING BILL', rightX, 45, { align: 'right', width: 235 });
  doc.fillColor(MUTED).fontSize(10).font('Helvetica')
    .text(`Booking No: ${booking.bookingNo || '-'}`, rightX, 66, { align: 'right', width: 235 })
    .text(`Date: ${dt(booking.createdAt)}`, rightX, 80, { align: 'right', width: 235 });

  doc.moveTo(left, 100).lineTo(555, 100).strokeColor('#e5e9f0').stroke();

  // Customer
  let y = 115;
  doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('BILLED TO', left, y);
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(booking.customerName || '-', left, y + 14);
  doc.fillColor(MUTED).fontSize(9).font('Helvetica');
  const custLines = [
    booking.customerEmail, booking.customerMobile,
    [booking.address, booking.city, booking.state, booking.country].filter(Boolean).join(', '),
  ].filter(Boolean);
  custLines.forEach((l, i) => doc.text(l, left, y + 30 + i * 13));

  // Trip
  doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('TRIP', rightX, y);
  doc.fillColor(INK).fontSize(11).font('Helvetica-Bold').text(booking.packageName || '-', rightX, y + 14, { width: 235 });
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
    .text(`Travel date: ${dt(booking.travelDate)}`, rightX, y + 32, { width: 235 })
    .text(`Travellers: ${booking.adults || 0} adult(s), ${booking.children || 0} child(ren)`, rightX, y + 45, { width: 235 });

  // Amounts
  y = 215;
  doc.moveTo(left, y).lineTo(555, y).strokeColor('#e5e9f0').stroke();
  y += 14;
  const row = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(bold ? INK : MUTED).fontSize(bold ? 12 : 10);
    doc.text(label, left, y, { width: 360 });
    doc.text(value, left, y, { width: 515, align: 'right' });
    y += bold ? 22 : 18;
  };
  row('Price per person', money(cur, booking.pricePerPerson));
  row('Sub total', money(cur, booking.subTotal));
  row(`GST (${booking.gstPercent || 0}%)`, money(cur, booking.gstAmount));
  doc.moveTo(left, y + 2).lineTo(555, y + 2).strokeColor('#e5e9f0').stroke();
  y += 10;
  row('TOTAL', money(cur, booking.totalAmount), true);

  // Payment
  y += 8;
  doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold').text('PAYMENT', left, y);
  y += 14;
  doc.font('Helvetica').fontSize(10).fillColor(INK)
    .text(`Status: ${booking.paymentStatus || '-'}`, left, y)
    .text(`Gateway: ${booking.gateway || '-'}`, left, y + 14)
    .text(`Gateway payment id: ${booking.gatewayPaymentId || '-'}`, left, y + 28);
  if (booking.status === 'CANCELLED') {
    doc.fillColor('#c0392b').font('Helvetica-Bold').text(`CANCELLED${booking.cancelReason ? ` — ${booking.cancelReason}` : ''}`, left, y + 46, { width: 515 });
  }

  doc.fillColor(MUTED).fontSize(8).font('Helvetica')
    .text('This is a system-generated bill for your website booking.', left, 780, { align: 'center', width: 515 });

  doc.end();
};
