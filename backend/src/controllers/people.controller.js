import { getPersonProfile } from '../services/people.service.js';

export async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(404).json({ error: 'not_found' });
    res.json(await getPersonProfile(id));
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: 'not_found' });
    next(err);
  }
}
