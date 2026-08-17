import { MASTERS } from './masterDefs.js';
import { modelForMaster } from './MasterRecord.js';

const defOr404 = (key, res) => {
  const def = MASTERS[key];
  if (!def) { res.status(404).json({ message: `Unknown master: ${key}` }); return null; }
  return def;
};

// Keep only the fields defined for this master (plus nothing else) — safety against junk.
const pickFields = (def, body) => {
  const out = {};
  for (const f of def.fields) {
    if (body[f.key] === undefined) continue;
    let v = body[f.key];
    if (f.type === 'number') v = v === '' || v === null ? null : Number(v);
    if (f.type === 'boolean') v = !!v;
    out[f.key] = v;
  }
  return out;
};

// GET /api/owner/masters  -> the menu of available masters
export const catalog = (req, res) => {
  res.json(Object.values(MASTERS).map((m) => ({
    key: m.key, label: m.label, menu: m.menu, table: m.table,
  })));
};

// GET /api/owner/masters/:key/def  -> field definitions for the generic UI
export const definition = (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  res.json({
    key: def.key, label: def.label, menu: def.menu, table: def.table,
    listColumns: def.listColumns, fields: def.fields,
  });
};

// GET /api/owner/masters/:key  -> list records
export const list = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const Model = modelForMaster(def.key);
  const filter = {};
  if (req.query.search && def.titleField) {
    filter[def.titleField] = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const rows = await Model.find(filter).sort({ createdAt: -1 }).limit(Number(req.query.limit) || 500).lean();
  res.json(rows);
};

// GET /api/owner/masters/:key/:id  -> one record (for the edit page)
export const getOne = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const row = await modelForMaster(def.key).findById(req.params.id).lean();
  if (!row) return res.status(404).json({ message: 'Record not found' });
  res.json(row);
};

// GET /api/owner/masters/:key/options  -> {value,label}[] for foreign-key dropdowns
export const options = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const rows = await modelForMaster(def.key).find().sort({ createdAt: -1 }).lean();
  const labelField = def.titleField || 'name';
  res.json(rows.map((r) => ({ value: r._id, label: r[labelField] ?? String(r._id) })));
};

// POST /api/owner/masters/:key
export const create = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const doc = await modelForMaster(def.key).create(pickFields(def, req.body));
  res.status(201).json(doc);
};

// PUT /api/owner/masters/:key/:id
export const update = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const row = await modelForMaster(def.key).findByIdAndUpdate(
    req.params.id, pickFields(def, req.body), { new: true }
  );
  if (!row) return res.status(404).json({ message: 'Record not found' });
  res.json(row);
};

// DELETE /api/owner/masters/:key/:id
export const remove = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  await modelForMaster(def.key).findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
};
