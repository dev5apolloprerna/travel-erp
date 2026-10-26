import Organization, { ORG_TYPES } from '../models/Organization.js';

// The 360 org the caller operates within (their own org, or the default 360 org).
const the360OrgId = async (req) => {
  if (req.user?.organizationId) return req.user.organizationId;
  const def = await Organization.findOne({ type: ORG_TYPES.THREE_SIXTY, isDefault: true });
  return def?._id || null;
};

// GET /api/org           -> the caller's 360 org + its Main Companies
export const listOrganizations = async (req, res) => {
  const orgId = await the360OrgId(req);
  const three60 = orgId ? await Organization.findById(orgId) : null;
  const mains = await Organization.find({ type: ORG_TYPES.MAIN_COMPANY, parentId: orgId }).sort({ name: 1 });
  res.json({ three60, mainCompanies: mains });
};

// GET /api/org/main      -> just the Main Companies (suppliers) for dropdowns
export const listMainCompanies = async (req, res) => {
  const orgId = await the360OrgId(req);
  const rows = await Organization.find({ type: ORG_TYPES.MAIN_COMPANY, parentId: orgId, isActive: true }).sort({ name: 1 });
  res.json(rows);
};

// POST /api/org/main     -> create a Main Company under the caller's 360 org
export const createMainCompany = async (req, res) => {
  const orgId = await the360OrgId(req);
  if (!orgId) return res.status(400).json({ message: 'No 360 organization found. Run the seed first.' });
  const doc = await Organization.create({
    ...req.body,
    type: ORG_TYPES.MAIN_COMPANY,
    parentId: orgId,
    isDefault: false,
  });
  res.status(201).json(doc);
};

// PUT /api/org/main/:id
export const updateMainCompany = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await Organization.findOne({ _id: req.params.id, type: ORG_TYPES.MAIN_COMPANY, parentId: orgId });
  if (!row) return res.status(404).json({ message: 'Main Company not found' });
  // never allow changing type/parent via this route
  const { type, parentId, isDefault, ...rest } = req.body;
  Object.assign(row, rest);
  await row.save();
  res.json(row);
};

// DELETE /api/org/main/:id
export const deleteMainCompany = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await Organization.findOne({ _id: req.params.id, type: ORG_TYPES.MAIN_COMPANY, parentId: orgId });
  if (!row) return res.status(404).json({ message: 'Main Company not found' });
  await row.deleteOne();
  res.json({ message: 'Main Company deleted' });
};

// PUT /api/org/profile   -> update the 360 org's own details
export const updateThreeSixty = async (req, res) => {
  const orgId = await the360OrgId(req);
  const row = await Organization.findOne({ _id: orgId, type: ORG_TYPES.THREE_SIXTY });
  if (!row) return res.status(404).json({ message: '360 organization not found' });
  const { type, parentId, ...rest } = req.body;
  Object.assign(row, rest);
  await row.save();
  res.json(row);
};
