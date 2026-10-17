import { Router } from 'express';
import { NEWS_TARGET } from '../services/newsService.js';

const router = Router();

router.use(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const subpath = req.url === '/' ? '' : req.url;
    const targetUrl = `${NEWS_TARGET}/api/news${subpath}`;
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    res.set('Cache-Control', 'no-store').status(response.status).json(data);
  } catch {
    res.status(503).json({ error: 'Unable to load latest news. Please try again.' });
  }
});

export default router;
