import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
      userRole?: Role;
    }
  }
}

export {};
