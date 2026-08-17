import { Router } from 'express';
import * as m from '../masterEngine/masterController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

// Company Owner area — all master CRUD, available ONLY to COMPANY_OWNER.
const r = Router();
r.use(protect, allow(ROLES.COMPANY_OWNER));

r.get('/masters', m.catalog);
r.get('/masters/:key/def', m.definition);
r.get('/masters/:key/options', m.options);
r.get('/masters/:key', m.list);
r.get('/masters/:key/:id', m.getOne);
r.post('/masters/:key', m.create);
r.put('/masters/:key/:id', m.update);
r.delete('/masters/:key/:id', m.remove);

export default r;
