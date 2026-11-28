import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

import './config/passport.js';

import authRoutes from './routes/auth.routes.js';
import movieRoutes from './routes/movie.routes.js';
import reviewRoutes from './routes/review.routes.js';
import commentRoutes from './routes/comment.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import genreRoutes from './routes/genre.routes.js';
import peopleRoutes from './routes/people.routes.js';
import newsRoutes from './routes/news.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import listRoutes from './routes/list.routes.js';

import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

// ให้ res.json() serialize BigInt ได้ (เช่น budget/revenue ของหนังจาก TMDB)
BigInt.prototype.toJSON = function () { return Number(this); };

// ===== Security =====
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ===== Rate limit =====
// server อยู่หลัง Cloudflare → nginx: req.ip เป็น IP ของ proxy เหมือนกันทุก request
// ถ้านับตาม req.ip ผู้ใช้ทั้งเว็บ (รวม Googlebot) จะใช้โควตาเดียวกัน → 429 ทั้งเว็บ
// จึงนับตาม IP จริงจาก CF-Connecting-IP และจำกัดเฉพาะการเขียน (POST/PATCH/DELETE)
// ส่วน GET ถูกเรียกจาก SSR ของ frontend ซึ่งมาจาก IP ของ server เดียวกันทุกหน้า จึงไม่นับ
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  validate: { xForwardedForHeader: false },
}));

// ===== Body parsing =====
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Logging =====
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ===== Passport =====
app.use(passport.initialize());

// ===== Static =====
app.use('/uploads', express.static('uploads'));

// ===== Health check =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tidjor-api', time: new Date().toISOString() });
});

// ===== Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/admin', adminRoutes);

// ===== Error handlers =====
app.use(notFound);
app.use(errorHandler);

export default app;
