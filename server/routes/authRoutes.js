import { Router } from 'express';
import {
  login, me, createEmployee, updateEmployee, deleteEmployee, listEmployees, getEmployee,
  changePassword, resetUserPassword, toggleActive, uploadProfilePic, removeProfilePic,
} from '../controllers/authController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);

r.post('/login', login);
r.get('/me', protect, me);

// Change own password — available to ALL roles (Admin, Employee, Retail, B2B)
r.post('/change-password', protect, changePassword);

// Profile picture — any logged-in user for themselves ("me"), admins for others
r.post('/profile-pic', protect, toFolder('avatars'), upload.single('file'), uploadProfilePic);
r.delete('/profile-pic', protect, removeProfilePic);
r.post('/profile-pic/:id', protect, toFolder('avatars'), upload.single('file'), uploadProfilePic);
r.delete('/profile-pic/:id', protect, removeProfilePic);

// Employee management (menu-access controlled on the client; open to staff here)
r.get('/employees', protect, staff, listEmployees);
r.post('/employees', protect, staff, createEmployee);
r.get('/employees/:id', protect, staff, getEmployee);
r.put('/employees/:id', protect, staff, updateEmployee);
r.delete('/employees/:id', protect, staff, deleteEmployee);
r.put('/employees/:id/password', protect, staff, resetUserPassword);
r.put('/employees/:id/active', protect, staff, toggleActive);
export default r;
