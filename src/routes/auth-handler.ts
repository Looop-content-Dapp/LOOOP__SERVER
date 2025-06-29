import { Router } from 'express';
import { auth } from '@/config/auth';
import { toNodeHandler } from 'better-auth/node';

const router: Router = Router();

// Better Auth handler for all /api/auth/* routes
const handler = toNodeHandler(auth);

router.all('*', handler);

export default router;
