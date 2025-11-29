import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export function requireJWT(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const [scheme, token] = h.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  try {
    const { sub, role } = verifyAccessToken(token);
    req.userId = Number(sub);
    req.userRole = role;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
