// src/routes/jwt.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from 'config/client';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../utils/jwt';
import { requireJWT } from '../middleware/authJWT';

const r = Router();
const RT_COOKIE = 'rt';

function rtCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

/** JWT login */
r.post('/login', async (req, res) => {
  const { username, email, password } = req.body || {};
  if ((!username && !email) || !password) {
    return res.status(400).json({ error: 'username (or email) & password required' });
  }

  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const access_token = signAccessToken(user.id, user.role);
  const { raw: refresh_raw, expiresAt } = await issueRefreshToken(user.id);

  res.cookie(RT_COOKIE, refresh_raw, { ...rtCookieOptions(), maxAge: expiresAt.getTime() - Date.now() });

  return res.json({
    access_token,
    user: { id: user.id, username: user.username, name: user.name, email: user.email, role: user.role }
  });
});

/** JWT refresh */
r.post('/refresh', async (req, res) => {
  const rt = req.cookies?.[RT_COOKIE];
  if (!rt) return res.status(401).json({ error: 'Missing refresh token' });

  try {
    const hash = require('crypto').createHash('sha256').update(rt).digest('hex');
    const old = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!old || old.revokedAt || old.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const me = await prisma.user.findUnique({ where: { id: old.userId }, select: { role: true } });
    const { raw: newRt, expiresAt } = await rotateRefreshToken(rt, old.userId);
    const access_token = signAccessToken(old.userId, me?.role ?? 'USER');

    res.cookie(RT_COOKIE, newRt, { ...rtCookieOptions(), maxAge: expiresAt.getTime() - Date.now() });
    return res.json({ access_token });
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/** JWT logout */
r.post('/logout', async (req, res) => {
  const rt = req.cookies?.[RT_COOKIE];
  await revokeRefreshToken(rt);
  res.clearCookie(RT_COOKIE, rtCookieOptions());
  return res.json({ ok: true });
});

/** Route mẫu cần JWT */
r.get('/profile', requireJWT, async (req, res) => {
  const userId = Number(req.userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, email: true, role: true }
  });
  return res.json({ user });
});

export default r;
