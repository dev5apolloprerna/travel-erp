import PDFDocument from 'pdfkit';

// =============================================================================
//  Generic tabular report PDF (v63 layout engine).
// -----------------------------------------------------------------------------
//  Renders any normalized report result ({ title, subtitle, columns, rows,
//  totals, grouping }) — and several back-to-back for bulk export.
//
//  v63 fixes (layout only — no data/logic/column changes):
//   - Column widths are computed from ACTUAL content (header + values + totals)
//     so numbers and identifiers never wrap.
//   - Orientation is chosen per report: portrait by default, landscape only when
//     the columns genuinely can't fit portrait (wide financial tables). Numeric
//     columns are protected at their natural width; only long text is ellipsised.
//   - Proper pagination with repeated column headers, group headers kept with at
//     least one row, and page-number footers drawn on existing pages (which also
//     removes the stray blank trailing page).
// =============================================================================

const BRAND = '#4583fe';
const INK = '#15223b';
const MUTED = '#66748f';
const LINE = '#e5e9f0';
const STRIPE = '#f6f8fc';
const GROUP_BG = '#eef3ff';
const SUBTOTAL_BG = '#eef2f7';
const TOTAL_BG = '#dbe6ff';

const MARGIN = 36;
const DATA_SIZE = 8;
const HEAD_SIZE = 8;
const ROW_H = 15;         // data row height
const SUM_H = 17;         // header / subtotal / total row height
const PAD = 10;           // total horizontal cell padding (5 each side)
const MIN_W = 26;         // minimum column width
const MAX_TEXT_W = 150;   // cap for a single text column
const TEXT_FLOOR = 34;    // text column floor when shrinking a very wide table
const FOOTER_RESERVE = 26;

// A4 dimensions (points) and usable widths per orientation.
const A4 = { w: 595.28, h: 841.89 };
const usableFor = (layout) => (layout === 'landscape' ? A4.h : A4.w) - MARGIN * 2;

const dt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');
const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numfmt = (n) => (Number(n) || 0).toLocaleString('en-IN');
const isNumeric = (t) => t === 'money' || t === 'number';

const fmtCell = (val, type) => {
  if (val === null || val === undefined || val === '') return type === 'money' ? '0.00' : '';
  switch (type) {
    case 'money': return money(val);
    case 'number': return numfmt(val);
    case 'date': return dt(val);
    default: return String(val);
  }
};

const measure = (doc, str, font, size) => { doc.font(font).fontSize(size); return doc.widthOfString(String(str ?? '')); };

// Truncate a string with an ellipsis so it fits `width` (text columns only).
const fitText = (doc, str, width, font, size) => {
  doc.font(font).fontSize(size);
  let s = String(str ?? '');
  if (doc.widthOfString(s) <= width) return s;
  while (s.length && doc.widthOfString(`${s}…`) > width) s = s.slice(0, -1);
  return s ? `${s}…` : '';
};

// Widest single word of a header (so a column can be as narrow as its longest
// word and let the header wrap onto two lines instead of being clipped).
const widestWord = (md, label) => {
  const words = String(label || '').split(/\s+/).filter(Boolean);
  return words.reduce((m, w) => Math.max(m, measure(md, w, 'Helvetica-Bold', HEAD_SIZE)), 0);
};

/**
 * Decide orientation + per-column widths from real content.
 * `md` is a dedicated measuring document (never piped) so width calculations
 * done before the real page exists don't make PDFKit emit a stray default page.
 *
 * Headers may wrap onto two lines, so a column only needs to be as wide as its
 * content (values) or its widest header word — never the full header string.
 * Numeric values are never truncated; long free text is ellipsised.
 * Returns { layout, widths, dataSize, headerLines }.
 */
function planColumns(md, columns, rows, totals) {
  const sample = rows.slice(0, 600);
  const grandLabel = measure(md, 'GRAND TOTAL', 'Helvetica-Bold', DATA_SIZE) + PAD;

  const meta = columns.map((c, i) => {
    const isText = !isNumeric(c.type) && c.type !== 'date';
    let valueW = 0;
    for (const r of sample) valueW = Math.max(valueW, measure(md, fmtCell(r[c.key], c.type), 'Helvetica', DATA_SIZE));
    if (totals && totals[c.key] !== undefined) valueW = Math.max(valueW, measure(md, fmtCell(totals[c.key], c.type), 'Helvetica-Bold', DATA_SIZE));
    const fullHeader = measure(md, c.label, 'Helvetica-Bold', HEAD_SIZE);
    const wordW = widestWord(md, c.label);
    // Content the column must show without clipping: its values, plus the widest
    // header word (header can wrap). Long text is cap-truncated instead of widened.
    let contentW = Math.max(valueW, wordW);
    if (isText) contentW = Math.max(Math.min(valueW, MAX_TEXT_W), wordW);
    let natural = Math.ceil(contentW) + PAD;
    if (i === 0) natural = Math.max(natural, grandLabel);     // keep "GRAND TOTAL"/"Subtotal" whole
    natural = Math.max(natural, MIN_W);
    // Floor a column may shrink to: never below its widest header word (+pad).
    const floor = Math.max(MIN_W, Math.ceil(wordW) + 6, i === 0 ? grandLabel : 0);
    return { isText, natural, floor, fullHeader };
  });

  const natural = meta.map((m) => m.natural);
  const total = natural.reduce((a, b) => a + b, 0);
  const layout = total <= usableFor('portrait') ? 'portrait' : 'landscape';
  const usable = usableFor(layout);

  let widths = [...natural];
  const textIdx = columns.map((c, i) => (meta[i].isText ? i : -1)).filter((i) => i >= 0);

  if (total <= usable) {
    // Distribute slack to text columns so the table fills the page.
    const slack = usable - total;
    const pool = textIdx.length ? textIdx : columns.map((_, i) => i);
    const base = pool.reduce((a, i) => a + widths[i], 0) || 1;
    pool.forEach((i) => { widths[i] += slack * (widths[i] / base); });
  } else {
    // Too wide: shrink text columns toward their floors (keep header words +
    // numbers intact); only the longest free text gets ellipsised at draw time.
    const overflow = total - usable;
    const shrinkable = textIdx.reduce((a, i) => a + Math.max(0, widths[i] - meta[i].floor), 0);
    if (shrinkable > 0) {
      const factor = Math.min(1, overflow / shrinkable);
      textIdx.forEach((i) => { widths[i] -= Math.max(0, widths[i] - meta[i].floor) * factor; });
    }
    // If still over (extremely wide report), uniformly scale as a last resort.
    const t2 = widths.reduce((a, b) => a + b, 0);
    if (t2 > usable) { const f = usable / t2; widths = widths.map((w) => w * f); }
  }

  // How many header lines are needed: 2 if any header can't fit its column on one
  // line (after final widths), else 1.
  const headerLines = widths.some((w, i) => meta[i].fullHeader > w - 6) ? 2 : 1;
  return { layout, widths, dataSize: DATA_SIZE, headerLines };
}

/** Render one report, starting on its own page with the chosen orientation. */
function renderReport(doc, md, result, { from, to, settings = {}, bulkTitle = null }) {
  const { title, subtitle, columns = [], rows = [], totals = {}, grouping = null } = result;

  // Measure on the throwaway doc first (so no stray page is created on `doc`).
  const { layout, widths, dataSize, headerLines } = planColumns(md, columns, rows, totals);
  const HEAD_H = headerLines === 2 ? 26 : SUM_H;   // taller header row when wrapping to 2 lines
  doc.addPage({ size: 'A4', layout, margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });

  const pageW = doc.page.width;
  const LEFT = MARGIN;
  const RIGHT = pageW - MARGIN;
  const USABLE = RIGHT - LEFT;
  const BOTTOM = doc.page.height - MARGIN - FOOTER_RESERVE;

  // Scale widths to exactly fill USABLE (guards against rounding).
  const wsum = widths.reduce((a, b) => a + b, 0);
  const W = widths.map((w) => (w / wsum) * USABLE);
  const xs = []; let acc = LEFT;
  for (let i = 0; i < W.length; i += 1) { xs.push(acc); acc += W[i]; }

  const sumKeys = columns.filter((c) => isNumeric(c.type)).map((c) => c.key);
  const subtotalOf = (gr) => { const t = {}; for (const k of sumKeys) t[k] = gr.reduce((a, r) => a + (Number(r[k]) || 0), 0); return t; };

  // ---- document / report heading (first page of this report) ----
  if (bulkTitle) {
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(bulkTitle, LEFT, doc.y, { width: USABLE });
    doc.moveDown(0.4);
  }
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(15).text(settings.companyName || '360 Travel Concierge', LEFT, doc.y, { width: USABLE });
  const addr = [settings.companyAddress, settings.companyEmail, settings.companyPhone].filter(Boolean).join('   |   ');
  if (addr) doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(addr, LEFT, doc.y + 1, { width: USABLE });
  doc.moveDown(0.3);
  const lineY = doc.y;
  doc.moveTo(LEFT, lineY).lineTo(RIGHT, lineY).strokeColor(LINE).lineWidth(1).stroke();
  doc.y = lineY + 8;

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(title || 'Report', LEFT, doc.y, { width: USABLE });
  if (subtitle) doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(subtitle, LEFT, doc.y + 1, { width: USABLE });
  const range = (from || to) ? `Period: ${from ? dt(from) : 'start'} to ${to ? dt(to) : 'today'}` : 'Period: all dates';
  doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(`${range}      ·      Records: ${rows.length}`, LEFT, doc.y + 2, { width: USABLE });
  doc.y += 6;

  if (!columns.length) return;

  // ---- table primitives ----
  const align = (c) => (c.align === 'right' ? 'right' : 'left');
  const drawHeader = () => {
    const y = doc.y;
    doc.rect(LEFT, y, USABLE, HEAD_H).fill(BRAND);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(HEAD_SIZE);
    const vPad = headerLines === 2 ? 3 : 5;
    columns.forEach((c, i) => {
      // Headers wrap (never truncate) within their column, up to two lines.
      doc.text(c.label, xs[i] + 3, y + vPad, { width: W[i] - 6, align: align(c), lineBreak: true, height: HEAD_H - 4, ellipsis: false });
    });
    doc.y = y + HEAD_H;
  };

  const newPage = () => {
    doc.addPage({ size: 'A4', layout, margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(8).text(`${title || 'Report'} (continued)`, LEFT, doc.y, { width: USABLE });
    doc.y += 4;
    drawHeader();
  };
  const ensure = (need) => { if (doc.y + need > BOTTOM) newPage(); };

  const drawDataRow = (r, striped) => {
    ensure(ROW_H);
    const y = doc.y;
    if (striped) doc.rect(LEFT, y, USABLE, ROW_H).fill(STRIPE);
    doc.fillColor(INK).font('Helvetica').fontSize(dataSize);
    columns.forEach((c, i) => {
      const raw = fmtCell(r[c.key], c.type);
      const txt = isNumeric(c.type) || c.type === 'date' ? raw : fitText(doc, raw, W[i] - 6, 'Helvetica', dataSize);
      doc.text(txt, xs[i] + 3, y + 4, { width: W[i] - 6, align: align(c), lineBreak: false });
    });
    doc.y = y + ROW_H;
  };

  const drawSpanRow = (label, bg) => {
    ensure(SUM_H);
    const y = doc.y;
    doc.rect(LEFT, y, USABLE, SUM_H).fill(bg);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(dataSize)
      .text(fitText(doc, label, USABLE - 8, 'Helvetica-Bold', dataSize), LEFT + 4, y + 5, { width: USABLE - 8, lineBreak: false });
    doc.y = y + SUM_H;
  };

  const drawSummaryRow = (label, values, bg) => {
    ensure(SUM_H);
    const y = doc.y;
    doc.rect(LEFT, y, USABLE, SUM_H).fill(bg);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(dataSize);
    columns.forEach((c, i) => {
      let txt = '';
      if (i === 0) txt = label;
      else if (values && values[c.key] !== undefined) txt = fmtCell(values[c.key], c.type === 'status' ? 'text' : c.type);
      if (txt) {
        const t = i === 0 ? fitText(doc, txt, W[i] - 6, 'Helvetica-Bold', dataSize) : txt;
        doc.text(t, xs[i] + 3, y + 5, { width: W[i] - 6, align: align(c), lineBreak: false });
      }
    });
    doc.y = y + SUM_H;
  };

  drawHeader();

  if (grouping && rows.length) {
    const map = new Map();
    for (const r of rows) { const k = r[grouping.key] ?? '—'; if (!map.has(k)) map.set(k, []); map.get(k).push(r); }
    for (const [label, gr] of map.entries()) {
      // Keep a group header with at least its first row (and the subtotal nearby).
      if (doc.y + SUM_H + ROW_H > BOTTOM) newPage();
      drawSpanRow(`${grouping.label}: ${label}`, GROUP_BG);
      gr.forEach((r, idx) => drawDataRow(r, idx % 2 === 1));
      drawSummaryRow('Subtotal', subtotalOf(gr), SUBTOTAL_BG);
    }
  } else {
    rows.forEach((r, idx) => drawDataRow(r, idx % 2 === 1));
    if (!rows.length) drawSpanRow('No records for this period.', STRIPE);
  }

  if (Object.keys(totals || {}).length) drawSummaryRow(grouping ? 'GRAND TOTAL' : 'TOTAL', totals, TOTAL_BG);
}

/** Page-number + generated-on footers, drawn on already-created pages. */
function addFooters(doc) {
  const stamp = `Generated ${new Date().toLocaleString('en-IN')}`;
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const pw = doc.page.width; const ph = doc.page.height;
    // Sit inside the reserved footer band so `y + lineHeight` never crosses the
    // bottom margin (which would make PDFKit append a stray blank page).
    const y = ph - MARGIN - 11;
    doc.fillColor(MUTED).font('Helvetica').fontSize(7);
    doc.text(stamp, MARGIN, y, { lineBreak: false, height: 9 });
    doc.text(`Page ${i + 1} of ${range.start + range.count}`, pw - MARGIN - 160, y, { width: 160, align: 'right', lineBreak: false, height: 9 });
  }
}

/**
 * Build a report PDF (single report, or several for bulk) into `stream`.
 * @param {object} opts { reports:[{result, from, to}], settings, title }
 */
export const buildReportPdf = ({ reports = [], settings = {}, title }, stream) => {
  const doc = new PDFDocument({ autoFirstPage: false, bufferPages: true, margin: MARGIN });
  doc.pipe(stream);
  // Dedicated measuring doc (never piped / never ended into the stream).
  const md = new PDFDocument({ margin: MARGIN });

  if (!reports.length) {
    doc.addPage({ size: 'A4', margin: MARGIN }).fillColor(INK).fontSize(12).text('No report data.', MARGIN, MARGIN);
  } else {
    reports.forEach((rep, i) => renderReport(doc, md, rep.result, { ...rep, settings, bulkTitle: i === 0 ? title : null }));
  }

  addFooters(doc);
  doc.end();
};
