import { Router } from 'express';
import * as c from '../controllers/fitController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';
import * as pax from '../controllers/passengerController.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.use(protect, staff);

// masters
for (const [path, ctrl] of [['clusters', c.clusters], ['divisions', c.divisions], ['grades', c.grades], ['departments', c.departments]]) {
  r.get(`/${path}`, ctrl.list);
  r.post(`/${path}`, ctrl.create);
  r.put(`/${path}/:id`, ctrl.update);
  r.delete(`/${path}/:id`, ctrl.remove);
}

// DR + employees
r.get('/doctors', c.listDoctors);
r.post('/doctors', c.createDoctor);
r.put('/doctors/:id', c.updateDoctor);
r.delete('/doctors/:id', c.deleteDoctor);
r.get('/employees', c.listFitEmployees);
r.post('/employees', c.createFitEmployee);
r.put('/employees/:id', c.updateFitEmployee);
r.delete('/employees/:id', c.deleteFitEmployee);

// documents add/delete only :type = doctor | employee
r.post('/:type/:id/documents', toFolder('fit'), upload.single('file'), c.addDocument);
r.delete('/:type/:id/documents/:docId', c.deleteDocument);

// ---- Passenger (DR) master ----
r.get('/passengers', pax.listPassengers);
r.get('/passengers/filters', pax.passengerFilters);
r.get('/passengers/search', pax.searchForBooking);   // Society booking: search by Dr. Code
r.get('/passengers/:id', pax.getPassenger);
r.post('/passengers', pax.createPassenger);
r.put('/passengers/:id', pax.updatePassenger);
r.delete('/passengers/:id', pax.deletePassenger);

// orders
r.get('/orders', c.listOrders);
r.post('/orders', c.createOrder);
r.get('/orders/:id', c.getOrder);
r.delete('/orders/:id', c.deleteOrder);
export default r;
