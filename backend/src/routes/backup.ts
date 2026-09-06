import { Router } from 'express';
import { getBackupInfo, downloadBackup } from '../controllers/backupController';

const router = Router();

router.get('/info', getBackupInfo);
router.get('/download', downloadBackup);

export default router;
