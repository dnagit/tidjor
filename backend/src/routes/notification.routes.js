import { Router } from 'express';
import { mine, readAll } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const r = Router();
r.use(requireAuth);
r.get('/', mine);
r.post('/read', readAll);
export default r;
