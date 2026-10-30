// =============================================================================
//  Booking passenger validation (v64)
// -----------------------------------------------------------------------------
//  Mandatory passenger details for B2B and Retail bookings (NOT Society/FIT).
//  Backend-enforced so it can't be bypassed by hitting the API directly.
//
//  "Required passenger detail" = at least one passenger per service with a
//  non-empty Name. Passport/DOB/etc. stay optional (business rule: passport is
//  not forced), so no unrelated fields are required here.
// =============================================================================

/** True when a passenger row carries a usable name. */
const hasName = (p) => !!(p && typeof p.name === 'string' && p.name.trim());

/**
 * Validate that every service line of a B2B/Retail booking has at least one
 * named passenger. Returns an error string, or null when valid.
 * @param {Array} services  the order's service lines (each may carry passengers[])
 */
export const validateBookingPassengers = (services = []) => {
  if (!Array.isArray(services) || services.length === 0) {
    return 'Add at least one service before saving the booking.';
  }
  for (let i = 0; i < services.length; i += 1) {
    const s = services[i] || {};
    const passengers = Array.isArray(s.passengers) ? s.passengers : [];
    if (!passengers.some(hasName)) {
      const label = s.serviceType ? `the ${s.serviceType} service` : `service ${i + 1}`;
      return `Passenger details are required: please add at least one passenger name for ${label}.`;
    }
  }
  return null;
};

// v65.1: the passenger fields we copy when auto-filling from a previous order.
const PASSENGER_FIELDS = ['name', 'nationality', 'gender', 'dob', 'passportNumber', 'passportIssueDate'];

/**
 * Collect unique, named passengers from an order's service lines, returning only
 * the supported passenger fields (no subdocument ids, no unrelated data). De-duped
 * by name so a passenger repeated across services appears once.
 */
export const extractOrderPassengers = (order) => {
  const seen = new Set();
  const out = [];
  for (const s of (order?.services || [])) {
    for (const p of (s?.passengers || [])) {
      const name = (p?.name || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const row = {};
      for (const f of PASSENGER_FIELDS) if (p[f] !== undefined && p[f] !== null) row[f] = p[f];
      row.name = name;
      out.push(row);
    }
  }
  return out;
};
