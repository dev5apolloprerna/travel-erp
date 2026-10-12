import { Router } from 'express';
import * as c from '../controllers/hrController.js';
import { protect, allow, can } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.use(protect, staff);

// ---- Holiday master ----
// req #4: mutating actions are gated by the 'hr-holidays' permission matrix so a user granted
// only Select/Read cannot create/edit/delete via a direct API call (hiding buttons isn't enough).
r.get('/holidays', c.listHolidays);
r.post('/holidays', can('hr-holidays', 'CREATE'), c.createHoliday);
r.put('/holidays/:id', can('hr-holidays', 'EDIT'), c.updateHoliday);
r.delete('/holidays/:id', can('hr-holidays', 'DELETE'), c.deleteHoliday);

// ---- Leave ----
r.get('/leaves', c.listLeaves);              // own for employee, all for admin
r.post('/leaves', c.applyLeave);
r.put('/leaves/:id/decision', c.decideLeave); // approve / reject
r.put('/leaves/:id/cancel', c.cancelLeave);
r.get('/leave-balance', c.myLeaveBalance);
r.put('/leave-balance', c.setLeaveBalance);

// ---- Salary slips ----
r.get('/salary-slips', c.listSalarySlips);   // own for employee, all for admin
r.get('/my-salary-slips', c.mySalarySlips);
r.post('/salary-slips', toFolder('salary'), upload.single('file'), c.uploadSalarySlip);
r.delete('/salary-slips/:id', c.deleteSalarySlip);

// helper for dropdowns
r.get('/employees', c.listEmployeesForHr);
export default r;
