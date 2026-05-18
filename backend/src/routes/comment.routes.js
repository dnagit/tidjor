import { Router } from 'express';
import { listForReview, create, remove } from '../controllers/comment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const r = Router();
r.get('/review/:reviewId', listForReview);
r.post('/', requireAuth, create);
r.delete('/:id', requireAuth, remove);
export default r;
