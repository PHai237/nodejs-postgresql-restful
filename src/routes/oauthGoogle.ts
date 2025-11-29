import { Router } from 'express';
import { randomBytes } from 'crypto';
import { getGoogleClient } from '../oauth/google';
import { prisma } from 'config/client';
import 'express-session'; // <-- rất quan trọng để TS merge SessionData augment

const r = Router();

function notConfigured() {
  return !(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

/** Bắt đầu OAuth: redirect sang Google */
r.get('/start', (req, res) => {
  try {
    if (notConfigured()) {
      return res.status(501).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI' });
    }
    const client = getGoogleClient();

    const state = randomBytes(16).toString('hex');
    req.session.oauthState = state; // đã có type trong SessionData

    const url = client.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      access_type: 'offline', // xin refresh_token
      prompt: 'consent',
      state,
    });

    return res.redirect(url);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'OAuth start failed';
    return res.status(500).json({ error: msg });
  }
});

/** Callback từ Google */
r.get('/callback', async (req, res) => {
  try {
    if (notConfigured()) {
      return res.status(501).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI' });
    }
    const client = getGoogleClient();

    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const expState = req.session.oauthState ?? '';
    req.session.oauthState = undefined; // clear bằng undefined để êm type

    if (!code || !state || state !== expState) {
      return res.status(400).send('Invalid OAuth state or code');
    }

    // Đổi code lấy tokens (gồm id_token)
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return res.status(400).send('Missing id_token');

    // Verify id_token để lấy claims (sub/email/name)
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).send('Invalid id_token');

    const sub = String(payload.sub);
    const email = payload.email || undefined;
    const name = payload.name || undefined;

    // Tìm liên kết OAuth
    let link = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: 'google', providerUserId: sub } },
      include: { user: true },
    });

    let userId: number;

    if (link) {
      userId = link.userId;
    } else {
      // map theo email nếu có
      let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
      if (!user) {
        const username = email ? email.split('@')[0] : undefined;
        user = await prisma.user.create({ data: { email, name, username } });
      }
      userId = user.id;

      await prisma.oAuthAccount.create({
        data: { provider: 'google', providerUserId: sub, userId },
      });
    }

    // Đăng nhập vào session sẵn có (giống login thường)
    req.session.userId = userId; // hợp lệ vì đã augment SessionData

    const redirectTo = process.env.FRONTEND_URL || 'http://localhost:5173/';
    return res.redirect(redirectTo);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'OAuth callback failed';
    return res.status(500).json({ error: msg });
  }
});

export default r;
