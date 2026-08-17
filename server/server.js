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
import { stripeWebhook, razorpayWebhook } from './controllers/websiteBookingController.js';

// Load environment variables
dotenv.config();

console.log('='.repeat(50));
console.log('🚀 STARTING SERVER...');
console.log('='.repeat(50));
console.log('📅 Time:', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Node Version:', process.version);
console.log('='.repeat(50));

const app = express();

// CORS configuration - Allow multiple origins
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['*'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow all if '*' is in the list
    if (allowedOrigins.includes('*')) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️  CORS blocked:', origin);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
console.log('✅ CORS enabled for origins:', allowedOrigins);

// The public website is a separate site, so its read/booking API is open to any origin.
app.use('/api/public', cors({ origin: true, methods: ['GET', 'POST', 'OPTIONS'] }));
console.log('✅ Public website API is open to all origins');

// Payment webhooks need the RAW body to verify their signatures,
// so they are mounted before the JSON parser.
app.post('/api/public/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
app.post('/api/public/webhooks/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);
console.log('  ✓ /api/public/webhooks/stripe + /razorpay (raw body)');

// Body parser
app.use(express.json());
console.log('✅ JSON body parser enabled');

// Serve uploaded documents (customer/company/FIT docs, salary slips)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('✅ Static uploads served at /uploads');

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📝 [${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes
console.log('📍 Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('  ✓ /api/auth');
app.use('/api/retail', retailRoutes);
console.log('  ✓ /api/retail');
app.use('/api/b2b', b2bRoutes);
console.log('  ✓ /api/b2b');
app.use('/api/fit', fitRoutes);
console.log('  ✓ /api/fit');
app.use('/api/services', serviceRoutes);
console.log('  ✓ /api/services');
app.use('/api/settings', settingsRoutes);
console.log('  ✓ /api/settings');
app.use('/api/invoices', invoiceRoutes);
console.log('  ✓ /api/invoices');
app.use('/api/hr', hrRoutes);
console.log('  ✓ /api/hr');
app.use('/api/cms', cmsRoutes);
console.log('  ✓ /api/cms');
app.use('/api/public', publicRoutes);
console.log('  ✓ /api/public (website API, no auth)');
app.use('/api/owner', ownerRoutes);
console.log('  ✓ /api/owner (company owner masters)');

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Async initialization function
async function startServer() {
  try {
    // Connect to database first
    await connectDB();
    
    // Start server after successful DB connection
    const server = app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log('✅ SERVER RUNNING SUCCESSFULLY!');
      console.log('='.repeat(50));
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      console.log('='.repeat(50));
      console.log('💡 Server is ready to accept requests');
      console.log('='.repeat(50));
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('='.repeat(50));
      console.error('❌ SERVER ERROR:');
      console.error('='.repeat(50));
      console.error(error);
      console.error('='.repeat(50));
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('⚠️  SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('\n⚠️  SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('='.repeat(50));
    console.error('❌ FATAL ERROR: Failed to start server');
    console.error('='.repeat(50));
    console.error('Error details:', error);
    console.error('='.repeat(50));
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('='.repeat(50));
  console.error('❌ UNHANDLED PROMISE REJECTION:');
  console.error('='.repeat(50));
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('='.repeat(50));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('='.repeat(50));
  console.error('❌ UNCAUGHT EXCEPTION:');
  console.error('='.repeat(50));
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('='.repeat(50));
  process.exit(1);
});
