import { Router } from 'express';
import { publicProfile, updateMe } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const r = Router();
r.get('/profile/:username', publicProfile);
r.patch('/me', requireAuth, updateMe);
export default r;
