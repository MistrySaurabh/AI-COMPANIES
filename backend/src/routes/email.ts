import { Router } from 'express';
import { sendMail, checkEmailConnection } from '../controllers/emailController';

const router = Router();

router.post('/send', sendMail);
router.get('/verify', checkEmailConnection);

export default router;
