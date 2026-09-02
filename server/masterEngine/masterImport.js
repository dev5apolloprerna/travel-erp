import * as XLSX from 'xlsx';
import './masterOverrides.js';
import { MASTERS } from './masterDefs.js';
import { modelForMaster } from './MasterRecord.js';

const defOr404 = (key, res) => {
  const def = MASTERS[key];
  if (!def) { res.status(404).json({ message: `Unknown master: ${key}` }); return null; }
  return def;
};

// Columns a user fills in an import: every editable field (skip images), labelled by field label.
const importable = (def) => def.fields.filter((f) => f.type !== 'image');

// GET /api/owner/masters/:key/sample  -> a per-master .xlsx with the correct headers (#11)
export const sampleExcel = (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const cols = importable(def);
  const headers = cols.map((f) => f.label);
  // one example row hint per type
  const example = cols.map((f) => {
    if (f.type === 'number') return 0;
    if (f.type === 'boolean') return 'Yes';
    if (f.type === 'date') return '2026-01-31';
    if (f.type === 'enum') return (f.options && f.options[0]) || '';
    if (f.type === 'ref') return `<${f.label} name>`;
    return `Sample ${f.label}`;
  });
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.label.slice(0, 28) || 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${def.key}-sample.xlsx"`);
  res.send(buf);
};

// POST /api/owner/masters/:key/import  (multipart file) -> parse + insert rows (#11)
export const importExcel = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  let rows;
  try {
    const workbook = req.file.buffer ? XLSX.read(req.file.buffer, { type: 'buffer' }) : XLSX.readFile(req.file.path);
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  } catch (e) {
    return res.status(400).json({ message: 'Could not read the Excel file. Use the sample format.' });
  }
  if (!rows.length) return res.status(400).json({ message: 'The file has no data rows.' });

  const cols = importable(def);
  const labelToField = Object.fromEntries(cols.map((f) => [f.label.toLowerCase(), f]));
  // Pre-load ref maps (name -> id) so import can accept names for FK columns.
  const refMaps = {};
  for (const f of cols.filter((x) => x.type === 'ref' && x.ref)) {
    const rd = MASTERS[f.ref];
    if (!rd) continue;
    const rr = await modelForMaster(rd.key).find().lean();
    const nf = rd.titleField || 'name';
    refMaps[f.key] = Object.fromEntries(rr.map((x) => [String(x[nf]).toLowerCase(), x._id]));
  }

  const Model = modelForMaster(def.key);
  let inserted = 0; const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const doc = {}; let rowErr = null;
    for (const [label, val] of Object.entries(raw)) {
      const f = labelToField[String(label).trim().toLowerCase()];
      if (!f) continue;
      let v = val;
      if (v === '' || v === null || v === undefined) { if (f.required) rowErr = `Row ${i + 2}: ${f.label} is required`; continue; }
      if (f.type === 'number') v = Number(v) || 0;
      else if (f.type === 'boolean') v = /^(yes|true|1)$/i.test(String(v));
      else if (f.type === 'ref') {
        const id = refMaps[f.key]?.[String(v).trim().toLowerCase()];
        if (!id) { rowErr = `Row ${i + 2}: ${f.label} "${v}" not found`; continue; }
        v = id;
      } else v = String(v).trim();
      doc[f.key] = v;
    }
    if (rowErr) { errors.push(rowErr); continue; }
    try { await Model.create(doc); inserted++; }
    catch (e) { errors.push(`Row ${i + 2}: ${e.message}`); }
  }
  res.json({ inserted, failed: errors.length, errors: errors.slice(0, 20), total: rows.length });
};
