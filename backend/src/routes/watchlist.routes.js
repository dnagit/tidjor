import { Router } from 'express';
import { mine, add, remove, setStatus } from '../controllers/watchlist.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const r = Router();
r.use(requireAuth);
r.get('/', mine);
r.post('/', add);
r.patch('/:movieId', setStatus);
r.delete('/:movieId', remove);
export default r;
