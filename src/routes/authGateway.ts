// src/routes/authGateway.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from 'config/client';
import { signAccessToken, issueRefreshToken } from '../utils/jwt';
import { getGoogleClient } from '../oauth/google';

const r = Router();
const RT_COOKIE = 'rt';

function rtCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

const FB_AUTH = 'https://www.facebook.com/v19.0/dialog/oauth';

function facebookNotConfigured() {
  return !(
    process.env.FACEBOOK_APP_ID &&
    process.env.FACEBOOK_APP_SECRET &&
    process.env.FACEBOOK_CALLBACK_URL
  );
}

// === ROUTE CHÍNH – frontend CHỈ GỌI API NÀY ===
// POST /api/auth-gateway/login
// body:
//   { provider: 'password', username, password }
//   { provider: 'google' }
//   { provider: 'facebook' }
r.post('/login', async (req: Request, res: Response) => {
  const { provider } = req.body || {};

  try {
    if (!provider || provider === 'password' || provider === 'local') {
      // Đăng nhập bằng username/password (JWT)
      return loginWithPassword(req, res);
    }

    if (provider === 'google') {
      return startGoogleOAuth(req, res);
    }

    if (provider === 'facebook') {
      return startFacebookOAuth(req, res);
    }

    return res.status(400).json({ error: 'Unsupported provider' });
  } catch (e: any) {
    console.error('auth-gateway /login error:', e);
    return res.status(500).json({ error: e?.message || 'Login failed' });
  }
});

// ====== IMPLEMENT CHI TIẾT TỪNG PROVIDER ======

async function loginWithPassword(req: Request, res: Response) {
  const { username, email, password } = req.body || {};
  if ((!username && !email) || !password) {
    return res
      .status(400)
      .json({ error: 'username (hoặc email) và password là bắt buộc' });
  }

  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // tái dùng logic JWT của /api/jwt/login
  const access_token = signAccessToken(user.id, user.role);
  const { raw: refresh_raw, expiresAt } = await issueRefreshToken(user.id);

  res.cookie(RT_COOKIE, refresh_raw, {
    ...rtCookieOptions(),
    maxAge: expiresAt.getTime() - Date.now(),
  });

  // format giống /api/jwt/login để frontend dùng lại
  return res.json({
    provider: 'password',
    access_token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

function startGoogleOAuth(req: Request, res: Response) {
  // dùng lại client & env của oauthGoogle.ts
  const client = getGoogleClient(); // nếu thiếu env sẽ throw

  const state = randomBytes(16).toString('hex');
  // trùng key với oauthGoogle.ts để callback còn check được
  (req.session as any).oauthState = state;

  const url = client.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  // KHÁC với /api/oauth/google/start: ở đây trả JSON cho FE
  return res.json({ provider: 'google', redirectUrl: url });
}

function startFacebookOAuth(req: Request, res: Response) {
  if (facebookNotConfigured()) {
    return res
      .status(501)
      .json({ error: 'Facebook OAuth not configured (APP_ID/SECRET/CALLBACK_URL)' });
  }

  const state = randomBytes(16).toString('hex');
  (req.session as any).oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: process.env.FACEBOOK_CALLBACK_URL!,
    state,
    scope: 'email,public_profile',
  });

  const url = `${FB_AUTH}?${params.toString()}`;
  return res.json({ provider: 'facebook', redirectUrl: url });
}

export default r;
