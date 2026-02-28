import type { Job } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: 'JOB_POSTER' | 'JOB_PICKER' | 'ADMIN';
      supabaseAuthId: string;
      email: string;
    }

    interface Request {
      user?: UserContext;
      job?: Job;
    }
  }
}

export {};
