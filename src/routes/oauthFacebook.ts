import { Router } from 'express';
import { randomBytes } from 'crypto';
import { prisma } from 'config/client';

const r = Router();

const FB_AUTH  = 'https://www.facebook.com/v19.0/dialog/oauth';
const FB_TOKEN = 'https://graph.facebook.com/v19.0/oauth/access_token';
const FB_ME    = 'https://graph.facebook.com/me';

function notConfigured() {
  return !(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET && process.env.FACEBOOK_CALLBACK_URL);
}

/** Bắt đầu OAuth: redirect sang Facebook */
r.get('/start', (req, res) => {
  try {
    if (notConfigured()) {
      return res.status(501).json({ error: 'Facebook OAuth not configured. Set FACEBOOK_APP_ID/SECRET/CALLBACK_URL' });
    }
    const state = randomBytes(16).toString('hex');
    (req.session as any).oauthState = state;

    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL!,
      state,
      scope: 'email,public_profile'
    });

    return res.redirect(`${FB_AUTH}?${params.toString()}`);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Facebook OAuth start failed' });
  }
});

/** Callback từ Facebook */
r.get('/callback', async (req, res) => {
  try {
    if (notConfigured()) {
      return res.status(501).json({ error: 'Facebook OAuth not configured. Set FACEBOOK_APP_ID/SECRET/CALLBACK_URL' });
    }
    const code  = String(req.query.code || '');
    const state = String(req.query.state || '');
    const expState = ((req.session as any).oauthState as string) || '';
    delete (req.session as any).oauthState;

    if (!code || !state || state !== expState) {
      return res.status(400).send('Invalid OAuth state or code');
    }

    // Đổi code lấy access_token
    const tokenParams = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL!,
      code
    });

    const tokenRes = await fetch(`${FB_TOKEN}?${tokenParams.toString()}`);
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      return res.status(400).send(`Token exchange failed: ${JSON.stringify(tokenJson?.error || tokenJson)}`);
    }

    const accessToken = tokenJson.access_token;

    // Lấy profile từ Graph API
    const meParams = new URLSearchParams({
      fields: 'id,name,email',
      access_token: accessToken
    });
    const meRes = await fetch(`${FB_ME}?${meParams.toString()}`);
    const me = await meRes.json();
    if (!meRes.ok || !me.id) {
      return res.status(400).send(`Get /me failed: ${JSON.stringify(me?.error || me)}`);
    }

    const sub = String(me.id);
    const email = me.email || undefined;
    const name = me.name || undefined;

    // Kiểm tra xem user đã có chưa, nếu chưa thì tạo user mới
    let link = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: 'facebook', providerUserId: sub } },
      include: { user: true },
    });

    let userId: number;

    if (link) {
      userId = link.userId;
    } else {
      let user = email ? await prisma.user.findUnique({ where: { email } }) : null;
      if (!user) {
        const username = email ? email.split('@')[0] : `fb_${sub}`;
        user = await prisma.user.create({ data: { email, name, username } });
      }
      userId = user.id;

      await prisma.oAuthAccount.create({
        data: { provider: 'facebook', providerUserId: sub, userId },
      });
    }

    // Đăng nhập vào session
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session regeneration failed' });
      req.session.userId = userId;
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173/');
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Facebook OAuth callback failed' });
  }
});

export default r;
