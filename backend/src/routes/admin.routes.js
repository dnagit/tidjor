import { Router } from 'express';
import {
  dashboard, listUsers, setBan, setRole, listReviews, hideReview,
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin, requireModerator } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/dashboard', requireAuth, requireModerator, dashboard);

r.get('/users', requireAuth, requireAdmin, listUsers);
r.patch('/users/:id/ban', requireAuth, requireAdmin, setBan);
r.patch('/users/:id/role', requireAuth, requireAdmin, setRole);

r.get('/reviews', requireAuth, requireModerator, listReviews);
r.patch('/reviews/:id/hide', requireAuth, requireModerator, hideReview);

export default r;
