import { MASTERS } from '../masterEngine/masterDefs.js';
import { modelForMaster } from '../masterEngine/MasterRecord.js';

// Staff-facing read-only dropdown options for a master collection.
// Used by booking screens (employee role) to populate dropdowns like CRS, Bus Type, Vehicle.
// Only whitelisted masters are exposed, so this doesn't open the whole Company-Owner area.
const STAFF_READABLE = new Set(['cRS', 'busType', 'veh', 'vehType', 'vehModel', 'vehBrand']);

export const masterOptions = async (req, res) => {
  const key = req.params.key;
  if (!STAFF_READABLE.has(key)) return res.status(404).json({ message: 'Unknown or restricted master' });
  const def = MASTERS[key];
  if (!def) return res.status(404).json({ message: 'Unknown master' });
  const rows = await modelForMaster(def.key).find().sort({ createdAt: -1 }).lean();
  const labelField = def.titleField || 'name';
  res.json(rows.map((r) => ({ value: r._id, label: r[labelField] ?? String(r._id) })));
};
