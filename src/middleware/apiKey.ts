// src/middleware/apiKey.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

function getKeyList(): string[] {
  const list = (process.env.API_KEYS || process.env.API_KEY || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return list;
}

/** Chỉ cho phép truy cập khi header x-api-key hợp lệ */
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const provided = req.header('x-api-key');
  if (!provided) return res.status(401).json({ error: 'Missing API key' });

  const keys = getKeyList();
  if (keys.length === 0) return res.status(500).json({ error: 'API key not configured' });

  const ok = keys.some(k => {
    const a = Buffer.from(k);
    const b = Buffer.from(provided);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });

  if (!ok) return res.status(401).json({ error: 'Invalid API key' });
  return next();
}

/** Cho phép: đã login (cookie session) HOẶC có API key */
export function requireAuthOrApiKey(req: Request, res: Response, next: NextFunction) {
  const hasSession = (req as any).session?.userId != null;
  if (hasSession) return next();
  return requireApiKey(req, res, next);
}
