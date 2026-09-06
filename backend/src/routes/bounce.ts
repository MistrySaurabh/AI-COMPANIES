import { Router } from 'express';
import { processBounces } from '../controllers/bounceController';

const router = Router();

// POST /api/bounce/process — scan Gmail inbox for delivery failures and deactivate companies
router.post('/process', processBounces);

export default router;
