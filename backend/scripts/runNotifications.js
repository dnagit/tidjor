import './loadEnv.js';
import prisma from '../src/config/prisma.js';
import { runWatchlistNotifications } from '../src/services/notification.service.js';

// node scripts/runNotifications.js — รันแจ้งเตือน Watchlist ทันที (ปกติ cron รันให้ทุกวัน)
runWatchlistNotifications()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
