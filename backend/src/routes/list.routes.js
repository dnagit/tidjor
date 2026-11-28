import { Router } from 'express';
import { list, getBySlug, sitemap, adminList, update, remove, generate } from '../controllers/list.controller.js';
import { requireAuth, requireModerator, requireAdmin } from '../middleware/auth.middleware.js';

const r = Router();
r.get('/', list);
r.get('/sitemap', sitemap);
r.get('/slug/:slug', getBySlug);
r.get('/admin/all', requireAuth, requireModerator, adminList);
r.post('/admin/generate', requireAuth, requireAdmin, generate);
r.patch('/:id', requireAuth, requireModerator, update);
r.delete('/:id', requireAuth, requireModerator, remove);
export default r;
