import ActivityLog from '../models/ActivityLog.js';

// Keys that must never be written to an activity log (req #1: no secrets).
const SENSITIVE = ['password', 'passwordhash', 'token', 'accesstoken', 'refreshtoken', 'otp', 'secret', 'authorization', 'creditcard', 'cvv'];

const sanitize = (val) => {
  if (!val || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(val)) {
    if (SENSITIVE.includes(String(k).toLowerCase())) continue;
    out[k] = (v && typeof v === 'object') ? sanitize(v) : v;
  }
  return out;
};

/**
 * Record an activity. Fire-and-forget and fully guarded: a logging failure NEVER breaks the main
 * operation (req #1.8). Call it AFTER the main operation has succeeded so a log is only written for
 * a real event (avoids duplicates / phantom entries).
 */
export const logActivity = async (req, { action, module, recordId, recordLabel, message, changes, meta } = {}) => {
  try {
    if (!action) return;
    const u = req?.user || {};
    await ActivityLog.create({
      action,
      module: module || '',
      recordId: recordId || null,
      recordLabel: recordLabel || '',
      message: message || '',
      changes: changes ? sanitize(changes) : undefined,
      meta: meta ? sanitize(meta) : undefined,
      userId: u._id || null,
      userName: u.name || '',
      userRole: u.role || '',
      organizationId: u.organizationId || null,
    });
  } catch {
    // Intentionally swallow — logging must not affect the primary request.
  }
};

// Build a { field: { from, to } } diff for the given keys between an existing doc and a patch.
export const diffFields = (existing, patch, keys) => {
  const changes = {};
  for (const k of keys) {
    const from = existing?.[k];
    const to = patch?.[k];
    if (to !== undefined && String(from ?? '') !== String(to ?? '')) changes[k] = { from, to };
  }
  return Object.keys(changes).length ? changes : undefined;
};
