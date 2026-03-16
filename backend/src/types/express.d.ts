import type { Job } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: 'USER' | 'ADMIN';
      userMode: 'JOB_POSTER' | 'JOB_PICKER';
      supabaseAuthId: string;
      email: string;
      name?: string;
      username?: string;
    }

    interface Request {
      user?: UserContext;
      job?: Job;
    }
  }
}

export {};
