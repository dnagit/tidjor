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

import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

// ===== Security =====
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ===== Rate limit =====
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
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
app.use('/api/admin', adminRoutes);

// ===== Error handlers =====
app.use(notFound);
app.use(errorHandler);

export default app;
