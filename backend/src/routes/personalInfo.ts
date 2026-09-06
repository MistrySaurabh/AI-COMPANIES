import { Router } from 'express';
import { getPersonalInfo, upsertPersonalInfo } from '../controllers/personalInfoController';

const router = Router();
router.get('/', getPersonalInfo);
router.put('/', upsertPersonalInfo);

export default router;
