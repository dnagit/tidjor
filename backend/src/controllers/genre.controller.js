import prisma from '../config/prisma.js';

export async function list(req, res, next) {
  try {
    const genres = await prisma.genre.findMany({ orderBy: { nameTh: 'asc' } });
    res.json({ items: genres });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, nameTh, slug, tmdbId } = req.body;
    const genre = await prisma.genre.create({ data: { name, nameTh, slug, tmdbId } });
    res.status(201).json(genre);
  } catch (err) { next(err); }
}
