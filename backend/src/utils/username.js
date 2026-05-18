import prisma from '../config/prisma.js';

function slugifyUsername(input) {
  return (input || 'user')
    .toString()
    .toLowerCase()
    .replace(/@.+$/, '')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20) || 'user';
}

export async function generateUniqueUsername(seed) {
  const base = slugifyUsername(seed);
  let candidate = base;
  let i = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    i++;
    candidate = `${base}${i}`;
    if (i > 100) {
      candidate = `${base}${Math.floor(Math.random() * 1e6)}`;
      break;
    }
  }
  return candidate;
}
