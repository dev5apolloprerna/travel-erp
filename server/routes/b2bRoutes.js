import { Router } from 'express';
import * as c from '../controllers/b2bController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);

r.get('/companies', protect, staff, c.listCompanies);
r.post('/companies', protect, staff, c.createCompany);
r.get('/companies/:id', protect, staff, c.getCompany);
r.put('/companies/:id', protect, staff, c.updateCompany);
r.delete('/companies/:id', protect, staff, c.deleteCompany);
r.post('/companies/:id/members', protect, staff, c.addMember);
r.put('/companies/:id/members/:memberId', protect, staff, c.updateMember);
r.delete('/companies/:id/members/:memberId', protect, staff, c.deleteMember);

// company contacts
r.post('/companies/:id/contacts', protect, staff, c.addContact);
r.put('/companies/:id/contacts/:contactId', protect, staff, c.updateContact);
r.delete('/companies/:id/contacts/:contactId', protect, staff, c.deleteContact);

// company documents
r.post('/companies/:id/documents', protect, staff, toFolder('companies'), upload.single('file'), c.addCompanyDocument);
r.delete('/companies/:id/documents/:docId', protect, staff, c.deleteCompanyDocument);
r.get('/companies/:id/passengers', protect, staff, c.listPassengers);
r.post('/companies/:id/passengers', protect, staff, c.addPassenger);
r.post('/companies/:id/payments', protect, staff, c.addLumpSumPayment);
r.get('/companies/:id/orders', protect, staff, c.listCompanyOrders);

// member documents
r.get('/companies/:id/members/:memberId', protect, staff, c.getMember);
r.post('/companies/:id/members/:memberId/documents', protect, staff, toFolder('members'), upload.single('file'), c.addMemberDocument);
r.delete('/companies/:id/members/:memberId/documents/:docId', protect, staff, c.deleteMemberDocument);

r.post('/orders', protect, staff, c.createOrder);
r.get('/my-orders', protect, allow(ROLES.B2B_MEMBER), c.myOrders);
export default r;
