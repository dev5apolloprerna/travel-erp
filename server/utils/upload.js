import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Sub-folders keep things tidy: /uploads/customers, /uploads/salary, etc.
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.uploadFolder || 'misc';
    const dest = path.join(UPLOAD_DIR, folder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').slice(0, 40);
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

// Accept common document/image types, 10MB cap.
const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpe?g|png|gif|webp|docx?|xlsx?|csv|txt/i;
  const okExt = allowed.test(path.extname(file.originalname));
  if (okExt) return cb(null, true);
  cb(new Error('Unsupported file type'));
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware to set the destination sub-folder before multer runs.
export const toFolder = (folder) => (req, res, next) => { req.uploadFolder = folder; next(); };

// Public URL path for a stored file (served by express static at /uploads)
export const publicUrl = (req, file) => {
  const folder = req.uploadFolder || 'misc';
  return `/uploads/${folder}/${file.filename}`;
};

// Delete a stored file from disk (ignore if missing)
export const removeFile = (fileUrl) => {
  try {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
    const abs = path.join(UPLOAD_DIR, fileUrl.replace('/uploads/', ''));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch { /* non-fatal */ }
};

// Spreadsheet uploads are parsed in memory and never written to disk.
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xlsm|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Please upload an .xlsx, .xls or .csv file'), ok);
  },
});
