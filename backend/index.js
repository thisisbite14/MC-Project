const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const MySQLStore = require('express-mysql-session')(session);
const pool = require('./db');
require('dotenv').config();

const app = express();

// ----------------------------------------------------------------
//  การตั้งค่าสภาพแวดล้อม (Environment)
// ----------------------------------------------------------------
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'production' : 'development'} mode.`);

/** ----------------------------------------------------------------
 * CORS
 * ---------------------------------------------------------------- */
const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  frontendURL,
];

// เพิ่ม URL ของ Vercel/Railway/Deployments อื่นๆ เข้าไปใน List ถ้ามี
if (isProduction && process.env.VERCEL_URL) {
  ALLOWED_ORIGINS.push(`https://${process.env.VERCEL_URL}`);
}

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // อนุญาต request ที่ไม่มี origin (เช่น Postman)
    if (ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    // สำหรับ Vercel Preview Deployments (ถ้าใช้)
    if (isProduction && origin.includes('vercel.app')) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-auth-token'],
  optionsSuccessStatus: 200,
}));


/** ----------------------------------------------------------------
 * Body parsers
 * ---------------------------------------------------------------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/** ----------------------------------------------------------------
 * Session
 * ---------------------------------------------------------------- */
// ✅ เปิด trust proxy เมื่ออยู่ใน Production (เช่น Railway/Vercel)
if (isProduction) {
  app.set('trust proxy', 1); 
  console.log("Trust Proxy is ENABLED (1)");
}

const sessionStore = new MySQLStore({}, pool);
app.use(session({
  name: 'mc.sid',
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000,   // 1 วัน
    httpOnly: true,
    // ✅ 
    // [Production]   ใช้ 'none' และ 'true' เพื่อให้คุกกี้ทำงานข้ามโดเมน (cross-domain) บน HTTPS
    // [Development]  ใช้ 'lax' และ 'false' เพื่อให้คุกกี้ทำงานบน HTTP localhost
    sameSite: isProduction ? 'none' : 'lax', 
    secure: isProduction,                   
  },
}));

/** ----------------------------------------------------------------
 * Static uploads
 * ---------------------------------------------------------------- */
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1h',
  etag: true,
}));

/** ----------------------------------------------------------------
 * Routes
 * ---------------------------------------------------------------- */
const authRoutes        = require('./routes/auth');
const memberRoutes      = require('./routes/members');
const bandRoutes        = require('./routes/bands');
const scheduleRoutes    = require('./routes/schedules');
const userRoutes        = require('./routes/users');
const financeRoutes     = require('./routes/finances');
const projectRoutes     = require('./routes/projects');
const equipmentsRoutes  = require('./routes/equipments');
const permissionRoutes  = require('./routes/permissions');
const siteRoutes        = require('./routes/site');
const uploadRoutes      = require('./routes/upload');

app.use('/api/files',     uploadRoutes);
app.use('/api/upload',    uploadRoutes);

app.use('/api/site',        siteRoutes);
app.use('/api/auth',        authRoutes);
app.use('/api/members',     memberRoutes);
app.use('/api/bands',       bandRoutes);
app.use('/api/schedules',   scheduleRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/finances',    financeRoutes);
app.use('/api/projects',    projectRoutes);
app.use('/api/equipments',  equipmentsRoutes);
app.use('/api/permissions', permissionRoutes);

/** ----------------------------------------------------------------
 * 404 / 500
 * ---------------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  if (err && err.message.startsWith('Not allowed by CORS')) {
    console.error('CORS Error:', err.message);
    return res.status(403).json({ message: 'CORS forbidden' });
  }
  console.error('Error:', err && (err.stack || err));
  res.status(500).json({ message: 'Internal Server Error' });
});

/** ----------------------------------------------------------------
 * Start
 * ---------------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});