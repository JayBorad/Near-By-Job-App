import type { Job } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      id: string;
      role: 'USER' | 'ADMIN';
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
