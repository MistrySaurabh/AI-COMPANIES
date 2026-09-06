import { Router } from 'express';
import {
  getAllSettings,
  upsertSettings,
  testConnection,
  sendTestEmail,
  getActiveSettings,
} from '../controllers/emailSettingsController';

const router = Router();

router.get('/', getAllSettings);
router.get('/active', getActiveSettings);
router.post('/send-test', sendTestEmail);
router.put('/:planType', upsertSettings);
router.post('/:planType/test', testConnection);

export default router;
