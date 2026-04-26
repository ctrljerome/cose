const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
require('dotenv').config();

const logger = require('./utils/logger');
const { sanitizeQuery } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const voteRoutes = require('./routes/votes');
const adminRoutes = require('./routes/admin');
const auditRoutes = require('./routes/audit');
const candidateRoutes = require('./routes/candidates');

const app = express();

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],                          // No unsafe-inline — prevents XSS
      styleSrc:       ["'self'", "'unsafe-inline'"],       // unsafe-inline needed for Vue scoped styles
      fontSrc:        ["'self'", "https://fonts.gstatic.com"],
      imgSrc:         ["'self'", "data:"],                 // No https: wildcard — data: for base64 logos
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      baseUri:        ["'self'"],                          // Prevent base tag hijacking
      formAction:     ["'self'"],                          // Forms can only submit to self
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,         // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  dnsPrefetchControl: { allow: false },
}));

// Rate limiting - global
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts, account temporarily locked.' },
  skipSuccessfulRequests: false,
});

// Vote submission rate limit
const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: 'Vote submission rate limit exceeded.' },
});

app.use(globalLimiter);
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Reject requests with no origin (curl, null origin) in production
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS: browser origin required'));
      }
      return callback(null, true); // allow in dev for testing
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// ─── BODY PARSING ─────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));         // enough for vote payloads
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// ─── SANITIZATION ─────────────────────────────────────────────────
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp());           // Prevent HTTP parameter pollution

// ─── REQUEST ID TRACING ───────────────────────────────────────────
app.use((req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ─── LOGGING ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // In production use combined format without sensitive path details
  app.use(morgan('combined', {
    skip: (req) => req.path === '/api/v1/health',
  }));
}

// ─── QUERY SANITIZATION ───────────────────────────────────────────
app.use(sanitizeQuery);

// ─── ROUTES ───────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/elections', electionRoutes);
app.use('/api/v1/votes', voteLimiter, voteRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/audit', auditRoutes);

// Candidate photo upload needs a larger body limit and bypasses mongoSanitize
// (base64 strings are not NoSQL injection vectors)
app.use('/api/v1/candidates', (req, res, next) => {
  if (req.method === 'PUT' && req.path.includes('/photo')) {
    express.json({ limit: '6mb' })(req, res, next);
  } else {
    next();
  }
});
app.use('/api/v1/candidates', candidateRoutes);

// Health check — internal only, never expose NODE_ENV
app.get('/api/v1/health', (req, res) => {
  const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  if (!allowedIPs.includes(req.ip)) {
    return res.status(404).json({ success: false, message: 'Not found.' });
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ERROR HANDLING ────────────────────────────────────────────────
app.use(errorHandler);

// ─── DB CONNECTION ─────────────────────────────────────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB Atlas connected');
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// ─── START SERVER ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
