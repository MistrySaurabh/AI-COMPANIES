import { Router } from 'express';
import {
  startMapsSearch,
  streamMapsSearch,
  stopMapsSearch,
  savePlaces,
  startEmailScrape,
  streamEmailScrape,
  stopEmailScrape,
} from '../controllers/placesController';

const router = Router();

// Google Maps scraping
router.post('/search/start', startMapsSearch);
router.get('/search-stream/:sessionId', streamMapsSearch);
router.post('/search/stop', stopMapsSearch);

// Email scraping
router.post('/scrape-emails/start', startEmailScrape);
router.get('/scrape-stream/:sessionId', streamEmailScrape);
router.post('/scrape-emails/stop', stopEmailScrape);

// Save to companies collection
router.post('/save', savePlaces);

export default router;
