import { Router } from 'express';
import { list, create } from '../controllers/genre.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const r = Router();
r.get('/', list);
r.post('/', requireAuth, requireAdmin, create);
export default r;
