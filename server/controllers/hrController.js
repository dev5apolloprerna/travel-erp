import Holiday from '../models/Holiday.js';
import Leave, { LeaveBalance, LEAVE_TYPES } from '../models/Leave.js';
import SalarySlip from '../models/SalarySlip.js';
import User, { ROLES } from '../models/User.js';
import { publicUrl, removeFile } from '../utils/upload.js';

const isAdmin = (u) => u.role === ROLES.SUPER_ADMIN || (u.menus || []).includes('ALL');
const daysBetween = (from, to) => {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

/* ============================ HOLIDAY MASTER ============================ */
export const listHolidays = async (req, res) => {
  const filter = {};
  if (req.query.year) filter.year = Number(req.query.year);
  const holidays = await Holiday.find(filter).sort('date');
  res.json(holidays);
};
export const createHoliday = async (req, res) =>
  res.status(201).json(await Holiday.create(req.body));
export const updateHoliday = async (req, res) => {
  const h = await Holiday.findById(req.params.id);
  if (!h) return res.status(404).json({ message: 'Holiday not found' });
  Object.assign(h, req.body);
  await h.save();                       // keeps `year` in sync via pre-save
  res.json(h);
};
export const deleteHoliday = async (req, res) => {
  await Holiday.findByIdAndDelete(req.params.id);
  res.json({ message: 'Holiday deleted' });
};

/* ============================ LEAVE BALANCE ============================ */
const getOrCreateBalance = async (employeeId, year) => {
  let bal = await LeaveBalance.findOne({ employeeId, year });
  if (!bal) bal = await LeaveBalance.create({ employeeId, year });
  return bal;
};

// Used leave = sum of APPROVED days grouped by type for the year
const usedByType = async (employeeId, year) => {
  const start = new Date(year, 0, 1), end = new Date(year, 11, 31, 23, 59, 59);
  const rows = await Leave.aggregate([
    { $match: { employeeId, status: 'APPROVED', fromDate: { $gte: start, $lte: end } } },
    { $group: { _id: '$leaveType', days: { $sum: '$days' } } },
  ]);
  const map = Object.fromEntries(LEAVE_TYPES.map((t) => [t, 0]));
  rows.forEach((r) => { map[r._id] = r.days; });
  return map;
};

export const myLeaveBalance = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const bal = await getOrCreateBalance(req.user._id, year);
  const used = await usedByType(req.user._id, year);

  const summary = LEAVE_TYPES.map((type) => ({
    type,
    allocated: bal.balances[type] || 0,
    used: used[type] || 0,
    remaining: (bal.balances[type] || 0) - (used[type] || 0),
  }));
  res.json({ year, summary });
};

// Admin: set a specific employee's yearly allocation
export const setLeaveBalance = async (req, res) => {
  const { employeeId, year, balances } = req.body;
  const bal = await getOrCreateBalance(employeeId, Number(year) || new Date().getFullYear());
  bal.balances = { ...bal.balances.toObject?.() ?? bal.balances, ...balances };
  await bal.save();
  res.json(bal);
};

/* ============================ LEAVE APPLY / APPROVE ============================ */
export const applyLeave = async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body;
  if (new Date(toDate) < new Date(fromDate))
    return res.status(400).json({ message: 'To date cannot be before from date' });

  const leave = await Leave.create({
    employeeId: req.user._id,
    leaveType, fromDate, toDate,
    days: daysBetween(fromDate, toDate),
    reason,
  });
  res.status(201).json(leave);
};

// Employee sees own; admin sees all (optionally filtered)
export const listLeaves = async (req, res) => {
  const filter = {};
  if (!isAdmin(req.user)) filter.employeeId = req.user._id;
  else if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.status) filter.status = req.query.status;

  const leaves = await Leave.find(filter)
    .populate('employeeId', 'name email')
    .populate('approvedBy', 'name')
    .sort('-createdAt');
  res.json(leaves);
};

export const decideLeave = async (req, res) => {
  const { status, adminRemark } = req.body; // APPROVED | REJECTED
  if (!['APPROVED', 'REJECTED'].includes(status))
    return res.status(400).json({ message: 'Status must be APPROVED or REJECTED' });

  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave request not found' });

  leave.status = status;
  leave.adminRemark = adminRemark || '';
  leave.approvedBy = req.user._id;
  leave.approvedAt = new Date();
  await leave.save();
  res.json(leave);
};

// Employee cancels their own pending request
export const cancelLeave = async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) return res.status(404).json({ message: 'Leave request not found' });
  if (String(leave.employeeId) !== String(req.user._id) && !isAdmin(req.user))
    return res.status(403).json({ message: 'Not allowed' });
  if (leave.status !== 'PENDING')
    return res.status(400).json({ message: 'Only pending requests can be cancelled' });

  leave.status = 'CANCELLED';
  await leave.save();
  res.json(leave);
};

/* ============================ SALARY SLIPS ============================ */
// Admin uploads for an employee
export const uploadSalarySlip = async (req, res) => {
  const { employeeId, month, year, remark } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Salary slip file is required' });
  if (!employeeId) return res.status(400).json({ message: 'Employee is required' });

  const slip = await SalarySlip.create({
    employeeId,
    month: Number(month),
    year: Number(year),
    fileUrl: publicUrl(req, req.file),
    fileName: req.file.originalname,
    remark: remark || '',
    uploadedBy: req.user._id,
  });
  res.status(201).json(slip);
};

// Admin sees all (filterable); employee sees only their own
export const listSalarySlips = async (req, res) => {
  const filter = {};
  if (!isAdmin(req.user)) filter.employeeId = req.user._id;
  else if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.year) filter.year = Number(req.query.year);

  const slips = await SalarySlip.find(filter)
    .populate('employeeId', 'name email')
    .sort({ year: -1, month: -1 });
  res.json(slips);
};

// Employee's own slips only — explicit endpoint for the employee portal
export const mySalarySlips = async (req, res) => {
  const slips = await SalarySlip.find({ employeeId: req.user._id }).sort({ year: -1, month: -1 });
  res.json(slips);
};

export const deleteSalarySlip = async (req, res) => {
  const slip = await SalarySlip.findById(req.params.id);
  if (!slip) return res.status(404).json({ message: 'Salary slip not found' });
  removeFile(slip.fileUrl);
  await slip.deleteOne();
  res.json({ message: 'Salary slip deleted' });
};

export const listEmployeesForHr = async (req, res) => {
  const employees = await User.find({ role: ROLES.EMPLOYEE }).select('name email isActive').sort('name');
  res.json(employees);
};
