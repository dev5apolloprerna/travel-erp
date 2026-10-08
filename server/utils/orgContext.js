import Organization, { ORG_TYPES } from '../models/Organization.js';

// The org a new record should be stamped with: the caller's org, else the default 360 org.
export const resolveOrgId = async (req) => {
  if (req?.user?.organizationId) return req.user.organizationId;
  const def = await Organization.findOne({ type: ORG_TYPES.THREE_SIXTY, isDefault: true }).select('_id').lean();
  return def?._id || null;
};
