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
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false,
  dnsPrefetchControl: { allow: false },
}));

// ─── RATE LIMITING ─────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many authentication attempts, account temporarily locked.' },
});

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, message: 'Vote submission rate limit exceeded.' },
});

app.use(globalLimiter);
app.use(compression());

// ─── CORS (FIXED) ─────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (Render health checks, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

app.options('*', cors());

// ─── BODY PARSING ─────────────────────────────────────────────────
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// ─── SANITIZATION ─────────────────────────────────────────────────
app.use(mongoSanitize());
app.use(hpp());

// ─── REQUEST ID ───────────────────────────────────────────────────
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
  app.use(morgan('combined', {
    skip: (req) => req.path === '/api/v1/health',
  }));
}

// ─── QUERY SANITIZATION ───────────────────────────────────────────
app.use(sanitizeQuery);

// ─── BASIC ROUTE FIX (prevents HEAD / crash) ──────────────────────
app.head('/', (req, res) => {
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// ─── ROUTES ───────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/elections', electionRoutes);
app.use('/api/v1/votes', voteLimiter, voteRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/audit', auditRoutes);

// Candidate upload
app.use('/api/v1/candidates', (req, res, next) => {
  if (req.method === 'PUT' && req.path.includes('/photo')) {
    express.json({ limit: '6mb' })(req, res, next);
  } else {
    next();
  }
});
app.use('/api/v1/candidates', candidateRoutes);

// ─── HEALTH CHECK (FIXED FOR RENDER) ──────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ERROR HANDLING ───────────────────────────────────────────────
app.use(errorHandler);

// ─── DB CONNECTION ────────────────────────────────────────────────
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

// ─── START SERVER ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;