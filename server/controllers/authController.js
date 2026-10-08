import jwt from 'jsonwebtoken';
import User, { ROLES } from '../models/User.js';
import { scopeToOrg, ownsOrg } from '../middleware/auth.js';
import { resolveOrgId } from '../utils/orgContext.js';
import { publicUrl, removeFile } from '../utils/upload.js';
import Service from '../models/Service.js'; // Import Service model for populate

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  employeeType: u.employeeType,
  employeeTypes: u.employeeTypes || (u.employeeType ? [u.employeeType] : []),
  phone: u.phone || '',
  hr: u.hr || {},
  profilePic: u.profilePic || '',
  isActive: u.isActive,
  menus: u.menus || [],
  permissions: u.permissions || {},   // req #9: per-menu action matrix
  modules: u.modules || [],
  services: u.services || [],
  customerId: u.customerId,
  companyId: u.companyId,
  organizationId: u.organizationId,
});

// POST /api/auth/login  { email, password, expectedRole }
export const login = async (req, res) => {
  const { email, password, expectedRole } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() }).populate('services', 'name type');
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  if (user.isActive === false) {
    return res.status(403).json({ message: 'Your account is inactive. Please contact the administrator.' });
  }

  if (expectedRole && user.role !== expectedRole) {
    return res.status(403).json({ message: 'This login is not valid for this portal' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user._id).populate('services', 'name type');
  res.json({ user: publicUser(user) });
};

// ---- Employee management (menu-access controlled) ----
export const createEmployee = async (req, res) => {
  const { name, email, password, phone, employeeType, employeeTypes, menus, permissions, modules, services, isActive, hr } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already in use' });

  // Only a Super Admin may place an employee in a specific org via the payload;
  // every other role (e.g. Company Owner) is pinned to their own org — this blocks
  // creating employees in another company by passing organizationId.
  const orgId = (req.user.role === ROLES.SUPER_ADMIN && req.body.organizationId)
    ? req.body.organizationId
    : await resolveOrgId(req);
  const user = new User({
    name, email, phone: phone || '', role: ROLES.EMPLOYEE, organizationId: orgId,
    employeeType: employeeType || (employeeTypes || [])[0] || null,
    employeeTypes: employeeTypes || (employeeType ? [employeeType] : []),
    // req #9: `permissions` (the action matrix) is the source of truth; `menus` is derived from
    // it on save. If only a legacy `menus` list is sent, it is still honoured.
    menus: menus || [], permissions: permissions || {}, modules: modules || [], services: services || [],
    isActive: isActive !== undefined ? isActive : true,
    hr: hr || {},
  });
  await user.setPassword(password || 'password123');
  await user.save();
  res.status(201).json({ user: publicUser(user) });
};

export const updateEmployee = async (req, res) => {
  const { name, email, phone, employeeType, employeeTypes, menus, permissions, modules, services, password, isActive, hr } = req.body;
  const user = await User.findById(req.params.id);
  if (!user || !ownsOrg(user, req)) return res.status(404).json({ message: 'Employee not found' });

  if (hr !== undefined) { user.hr = hr; user.markModified('hr'); }
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (employeeType !== undefined) user.employeeType = employeeType;
  if (employeeTypes !== undefined) user.employeeTypes = employeeTypes;
  if (menus !== undefined) user.menus = menus;
  if (permissions !== undefined) { user.permissions = permissions; user.markModified('permissions'); }  // req #9
  if (modules !== undefined) user.modules = modules;
  if (services !== undefined) user.services = services;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) await user.setPassword(password);
  await user.save();
  res.json({ user: publicUser(user) });
};

export const deleteEmployee = async (req, res) => {
  const emp = await User.findById(req.params.id);
  if (!emp || !ownsOrg(emp, req)) return res.status(404).json({ message: 'Employee not found' });
  await emp.deleteOne();
  res.json({ message: 'Employee deleted' });
};

export const listEmployees = async (req, res) => {
  const employees = await User.find(scopeToOrg({ role: ROLES.EMPLOYEE }, req))
    .select('-passwordHash').populate('services', 'name type');
  res.json(employees);
};

export const getEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id).select('-passwordHash').populate('services', 'name type');
  if (employee && !ownsOrg(employee, req)) return res.status(404).json({ message: 'Employee not found' });
  if (!employee) return res.status(404).json({ message: 'Employee not found' });
  res.json(employee);
};

/* ===================================================================== *
 *  Company Owner accounts (requirement #3)
 *  Super Admin creates & manages Company Owner logins. Each Company Owner
 *  is bound to the default 360 organization (per product decision) and is
 *  then isolated to it by the same scopeToOrg / ownsOrg tenant rules.
 *  These endpoints are Super-Admin-only (enforced on the route).
 * ===================================================================== */
import Organization, { ORG_TYPES } from '../models/Organization.js';

// The organization a new Company Owner belongs to: the default 360 agency org.
const defaultOrgId = async () => {
  const def = await Organization.findOne({ type: ORG_TYPES.THREE_SIXTY, isDefault: true }).select('_id').lean();
  return def?._id || null;
};

export const listCompanyOwners = async (req, res) => {
  const owners = await User.find({ role: ROLES.COMPANY_OWNER })
    .select('-passwordHash').sort('-createdAt');
  res.json(owners.map(publicUser));
};

export const getCompanyOwner = async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: ROLES.COMPANY_OWNER }).select('-passwordHash');
  if (!owner) return res.status(404).json({ message: 'Company Owner not found' });
  res.json(publicUser(owner));
};

export const createCompanyOwner = async (req, res) => {
  const { name, email, password, phone, isActive } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already in use' });

  const user = new User({
    name, email, phone: phone || '', role: ROLES.COMPANY_OWNER,
    organizationId: await defaultOrgId(),
    isActive: isActive !== undefined ? isActive : true,
  });
  await user.setPassword(password || 'owner123');
  await user.save();
  res.status(201).json({ user: publicUser(user) });
};

export const updateCompanyOwner = async (req, res) => {
  const { name, email, phone, password, isActive } = req.body;
  const user = await User.findOne({ _id: req.params.id, role: ROLES.COMPANY_OWNER });
  if (!user) return res.status(404).json({ message: 'Company Owner not found' });

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) await user.setPassword(password);
  await user.save();
  res.json({ user: publicUser(user) });
};

export const deleteCompanyOwner = async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: ROLES.COMPANY_OWNER });
  if (!owner) return res.status(404).json({ message: 'Company Owner not found' });
  await owner.deleteOne();
  res.json({ message: 'Company Owner deleted' });
};

/**
 * Explicit "Login as" — Super Admin obtains a session token for a Company Owner (req #1).
 * This is an explicit action (a button on the Company Owner list), never an automatic
 * redirect. The front end keeps the admin's own token so it can return to the admin panel.
 */
export const loginAsCompanyOwner = async (req, res) => {
  const owner = await User.findOne({ _id: req.params.id, role: ROLES.COMPANY_OWNER })
    .populate('services', 'name type');
  if (!owner) return res.status(404).json({ message: 'Company Owner not found' });
  if (owner.isActive === false) return res.status(403).json({ message: 'This Company Owner account is inactive.' });
  res.json({ token: signToken(owner), user: publicUser(owner) });
};

/**
 * Change own password — works for every role
 * (Super Admin, Employee, Retail Customer, B2B Member).
 * POST /api/auth/change-password { currentPassword, newPassword }
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const ok = await user.comparePassword(currentPassword || '');
  if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

  await user.setPassword(newPassword);
  await user.save();
  res.json({ message: 'Password changed successfully' });
};

/** Admin resets any user's password without knowing the old one. */
export const resetUserPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });

  const user = await User.findById(req.params.id);
  if (!user || !ownsOrg(user, req)) return res.status(404).json({ message: 'User not found' });

  await user.setPassword(newPassword);
  await user.save();
  res.json({ message: `Password reset for ${user.name}` });
};

/** Toggle active / inactive for an employee (or any user). */
export const toggleActive = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || !ownsOrg(user, req)) return res.status(404).json({ message: 'User not found' });

  user.isActive = req.body.isActive !== undefined ? !!req.body.isActive : !user.isActive;
  await user.save();
  res.json({ id: user._id, isActive: user.isActive });
};

/* ---------------- Profile picture (all user types) ---------------- */
export const uploadProfilePic = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Image file is required' });

  // Admins may set someone else's picture; everyone else only their own.
  const targetId = req.params.id && req.params.id !== 'me' ? req.params.id : req.user._id;
  const isAdmin = req.user.role === ROLES.SUPER_ADMIN || (req.user.menus || []).includes('ALL');
  if (String(targetId) !== String(req.user._id) && !isAdmin) {
    return res.status(403).json({ message: 'Not allowed to change this profile picture' });
  }

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.profilePic) removeFile(user.profilePic);
  user.profilePic = publicUrl(req, req.file);
  await user.save();
  res.json({ profilePic: user.profilePic });
};

export const removeProfilePic = async (req, res) => {
  const targetId = req.params.id && req.params.id !== 'me' ? req.params.id : req.user._id;
  const isAdmin = req.user.role === ROLES.SUPER_ADMIN || (req.user.menus || []).includes('ALL');
  if (String(targetId) !== String(req.user._id) && !isAdmin) {
    return res.status(403).json({ message: 'Not allowed to change this profile picture' });
  }

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.profilePic) removeFile(user.profilePic);
  user.profilePic = '';
  await user.save();
  res.json({ profilePic: '' });
};
