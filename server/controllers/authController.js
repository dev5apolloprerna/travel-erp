import jwt from 'jsonwebtoken';
import User, { ROLES } from '../models/User.js';
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
  profilePic: u.profilePic || '',
  isActive: u.isActive,
  menus: u.menus || [],
  modules: u.modules || [],
  services: u.services || [],
  customerId: u.customerId,
  companyId: u.companyId,
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
  const { name, email, password, employeeType, employeeTypes, menus, modules, services, isActive } = req.body;
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ message: 'Email already in use' });

  const user = new User({
    name, email, role: ROLES.EMPLOYEE,
    employeeType: employeeType || (employeeTypes || [])[0] || null,
    employeeTypes: employeeTypes || (employeeType ? [employeeType] : []),
    menus: menus || [], modules: modules || [], services: services || [],
    isActive: isActive !== undefined ? isActive : true,
  });
  await user.setPassword(password || 'password123');
  await user.save();
  res.status(201).json({ user: publicUser(user) });
};

export const updateEmployee = async (req, res) => {
  const { name, email, employeeType, employeeTypes, menus, modules, services, password, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Employee not found' });

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (employeeType !== undefined) user.employeeType = employeeType;
  if (employeeTypes !== undefined) user.employeeTypes = employeeTypes;
  if (menus !== undefined) user.menus = menus;
  if (modules !== undefined) user.modules = modules;
  if (services !== undefined) user.services = services;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) await user.setPassword(password);
  await user.save();
  res.json({ user: publicUser(user) });
};

export const deleteEmployee = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Employee deleted' });
};

export const listEmployees = async (req, res) => {
  const employees = await User.find({ role: ROLES.EMPLOYEE })
    .select('-passwordHash').populate('services', 'name type');
  res.json(employees);
};

export const getEmployee = async (req, res) => {
  const employee = await User.findById(req.params.id).select('-passwordHash').populate('services', 'name type');
  if (!employee) return res.status(404).json({ message: 'Employee not found' });
  res.json(employee);
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
  if (!user) return res.status(404).json({ message: 'User not found' });

  await user.setPassword(newPassword);
  await user.save();
  res.json({ message: `Password reset for ${user.name}` });
};

/** Toggle active / inactive for an employee (or any user). */
export const toggleActive = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

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
