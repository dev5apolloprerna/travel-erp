import './masterOverrides.js';            // apply v17 overrides (enums, Company FKs, Group parent)
import { MASTERS } from './masterDefs.js';
import { modelForMaster } from './MasterRecord.js';

const defOr404 = (key, res) => {
  const def = MASTERS[key];
  if (!def) { res.status(404).json({ message: `Unknown master: ${key}` }); return null; }
  return def;
};

// Coerce + keep only defined fields. Also runs required-field validation (#3).
const pickFields = (def, body) => {
  const out = {};
  const errors = [];
  for (const f of def.fields) {
    let v = body[f.key];
    if (v === undefined) {
      if (f.required) errors.push(`${f.label} is required`);
      continue;
    }
    if (f.type === 'number') v = v === '' || v === null ? null : Number(v);
    else if (f.type === 'boolean') v = !!v;
    else if (typeof v === 'string') v = v.trim();
    if (f.required && (v === '' || v === null || v === undefined)) errors.push(`${f.label} is required`);
    out[f.key] = v;
  }
  return { values: out, errors };
};

// Resolve foreign-key ids to their display names for listings (#2).
const resolveRefs = async (def, rows) => {
  const refFields = def.fields.filter((f) => f.type === 'ref' && f.ref);
  if (!refFields.length || !rows.length) return rows;
  // Build a lookup per referenced master: id -> name
  const maps = {};
  for (const f of refFields) {
    const refDef = MASTERS[f.ref];
    if (!refDef) continue;
    const ids = [...new Set(rows.map((r) => r[f.key]).filter(Boolean).map(String))];
    if (!ids.length) continue;
    const refRows = await modelForMaster(refDef.key).find({ _id: { $in: ids } }).lean();
    const nameField = refDef.titleField || 'name';
    maps[f.key] = Object.fromEntries(refRows.map((rr) => [String(rr._id), rr[nameField] ?? String(rr._id)]));
  }
  // Attach resolved display values under __display so listing shows names, not ids.
  return rows.map((r) => {
    const disp = {};
    for (const f of refFields) {
      const id = r[f.key];
      disp[f.key] = id ? (maps[f.key]?.[String(id)] ?? String(id)) : '';
    }
    return { ...r, __display: disp };
  });
};

// GET /api/owner/masters
export const catalog = (req, res) => {
  res.json(Object.values(MASTERS).map((m) => ({
    key: m.key, label: m.label, menu: m.menu, table: m.table,
  })));
};

// GET /api/owner/masters/:key/def
export const definition = (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  res.json({
    key: def.key, label: def.label, menu: def.menu, table: def.table, pk: def.pk,
    listColumns: def.listColumns, fields: def.fields,
  });
};

// GET /api/owner/masters/:key  -> paginated list with FK names resolved (#2, #9, #12)
export const list = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const Model = modelForMaster(def.key);
  const filter = {};
  if (req.query.search && def.titleField) {
    filter[def.titleField] = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 25));   // default 25/page
  const skip = (page - 1) * limit;

  const [total, rowsRaw] = await Promise.all([
    Model.countDocuments(filter),
    Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  const rows = await resolveRefs(def, rowsRaw);
  res.json({ rows, total, page, limit, pages: Math.ceil(total / limit) || 1, startIndex: skip });
};

// GET /api/owner/masters/:key/:id
export const getOne = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const row = await modelForMaster(def.key).findById(req.params.id).lean();
  if (!row) return res.status(404).json({ message: 'Record not found' });
  res.json(row);
};

// GET /api/owner/masters/:key/options  (?exclude=<id> for Group-parent self-exclusion #6)
export const options = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const filter = {};
  if (req.query.exclude) filter._id = { $ne: req.query.exclude };
  const rows = await modelForMaster(def.key).find(filter).sort({ createdAt: -1 }).lean();
  const labelField = def.titleField || 'name';
  res.json(rows.map((r) => ({ value: r._id, label: r[labelField] ?? String(r._id) })));
};

// POST /api/owner/masters/:key
export const create = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const { values, errors } = pickFields(def, req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  const doc = await modelForMaster(def.key).create(values);
  res.status(201).json(doc);
};

// PUT /api/owner/masters/:key/:id
export const update = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const { values, errors } = pickFields(def, req.body);
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  const row = await modelForMaster(def.key).findByIdAndUpdate(req.params.id, values, { new: true });
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

// POST /api/owner/masters/:key/bulk-delete  { ids: [...] }  -> multi-delete (#6)
export const bulkRemove = async (req, res) => {
  const def = defOr404(req.params.key, res);
  if (!def) return;
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ message: 'No records selected' });
  const result = await modelForMaster(def.key).deleteMany({ _id: { $in: ids } });
  res.json({ message: 'Deleted', deleted: result.deletedCount || 0 });
};
