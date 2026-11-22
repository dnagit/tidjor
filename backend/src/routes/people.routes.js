import { Router } from 'express';
import { getById } from '../controllers/people.controller.js';

const r = Router();

// Public
r.get('/:id', getById);

export default r;
