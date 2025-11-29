import 'express-session'; // <-- thêm dòng này

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
