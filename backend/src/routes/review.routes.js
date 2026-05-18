import { Router } from 'express';
import {
  listForMovie, create, remove, like, feed,
} from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const r = Router();

r.get('/feed', feed);
r.get('/movie/:movieId', listForMovie);
r.post('/', requireAuth, create);
r.delete('/:id', requireAuth, remove);
r.post('/:id/like', requireAuth, like);

export default r;
