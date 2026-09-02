import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import retailRoutes from './routes/retailRoutes.js';
import b2bRoutes from './routes/b2bRoutes.js';
import fitRoutes from './routes/fitRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import ownerRoutes from './routes/ownerRoutes.js';

import {
  stripeWebhook,
  razorpayWebhook
} from './controllers/websiteBookingController.js';

dotenv.config();

const app = express();

console.log('='.repeat(50));
console.log('🚀 STARTING TRAVEL ERP API...');
console.log('📅 Time:', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Node Version:', process.version);
console.log('🔺 Vercel:', process.env.VERCEL || 'false');
console.log('='.repeat(50));


// ======================================================
// CORS
// ======================================================

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((url) => url.trim())
  : ['*'];

const corsOptions = {
  origin(origin, callback) {
    // Postman/server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    // Development / allow all
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('⚠️ CORS blocked:', origin);

    return callback(new Error(`CORS blocked: ${origin}`));
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ]
};

app.use(cors(corsOptions));

console.log('✅ CORS enabled:', allowedOrigins);


// ======================================================
// ROOT ROUTE
// IMPORTANT: Must be before notFound middleware
// ======================================================

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Travel ERP API is running successfully',
    environment: process.env.NODE_ENV || 'development',
    platform: process.env.VERCEL ? 'Vercel' : 'Local',
    timestamp: new Date().toISOString()
  });
});


// ======================================================
// HEALTH ROUTE
// ======================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});


// ======================================================
// DATABASE CONNECTION
// ======================================================
//
// Important for Vercel:
// Don't start a permanent HTTP server.
// Connect lazily when API requests arrive.
//
// The promise is cached during the lifetime of the Vercel function
// instance to avoid reconnecting on every request.
//

let dbConnectionPromise = null;

const ensureDatabaseConnection = async () => {
  if (!dbConnectionPromise) {
    console.log('🔌 Connecting to MongoDB...');

    dbConnectionPromise = connectDB()
      .then(() => {
        console.log('✅ MongoDB connected');
      })
      .catch((error) => {
        // Reset so next request can retry
        dbConnectionPromise = null;
        throw error;
      });
  }

  return dbConnectionPromise;
};


// Run DB connection for /api routes.
//
// Root '/' and '/api/health' can still respond even if
// MongoDB has a temporary problem.
//
app.use('/api', async (req, res, next) => {
  try {
    await ensureDatabaseConnection();
    next();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);

    next(error);
  }
});


// ======================================================
// PUBLIC CORS
// ======================================================

app.use(
  '/api/public',
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS']
  })
);

console.log('✅ Public website API enabled');


// ======================================================
// WEBHOOKS
//
// Must be BEFORE express.json()
// ======================================================

app.post(
  '/api/public/webhooks/stripe',
  express.raw({
    type: 'application/json'
  }),
  stripeWebhook
);

app.post(
  '/api/public/webhooks/razorpay',
  express.raw({
    type: 'application/json'
  }),
  razorpayWebhook
);

console.log('✅ Payment webhooks registered');


// ======================================================
// BODY PARSER
// ======================================================

app.use(express.json({
  limit: '20mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '20mb'
}));

console.log('✅ Body parsers enabled');


// ======================================================
// STATIC UPLOADS
// ======================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

console.log('✅ Static uploads route registered');


// ======================================================
// REQUEST LOGGER
// ======================================================

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();

  console.log(
    `📝 [${timestamp}] ${req.method} ${req.originalUrl}`
  );

  next();
});


// ======================================================
// API ROUTES
// ======================================================

console.log('📍 Registering API routes...');

app.use('/api/auth', authRoutes);
console.log('✓ /api/auth');

app.use('/api/retail', retailRoutes);
console.log('✓ /api/retail');

app.use('/api/b2b', b2bRoutes);
console.log('✓ /api/b2b');

app.use('/api/fit', fitRoutes);
console.log('✓ /api/fit');

app.use('/api/services', serviceRoutes);
console.log('✓ /api/services');

app.use('/api/settings', settingsRoutes);
console.log('✓ /api/settings');

app.use('/api/invoices', invoiceRoutes);
console.log('✓ /api/invoices');

app.use('/api/hr', hrRoutes);
console.log('✓ /api/hr');

app.use('/api/cms', cmsRoutes);
console.log('✓ /api/cms');

app.use('/api/public', publicRoutes);
console.log('✓ /api/public');

app.use('/api/owner', ownerRoutes);
console.log('✓ /api/owner');


// ======================================================
// 404 HANDLER
//
// IMPORTANT:
// This must always come AFTER all routes.
// ======================================================

app.use(notFound);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(errorHandler);


// ======================================================
// LOCAL SERVER ONLY
// ======================================================
//
// On local Ubuntu/Windows:
// npm run dev
//
// On Vercel:
// DON'T call app.listen().
// Vercel will use `export default app`.
//

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  ensureDatabaseConnection()
    .then(() => {
      app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log('✅ SERVER RUNNING SUCCESSFULLY');
        console.log(`🌐 http://localhost:${PORT}`);
        console.log(`❤️ http://localhost:${PORT}/api/health`);
        console.log('='.repeat(50));
      });
    })
    .catch((error) => {
      console.error('❌ Failed to start local server');
      console.error(error);
      process.exit(1);
    });
}


// ======================================================
// VERY IMPORTANT FOR VERCEL
// ======================================================

export default app;
