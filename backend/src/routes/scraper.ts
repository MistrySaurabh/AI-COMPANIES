import { Router } from 'express';
import {
  startScrape,
  streamProgress,
  stopScrape,
  getScrapedCompanies,
  getScrapedCompanyFilterOptions,
  deleteScrapedCompany,
  bulkDeleteScrapedCompanies,
  bulkSyncScrapedCompanies,
  startRescrapeDetails,
  startFillCityState,
  cleanBadWebsiteUrls,
  syncScrapedCompanyToCompany,
  startPlacesEnrich,
  startWebsiteEmailScrape,
} from '../controllers/scraperController';

const router = Router();

router.post('/start', startScrape);
router.post('/rescrape-details', startRescrapeDetails);
router.post('/places-enrich', startPlacesEnrich);
router.post('/website-emails', startWebsiteEmailScrape);
router.post('/fill-city-state', startFillCityState);
router.post('/clean-bad-websites', cleanBadWebsiteUrls);
router.get('/stream/:sessionId', streamProgress);
router.post('/stop/:sessionId', stopScrape);
router.get('/companies/filter-options', getScrapedCompanyFilterOptions);
router.get('/companies', getScrapedCompanies);
router.post('/companies/bulk-delete', bulkDeleteScrapedCompanies);
router.post('/companies/bulk-sync', bulkSyncScrapedCompanies);
router.post('/companies/:id/sync', syncScrapedCompanyToCompany);
router.delete('/companies/:id', deleteScrapedCompany);

export default router;
