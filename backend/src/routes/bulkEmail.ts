import { Router } from 'express';
import {
  getPendingCompanies,
  getFilterOptions,
  getStats,
  startBulkSend,
  getJobStatus,
} from '../controllers/bulkEmailController';

const router = Router();

router.get('/pending-companies', getPendingCompanies);
router.get('/filter-options', getFilterOptions);
router.get('/stats', getStats);
router.post('/send', startBulkSend);
router.get('/job/:jobId', getJobStatus);

export default router;
