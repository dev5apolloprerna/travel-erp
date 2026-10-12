import { Router } from 'express';
import * as c from '../controllers/fitController.js';
import { protect, allow, can } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import { upload, toFolder } from '../utils/upload.js';
import * as pax from '../controllers/passengerController.js';

const r = Router();
const staff = allow(ROLES.EMPLOYEE, ROLES.SUPER_ADMIN);
r.use(protect, staff);

// req #4: mutating actions gated by the per-menu permission matrix (reads stay open to anyone
// who can see the menu). Super Admin bypasses; employees need the specific action.
// masters
const FIT_MASTER_MENU = { clusters: 'master-cluster', divisions: 'master-division', grades: 'master-grade', departments: 'master-department' };
for (const [path, ctrl] of [['clusters', c.clusters], ['divisions', c.divisions], ['grades', c.grades], ['departments', c.departments]]) {
  const menu = FIT_MASTER_MENU[path];
  r.get(`/${path}`, ctrl.list);
  r.post(`/${path}`, can(menu, 'CREATE'), ctrl.create);
  r.put(`/${path}/:id`, can(menu, 'EDIT'), ctrl.update);
  r.delete(`/${path}/:id`, can(menu, 'DELETE'), ctrl.remove);
}

// DR + employees
r.get('/doctors', c.listDoctors);
r.post('/doctors', can('fit-doctors', 'CREATE'), c.createDoctor);
r.put('/doctors/:id', can('fit-doctors', 'EDIT'), c.updateDoctor);
r.delete('/doctors/:id', can('fit-doctors', 'DELETE'), c.deleteDoctor);
r.get('/employees', c.listFitEmployees);
r.post('/employees', can('fit-employees', 'CREATE'), c.createFitEmployee);
r.put('/employees/:id', can('fit-employees', 'EDIT'), c.updateFitEmployee);
r.delete('/employees/:id', can('fit-employees', 'DELETE'), c.deleteFitEmployee);

// documents add/delete only :type = doctor | employee
r.post('/:type/:id/documents', toFolder('fit'), upload.single('file'), c.addDocument);
r.delete('/:type/:id/documents/:docId', c.deleteDocument);

// ---- Passenger (DR) master ----
r.get('/passengers', pax.listPassengers);
r.get('/passengers/filters', pax.passengerFilters);
r.get('/passengers/search', pax.searchForBooking);   // Society booking: search by Dr. Code
r.get('/passengers/:id', pax.getPassenger);
r.post('/passengers', can('fit-doctors', 'CREATE'), pax.createPassenger);
r.put('/passengers/:id', can('fit-doctors', 'EDIT'), pax.updatePassenger);
r.delete('/passengers/:id', can('fit-doctors', 'DELETE'), pax.deletePassenger);

// orders
r.get('/orders', c.listOrders);
r.post('/orders', can('fit-orders', 'CREATE'), c.createOrder);
r.get('/orders/:id', c.getOrder);
r.delete('/orders/:id', can('fit-orders', 'DELETE'), c.deleteOrder);
export default r;
