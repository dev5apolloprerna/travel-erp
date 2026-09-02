import { Router } from 'express';
import multer from 'multer';
import * as m from '../masterEngine/masterController.js';
import { sampleExcel, importExcel } from '../masterEngine/masterImport.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

// Company Owner area — all master CRUD, available ONLY to COMPANY_OWNER.
const r = Router();
r.use(protect, allow(ROLES.COMPANY_OWNER));

// In-memory upload for Excel import (parsed immediately, not stored).
const xlsxUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

r.get('/masters', m.catalog);
r.get('/masters/:key/def', m.definition);
r.get('/masters/:key/options', m.options);
r.get('/masters/:key/sample', sampleExcel);                 // download per-master sample (#11)
r.post('/masters/:key/import', xlsxUpload.single('file'), importExcel);  // import Excel (#11)
r.get('/masters/:key', m.list);
r.get('/masters/:key/:id', m.getOne);
r.post('/masters/:key', m.create);
r.post('/masters/:key/bulk-delete', m.bulkRemove);
r.put('/masters/:key/:id', m.update);
r.delete('/masters/:key/:id', m.remove);

export default r;
