import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from 'config/client';
import type { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TTL || '7d';

export type AccessClaims = { sub: number | string; role: Role };

export function signAccessToken(userId: number, role: Role): string {
  const payload: AccessClaims = { sub: userId, role };
  // chuyển TTL string -> seconds (jsonwebtoken@9 chấp nhận number giây)
  const expiresInSec = Math.floor(msToMillis(ACCESS_TTL) / 1000);
  const opts: SignOptions = { expiresIn: expiresInSec };
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessClaims {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & Partial<AccessClaims>;
  if (!decoded || decoded.sub == null) throw new Error('Invalid token');
  const subNum = typeof decoded.sub === 'string' ? Number(decoded.sub) : decoded.sub;
  return { sub: (Number.isNaN(subNum as number) ? decoded.sub! : (subNum as number)), role: decoded.role as Role };
}

export function generateRefreshTokenString(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueRefreshToken(userId: number) {
  const raw = generateRefreshTokenString();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + msToMillis(REFRESH_TTL));

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt }
  });

  return { raw, expiresAt };
}

export async function rotateRefreshToken(oldRaw: string, userId: number) {
  const oldHash = hashToken(oldRaw);
  const old = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
  if (!old || old.userId !== userId || old.revokedAt || old.expiresAt < new Date()) {
    throw new Error('Invalid refresh token');
  }
  await prisma.refreshToken.update({
    where: { tokenHash: oldHash },
    data: { revokedAt: new Date() }
  });
  return issueRefreshToken(userId);
}

export async function revokeRefreshToken(raw?: string) {
  if (!raw) return;
  const hash = hashToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() }
  });
}

function msToMillis(ttl: string): number {
  // Hỗ trợ "15m", "7d", "3600"(s), "10s", "2h"
  const m = /^(\d+)([smhd])?$/.exec(ttl);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = m[2] || 's';
  const mult = unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}
