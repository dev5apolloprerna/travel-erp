import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';

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
  razorpayWebhook,
} from './controllers/websiteBookingController.js';


// ======================================================
// ENV
// ======================================================

dotenv.config();


// ======================================================
// APP
// ======================================================

const app = express();

console.log('='.repeat(60));
console.log('🚀 TRAVEL ERP API STARTING');
console.log('='.repeat(60));
console.log('📅 Time:', new Date().toISOString());
console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('🔧 Node:', process.version);
console.log('🔺 Vercel:', process.env.VERCEL || 'false');
console.log('='.repeat(60));


// ======================================================
// TRUST VERCEL PROXY
// ======================================================

app.set('trust proxy', 1);


// ======================================================
// ALLOWED ORIGINS
// ======================================================

const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',

  // Current deployed frontend
  'https://travel-erp-account.vercel.app',
];


// Add CLIENT_URL from environment variable.
//
// You can use:
// CLIENT_URL=https://travel-erp-account.vercel.app
//
// Or multiple:
// CLIENT_URL=https://site1.com,https://site2.com
//
const environmentOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean)
  : [];


const allowedOrigins = [
  ...new Set([
    ...defaultOrigins,
    ...environmentOrigins,
  ]),
];


console.log('🌐 Allowed CORS origins:');

allowedOrigins.forEach((origin) => {
  console.log(`   ✓ ${origin}`);
});


// ======================================================
// CHECK ALLOWED ORIGIN
// ======================================================

const isAllowedOrigin = (origin) => {

  // Postman / curl / server-to-server
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
};


// ======================================================
// VERY IMPORTANT
// MANUAL PREFLIGHT HANDLER
//
// This MUST come before database middleware,
// body parser and API routes.
// ======================================================

app.use((req, res, next) => {

  const origin = req.headers.origin;

  // ----------------------------------------------------
  // Set CORS headers
  // ----------------------------------------------------

  if (origin && isAllowedOrigin(origin)) {

    res.header(
      'Access-Control-Allow-Origin',
      origin
    );

    res.header(
      'Vary',
      'Origin'
    );

    res.header(
      'Access-Control-Allow-Credentials',
      'true'
    );

    res.header(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );

    res.header(
      'Access-Control-Allow-Headers',
      'Origin,X-Requested-With,Content-Type,Accept,Authorization'
    );

    res.header(
      'Access-Control-Max-Age',
      '86400'
    );
  }


  // ----------------------------------------------------
  // Browser preflight request
  // ----------------------------------------------------

  if (req.method === 'OPTIONS') {

    console.log(
      `✈️ PREFLIGHT: ${req.method} ${req.originalUrl}`
    );

    console.log(
      `🌐 Origin: ${origin || 'No Origin'}`
    );


    if (!isAllowedOrigin(origin)) {

      console.warn(
        `❌ PREFLIGHT BLOCKED: ${origin}`
      );

      return res.status(403).json({
        success: false,
        message: 'Origin not allowed by CORS',
      });
    }


    // IMPORTANT
    //
    // Return 204 directly.
    // Do not connect MongoDB.
    // Do not run routes.
    // Do not redirect.
    //

    return res.status(204).end();
  }


  next();
});


// ======================================================
// CORS PACKAGE
// ======================================================

const corsOptions = {

  origin(origin, callback) {

    // Postman / curl / server-side
    if (!origin) {
      return callback(null, true);
    }


    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }


    console.warn(
      `❌ CORS blocked origin: ${origin}`
    );


    return callback(
      new Error(
        `CORS policy does not allow origin: ${origin}`
      )
    );
  },


  credentials: true,


  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],


  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],


  optionsSuccessStatus: 204,
};


app.use(cors(corsOptions));

console.log('✅ CORS middleware enabled');


// ======================================================
// REQUEST LOGGER
// ======================================================

app.use((req, res, next) => {

  const start = Date.now();


  console.log(
    `➡️ ${req.method} ${req.originalUrl}`
  );


  console.log(
    `🌐 Request origin: ${req.headers.origin || 'No Origin'}`
  );


  res.on('finish', () => {

    const duration = Date.now() - start;

    console.log(
      `⬅️ ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });


  next();
});


// ======================================================
// ROOT ROUTE
// NO DATABASE REQUIRED
// ======================================================

app.get('/', (req, res) => {

  return res.status(200).json({

    success: true,

    message:
      'Travel ERP API is running successfully',

    environment:
      process.env.NODE_ENV || 'development',

    platform:
      process.env.VERCEL
        ? 'Vercel'
        : 'Local',

    timestamp:
      new Date().toISOString(),

  });
});


// ======================================================
// HEALTH ROUTE
// NO DATABASE REQUIRED
// ======================================================

app.get('/api/health', (req, res) => {

  return res.status(200).json({

    success: true,

    status: 'ok',

    message:
      'Travel ERP API health check successful',

    environment:
      process.env.NODE_ENV || 'development',

    platform:
      process.env.VERCEL
        ? 'Vercel'
        : 'Local',

    timestamp:
      new Date().toISOString(),

    uptime:
      process.uptime(),

  });
});


// ======================================================
// DATABASE CONNECTION
// ======================================================
//
// Vercel functions may be reused.
//
// Therefore cache the database connection promise so
// MongoDB is not unnecessarily connected on every request.
// ======================================================

let dbConnectionPromise = null;


const ensureDatabaseConnection = async () => {

  if (!dbConnectionPromise) {

    console.log(
      '🔌 Creating MongoDB connection...'
    );


    dbConnectionPromise = connectDB()

      .then(() => {

        console.log(
          '✅ MongoDB connection ready'
        );

        return true;
      })

      .catch((error) => {

        // Reset promise so next request can retry
        dbConnectionPromise = null;

        console.error(
          '❌ MongoDB connection failed:',
          error.message
        );

        throw error;
      });
  }


  return dbConnectionPromise;
};


// ======================================================
// DATABASE MIDDLEWARE
// ======================================================
//
// Apply database connection only to /api requests.
//
// OPTIONS is already handled above.
// /api/health is excluded.
// ======================================================

app.use('/api', async (req, res, next) => {

  // Browser preflight should NEVER reach database.
  if (req.method === 'OPTIONS') {
    return next();
  }


  // Health API does not need MongoDB
  if (req.path === '/health') {
    return next();
  }


  try {

    await ensureDatabaseConnection();

    next();

  } catch (error) {

    console.error(
      '❌ Database middleware error:',
      error.message
    );


    return res.status(503).json({

      success: false,

      message:
        'Database connection unavailable',

      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,

    });
  }
});


// ======================================================
// PUBLIC API CORS
// ======================================================

app.use(
  '/api/public',
  cors({
    origin: true,
    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  })
);


// ======================================================
// PAYMENT WEBHOOKS
//
// IMPORTANT:
// These routes MUST stay BEFORE express.json().
//
// Stripe/Razorpay signature verification may require
// original RAW request body.
// ======================================================

app.post(
  '/api/public/webhooks/stripe',

  express.raw({
    type: 'application/json',
  }),

  stripeWebhook
);


app.post(
  '/api/public/webhooks/razorpay',

  express.raw({
    type: 'application/json',
  }),

  razorpayWebhook
);


console.log(
  '✅ Payment webhook routes registered'
);


// ======================================================
// BODY PARSERS
// ======================================================

app.use(
  express.json({
    limit: '20mb',
  })
);


app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  })
);


console.log('✅ Body parsers enabled');


// ======================================================
// STATIC UPLOADS
// ======================================================

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


app.use(
  '/uploads',

  express.static(
    path.join(
      __dirname,
      'uploads'
    )
  )
);


console.log(
  '✅ /uploads static route enabled'
);


// ======================================================
// API ROUTES
// ======================================================

console.log('='.repeat(60));
console.log('📍 REGISTERING API ROUTES');
console.log('='.repeat(60));


app.use(
  '/api/auth',
  authRoutes
);

console.log(
  '✓ /api/auth'
);


app.use(
  '/api/retail',
  retailRoutes
);

console.log(
  '✓ /api/retail'
);


app.use(
  '/api/b2b',
  b2bRoutes
);

console.log(
  '✓ /api/b2b'
);


app.use(
  '/api/fit',
  fitRoutes
);

console.log(
  '✓ /api/fit'
);


app.use(
  '/api/services',
  serviceRoutes
);

console.log(
  '✓ /api/services'
);


app.use(
  '/api/settings',
  settingsRoutes
);

console.log(
  '✓ /api/settings'
);


app.use(
  '/api/invoices',
  invoiceRoutes
);

console.log(
  '✓ /api/invoices'
);


app.use(
  '/api/hr',
  hrRoutes
);

console.log(
  '✓ /api/hr'
);


app.use(
  '/api/cms',
  cmsRoutes
);

console.log(
  '✓ /api/cms'
);


app.use(
  '/api/public',
  publicRoutes
);

console.log(
  '✓ /api/public'
);


app.use(
  '/api/owner',
  ownerRoutes
);

console.log(
  '✓ /api/owner'
);


console.log('='.repeat(60));
console.log('✅ ALL API ROUTES REGISTERED');
console.log('='.repeat(60));


// ======================================================
// 404 HANDLER
//
// MUST remain after ALL routes.
// ======================================================

app.use(notFound);


// ======================================================
// GLOBAL ERROR HANDLER
//
// MUST remain last.
// ======================================================

app.use(errorHandler);


// ======================================================
// LOCAL DEVELOPMENT SERVER
// ======================================================
//
// Vercel:
//   Do NOT use app.listen()
//
// Local:
//   Start normal Express server.
// ======================================================

if (!process.env.VERCEL) {

  const PORT =
    process.env.PORT || 5000;


  const startLocalServer = async () => {

    try {

      console.log(
        '🔌 Connecting MongoDB for local development...'
      );


      await ensureDatabaseConnection();


      const server = app.listen(
        PORT,

        () => {

          console.log(
            '='.repeat(60)
          );

          console.log(
            '✅ TRAVEL ERP SERVER RUNNING'
          );

          console.log(
            '='.repeat(60)
          );

          console.log(
            `🌐 API: http://localhost:${PORT}`
          );

          console.log(
            `❤️ Health: http://localhost:${PORT}/api/health`
          );

          console.log(
            '='.repeat(60)
          );
        }
      );


      // ----------------------------------------------
      // LOCAL graceful shutdown
      // ----------------------------------------------

      process.on(
        'SIGTERM',
        () => {

          console.log(
            '⚠️ SIGTERM received'
          );


          server.close(() => {

            console.log(
              '✅ Server closed'
            );

            process.exit(0);
          });
        }
      );


      process.on(
        'SIGINT',
        () => {

          console.log(
            '\n⚠️ SIGINT received'
          );


          server.close(() => {

            console.log(
              '✅ Server closed'
            );

            process.exit(0);
          });
        }
      );

    } catch (error) {

      console.error(
        '❌ Local server startup failed'
      );

      console.error(error);

      process.exit(1);
    }
  };


  startLocalServer();
}


// ======================================================
// UNHANDLED ERRORS
// LOCAL ONLY
// ======================================================

if (!process.env.VERCEL) {

  process.on(
    'unhandledRejection',
    (error) => {

      console.error(
        '❌ UNHANDLED PROMISE REJECTION'
      );

      console.error(error);
    }
  );


  process.on(
    'uncaughtException',
    (error) => {

      console.error(
        '❌ UNCAUGHT EXCEPTION'
      );

      console.error(error);

      process.exit(1);
    }
  );
}


// ======================================================
// VERCEL EXPORT
//
// VERY IMPORTANT:
// Vercel imports this Express application.
// ======================================================

export default app;
