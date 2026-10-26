import PDFDocument from 'pdfkit';

// Generic tabular report PDF (v60). Renders any normalized report result
// ({ title, subtitle, columns, rows, totals }) — and, for bulk export, several
// reports back-to-back in one PDF. Shares the house style of the other ERP PDFs.

const BRAND = '#4583fe';
const INK = '#15223b';
const MUTED = '#66748f';
const LINE = '#e5e9f0';

const dt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numfmt = (n) => (Number(n) || 0).toLocaleString('en-IN');

const fmtCell = (val, type) => {
  if (val === null || val === undefined || val === '') return type === 'money' ? '0.00' : '';
  switch (type) {
    case 'money': return money(val);
    case 'number': return numfmt(val);
    case 'date': return dt(val);
    default: return String(val);
  }
};

const PAGE = { size: 'A4', margin: 36 };
const LEFT = 36;
const RIGHT = 559;      // A4 width 595 - margin
const USABLE = RIGHT - LEFT;

/** Draw one report onto an existing doc, starting at the current y. */
function renderReport(doc, result, { from, to, settings = {} }) {
  const { title, subtitle, columns = [], rows = [], totals = {}, grouping = null } = result;
  const sumKeys = columns.filter((c) => c.type === 'money' || c.type === 'number').map((c) => c.key);
  const subtotalOf = (gr) => { const t = {}; for (const k of sumKeys) t[k] = gr.reduce((a, r) => a + (Number(r[k]) || 0), 0); return t; };

  // Report title band
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(title || 'Report', LEFT, doc.y, { width: USABLE });
  if (subtitle) doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(subtitle, LEFT, doc.y + 1, { width: USABLE });
  const range = (from || to) ? `Period: ${from ? dt(from) : 'start'} to ${to ? dt(to) : 'today'}` : 'Period: all dates';
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`${range}    ·    Rows: ${rows.length}`, LEFT, doc.y + 2, { width: USABLE });
  doc.moveDown(0.5);

  if (!columns.length) { doc.moveDown(1); return; }

  // Column widths: give the first (usually text) column extra room, numeric
  // columns a fixed share, remaining text columns the rest.
  const n = columns.length;
  const weights = columns.map((c, i) => {
    if (c.type === 'money' || c.type === 'number' || c.type === 'date' || c.type === 'status') return 1;
    return i === 0 ? 2.4 : 1.8;
  });
  const wsum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / wsum) * USABLE);
  const xs = []; let acc = LEFT;
  for (let i = 0; i < n; i += 1) { xs.push(acc); acc += widths[i]; }

  const rowHeight = 16;
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(LEFT, y, USABLE, rowHeight + 2).fill(BRAND);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    columns.forEach((c, i) => {
      doc.text(c.label, xs[i] + 3, y + 4, { width: widths[i] - 6, align: c.align === 'right' ? 'right' : 'left', lineBreak: false });
    });
    doc.y = y + rowHeight + 2;
  };

  const ensureSpace = (needed = rowHeight) => {
    if (doc.y + needed > 800) { doc.addPage(); drawHeader(); }
  };

  drawHeader();

  const drawDataRow = (r, striped) => {
    ensureSpace();
    const y = doc.y;
    if (striped) doc.rect(LEFT, y, USABLE, rowHeight).fill('#f6f8fc');
    doc.fillColor(INK).font('Helvetica').fontSize(8);
    columns.forEach((c, i) => {
      doc.text(fmtCell(r[c.key], c.type), xs[i] + 3, y + 3, { width: widths[i] - 6, align: c.align === 'right' ? 'right' : 'left', lineBreak: false });
    });
    doc.y = y + rowHeight;
  };

  const drawSummaryRow = (label, values, fill) => {
    ensureSpace(rowHeight + 2);
    const y = doc.y;
    doc.rect(LEFT, y, USABLE, rowHeight + 2).fill(fill);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8);
    columns.forEach((c, i) => {
      let txt = '';
      if (i === 0) txt = label;
      else if (values && values[c.key] !== undefined) txt = fmtCell(values[c.key], c.type === 'status' ? 'text' : c.type);
      if (txt) doc.text(txt, xs[i] + 3, y + 4, { width: widths[i] - 6, align: c.align === 'right' ? 'right' : 'left', lineBreak: false });
    });
    doc.y = y + rowHeight + 2;
  };

  if (grouping && rows.length) {
    // Customer-wise sections, preserving first-seen order.
    const map = new Map();
    for (const r of rows) { const k = r[grouping.key] ?? '—'; if (!map.has(k)) map.set(k, []); map.get(k).push(r); }
    for (const [label, gr] of map.entries()) {
      drawSummaryRow(`${grouping.label}: ${label}`, null, '#eef3ff');
      gr.forEach((r, idx) => drawDataRow(r, idx % 2 === 1));
      drawSummaryRow('Subtotal', subtotalOf(gr), '#f6f8fc');
    }
  } else {
    rows.forEach((r, idx) => drawDataRow(r, idx % 2 === 1));
  }

  // Grand totals row
  if (Object.keys(totals || {}).length) drawSummaryRow(grouping ? 'GRAND TOTAL' : 'TOTAL', totals, '#dbe6ff');
  doc.moveDown(1.2);
}

function drawDocHeader(doc, settings) {
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(16).text(settings.companyName || '360 Travel Concierge', LEFT, 32);
  const addr = [settings.companyAddress, settings.companyEmail, settings.companyPhone].filter(Boolean).join('  |  ');
  if (addr) doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(addr, LEFT, 52, { width: USABLE });
  doc.moveTo(LEFT, 66).lineTo(RIGHT, 66).strokeColor(LINE).stroke();
  doc.y = 76;
}

/**
 * Build a report PDF (single report, or several for bulk) into `stream`.
 * @param {object} opts { reports:[{result, from, to}], settings, title }
 */
export const buildReportPdf = ({ reports = [], settings = {}, title }, stream) => {
  const doc = new PDFDocument(PAGE);
  doc.pipe(stream);

  drawDocHeader(doc, settings);
  if (title) { doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(title, LEFT, doc.y, { width: USABLE }); doc.moveDown(0.6); }

  reports.forEach((rep, i) => {
    if (i > 0 && doc.y > 700) doc.addPage();
    renderReport(doc, rep.result, { from: rep.from, to: rep.to, settings });
  });

  // Footer on last page
  doc.fillColor(MUTED).font('Helvetica').fontSize(7)
    .text(`Generated ${new Date().toLocaleString('en-IN')} — system report`, LEFT, 808, { align: 'center', width: USABLE });

  doc.end();
};
