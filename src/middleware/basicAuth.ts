// src/middleware/basicAuth.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from 'config/client';

/**
 * HTTP Basic Authentication (DB-based):
 *   - Đọc header Authorization: Basic base64(username:password)
 *   - Tìm user theo username trong DB, so sánh bcrypt passwordHash
 *   - Đúng -> next(); Sai -> 401
 */
export async function basicAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Restricted"');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');

    if (!username || !password) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Restricted"');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // (tuỳ chọn) gắn userId vào req để downstream dùng tiếp
    (req as any).userId = user.id;

    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
