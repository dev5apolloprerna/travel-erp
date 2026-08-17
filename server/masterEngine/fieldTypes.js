// Decode the SQL-style column prefixes used in the wireframe spec into field metadata.
// int…ID (not the table's own PK) -> foreign key dropdown; bit -> boolean; dec/flt/mny -> number;
// dt/dat -> date; img -> image; str/txt -> text.

const PREFIX = [
  ['int', 'number'],
  ['dec', 'number'], ['flt', 'number'], ['mny', 'number'],
  ['bit', 'boolean'],
  ['dt', 'date'], ['dat', 'date'],
  ['img', 'image'],
  ['txt', 'textarea'],
  ['str', 'text'], ['uni', 'text'],
];

export const typeOf = (col) => {
  for (const [p, t] of PREFIX) if (col.startsWith(p)) return t;
  return 'text';
};

// Strip the prefix and produce a human label. Handles common acronyms so we get
// "Country ID" and "Currency RBI Rate" rather than "Country I D".
const ACRONYMS = ['ID', 'RBI', 'ISO', 'GST', 'PAN', 'TAN', 'CIN', 'KYC', 'RM', 'CRS', 'SMS', 'URL', 'HQ', 'IFSC', 'MICR', 'UPI', 'TCS', 'TDS', 'HSN', 'SAC'];

export const labelOf = (col) => {
  let s = col.replace(/^(int|str|bit|dec|flt|mny|dt|dat|img|txt|uni)/, '');
  // protect acronyms, then split camelCase, then restore
  ACRONYMS.forEach((a, i) => { s = s.replace(new RegExp(a, 'g'), `\u0000${i}\u0000`); });
  s = s.replace(/([A-Z])/g, ' $1');
  ACRONYMS.forEach((a, i) => { s = s.replace(new RegExp(`\u0000${i}\u0000`, 'g'), ' ' + a); });
  return s.replace(/\s+/g, ' ').trim();
};

// The key we store in Mongo — keep the original column name so it maps 1:1 to the spec.
export const keyOf = (col) => col;
