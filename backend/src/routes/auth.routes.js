import { Router } from 'express';
import { body } from 'express-validator';
import passport from 'passport';
import {
  register, login, refresh, logout, me, oauthCallback,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const r = Router();

// ===== Local =====
r.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('displayName').optional().isLength({ min: 2, max: 50 }),
  validate, register);

r.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate, login);

r.post('/refresh', refresh);
r.post('/logout', logout);
r.get('/me', requireAuth, me);

// ===== Google =====
r.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
r.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=oauth` }),
  oauthCallback);

// ===== Facebook =====
r.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
r.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=oauth` }),
  oauthCallback);

// ===== LINE =====
r.get('/line', passport.authenticate('line', { session: false }));
r.get('/line/callback',
  passport.authenticate('line', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=oauth` }),
  oauthCallback);

export default r;
