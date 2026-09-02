// v17 overrides applied on top of the auto-generated MASTERS.
// Kept separate so the generated masterDefs.js stays clean and regenerable.
import { MASTERS } from './masterDefs.js';

// ---- Enum value sets (exact spellings from the v17 spec) ----
const ENUMS = {
  // Destination Type (#4)
  'location-destination:tintDestinationType': ['International', 'Domestic'],
  // Group Nature (#7) and Group Type (#8)
  'group:strNatureOfGroup': ['Liabilities', 'Assets', 'Income', 'Expenses'],
  'group:strGroupTypeFlag': ['Cash', 'Bank Balance'],
};

// Find a master by its old auto key OR by table — the generated keys are camelCase
// (e.g. 'destination', 'group'); map the friendly keys used above to real ones.
const KEY_ALIASES = {
  'location-destination': 'destination',
  'group': 'group',
};

const resolveKey = (friendly) => {
  const [k] = friendly.split(':');
  return KEY_ALIASES[k] || k;
};

export function applyOverrides() {
  // 1) Apply enum dropdowns
  for (const [friendly, values] of Object.entries(ENUMS)) {
    const [, fieldKey] = friendly.split(':');
    const masterKey = resolveKey(friendly);
    const m = MASTERS[masterKey];
    if (!m) continue;
    const f = m.fields.find((x) => x.key === fieldKey);
    if (f) { f.type = 'enum'; f.options = values; }
  }

  // 2) Company: add Country + State FK dropdowns (Currency already exists). (#3)
  const company = MASTERS.company;
  if (company) {
    const ensureFk = (key, label, ref, afterKey) => {
      if (company.fields.some((f) => f.key === key)) return;
      const field = { key, label, type: 'ref', ref, required: true };
      const idx = company.fields.findIndex((f) => f.key === afterKey);
      if (idx >= 0) company.fields.splice(idx + 1, 0, field);
      else company.fields.push(field);
    };
    // Insert Country then State right after City, so they read City / Country / State.
    ensureFk('intCountryID', 'Country', 'country', 'intCityID');
    ensureFk('intStateID', 'State', 'state', 'intCountryID');
    // Currency already present; mark it required for validation (#3).
    const cur = company.fields.find((f) => f.key === 'intCurrencyID');
    if (cur) cur.required = true;
    const city = company.fields.find((f) => f.key === 'intCityID');
    if (city) city.required = true;
    // Show names (not IDs) in listing — include the new FKs in listColumns.
    company.listColumns = ['strCompanyName', 'intCityID', 'intStateID', 'intCountryID'];
  }

  // 3) Group: Parent excludes self (#6); mark the enum fields required for validation.
  const group = MASTERS.group;
  if (group) {
    const parent = group.fields.find((f) => f.key === 'intGroupParentID');
    if (parent) { parent.type = 'ref'; parent.ref = 'group'; parent.excludeSelf = true; }
  }

  return MASTERS;
}

applyOverrides();
export { MASTERS };
