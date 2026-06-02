import { Router } from 'express';
import { body } from 'express-validator';
import { list, create, update, remove } from '../controllers/genre.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const r = Router();

const genreRules = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('ชื่อ (en) ต้องมี 1-50 ตัวอักษร'),
  body('nameTh').trim().isLength({ min: 1, max: 50 }).withMessage('ชื่อไทยต้องมี 1-50 ตัวอักษร'),
  body('slug')
    .trim()
    .customSanitizer((v) => (v || '').toLowerCase())
    .isLength({ min: 1, max: 60 }).withMessage('ต้องมี slug')
    .matches(/^[a-z0-9-]+$/).withMessage('slug ใช้ได้เฉพาะ a-z, 0-9 และ -'),
  body('tmdbId').optional({ nullable: true }).isInt().withMessage('tmdbId ต้องเป็นจำนวนเต็ม').toInt(),
];

r.get('/', list);
r.post('/', requireAuth, requireAdmin, genreRules, validate, create);
r.patch('/:id', requireAuth, requireAdmin, genreRules, validate, update);
r.delete('/:id', requireAuth, requireAdmin, remove);

export default r;
