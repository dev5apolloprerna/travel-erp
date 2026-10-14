import { MASTERS } from '../masterEngine/masterDefs.js';
import { modelForMaster } from '../masterEngine/MasterRecord.js';

// Staff-facing read-only dropdown options for a master collection.
// Used by booking screens (employee role) to populate dropdowns like CRS, Bus Type, Vehicle, and
// the Airline / Bus / Hotel account pickers. Only whitelisted masters are exposed, so this doesn't
// open the whole Company-Owner area.
const STAFF_READABLE = new Set(['cRS', 'busType', 'veh', 'vehType', 'vehModel', 'vehBrand', 'property', 'mealPlan', 'quota', 'account']);

// Masters that use a SEARCHABLE, server-side autocomplete (the table can be large). When no search
// term is given we return the first page so the control is responsive; a search term scans the whole
// collection by name (req #1/#2/#3 — all eligible records are findable, not just a small subset).
const SEARCHABLE = new Set(['account']);
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const masterOptions = async (req, res) => {
  try {
    const key = req.params.key;
    if (!STAFF_READABLE.has(key)) return res.status(404).json({ message: 'Unknown or restricted master' });
    const def = MASTERS[key];
    if (!def) return res.status(404).json({ message: 'Unknown master' });

    const Model = modelForMaster(def.key);
    const labelField = def.titleField || 'name';
    const toOptions = (rows) => rows.map((r) => ({ value: r._id, label: r[labelField] ?? String(r._id) }));

    const filter = {};
    const search = String(req.query.search || '').trim();

    // Partial, case-insensitive name search across the WHOLE collection (req #1/#2/#3).
    if (search && def.titleField) filter[def.titleField] = new RegExp(escapeRe(search), 'i');

    // req #4: the Airline "PNR From" dropdown (sourced from the CRS master) is scoped to the selected
    // service — like Railway's service-specific master dropdown — so it shows CRS entries that belong
    // to the chosen service rather than another's. Falls back to all CRS when nothing is tagged yet,
    // so the control is never empty. `tintCRSType` is the CRS classifier; `strCRSName` is matched too.
    const service = String(req.query.service || '').trim();
    if (key === 'cRS' && service) {
      const re = new RegExp(escapeRe(service), 'i');
      const scoped = await Model.find({ $or: [{ strCRSName: re }, { tintCRSType: re }] }).sort({ createdAt: -1 }).lean();
      if (scoped.length) return res.json(toOptions(scoped));
      // else fall through to "all CRS"
    }

    // Searchable masters: cap the result set (search spans everything, we just page the response).
    const useLimit = SEARCHABLE.has(key);
    const limit = useLimit ? Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || DEFAULT_LIMIT)) : 0;

    let q = Model.find(filter).sort(search ? { [labelField]: 1 } : { createdAt: -1 });
    if (limit) q = q.limit(limit);
    const rows = await q.lean();
    res.json(toOptions(rows));
  } catch (err) {
    // Surface failures as a 500 instead of a silent empty list.
    res.status(500).json({ message: 'Could not load options', error: err.message });
  }
};
