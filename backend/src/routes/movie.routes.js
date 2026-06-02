import { Router } from 'express';
import {
  list, getBySlug, create, update, remove,
  searchTmdb, importFromTmdb,
  uploadPoster, removePoster, uploadImage,
} from '../controllers/movie.controller.js';
import { requireAuth, requireModerator } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const r = Router();

// Public
r.get('/', list);
r.get('/slug/:slug', getBySlug);

// Admin / Moderator
r.get('/tmdb/search', requireAuth, requireModerator, searchTmdb);
r.post('/tmdb/import', requireAuth, requireModerator, importFromTmdb);
r.post('/upload', requireAuth, requireModerator, upload.single('image'), uploadImage);
r.post('/', requireAuth, requireModerator, create);
r.patch('/:id', requireAuth, requireModerator, update);
r.delete('/:id', requireAuth, requireModerator, remove);
r.patch('/:id/poster', requireAuth, requireModerator, upload.single('poster'), uploadPoster);
r.delete('/:id/poster', requireAuth, requireModerator, removePoster);

export default r;
