import { Router } from 'express';
import {
  list, getBySlug, sitemap, adminList, create, update, remove, generate,
  listComments, addComment, removeComment,
} from '../controllers/news.controller.js';
import { requireAuth, requireModerator, requireAdmin } from '../middleware/auth.middleware.js';

const r = Router();

// Public
r.get('/', list);
r.get('/sitemap', sitemap);
r.get('/slug/:slug', getBySlug);

// คอมเมนต์
r.get('/:id/comments', listComments);
r.post('/:id/comments', requireAuth, addComment);
r.delete('/comments/:commentId', requireAuth, removeComment);

// Admin / Moderator
r.get('/admin/all', requireAuth, requireModerator, adminList);
r.post('/admin/generate', requireAuth, requireAdmin, generate);
r.post('/', requireAuth, requireModerator, create);
r.patch('/:id', requireAuth, requireModerator, update);
r.delete('/:id', requireAuth, requireModerator, remove);

export default r;
