import 'dotenv/config';
import app from './app.js';
import { startAiReviewJob } from './jobs/aiReview.job.js';
import { startTmdbSyncJob } from './jobs/tmdbSync.job.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🎬 Tid Jor API running on http://localhost:${PORT}`);
  startTmdbSyncJob();
  startAiReviewJob();
});
