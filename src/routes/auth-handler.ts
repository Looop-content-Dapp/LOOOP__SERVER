import { auth } from '@/config/auth';
import { toNodeHandler } from 'better-auth/node';

// Better Auth handler for all /api/auth/* routes
const handler = toNodeHandler(auth);

// Export the handler directly without Router to avoid path-to-regexp issues
export default handler;
