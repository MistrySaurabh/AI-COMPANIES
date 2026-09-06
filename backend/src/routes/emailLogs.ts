import { Router } from 'express';
import { getEmailLogs, deleteEmailLog, clearEmailLogs } from '../controllers/emailLogController';

const router = Router();

router.get('/', getEmailLogs);
router.delete('/clear', clearEmailLogs);
router.delete('/:id', deleteEmailLog);

export default router;
