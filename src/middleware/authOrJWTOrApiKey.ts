import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { requireApiKey } from './apiKey';

export function requireAuthOrJWTOrApiKey(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) return next();

  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const { sub, role } = verifyAccessToken(token);
      req.userId = Number(sub);
      req.userRole = role;
      return next();
    } catch {
      // thử API key bên dưới
    }
  }
  return requireApiKey(req, res, next);
}
