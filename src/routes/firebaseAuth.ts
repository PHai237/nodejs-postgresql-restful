// src/routes/firebaseAuth.ts
import { Router } from 'express';
import { admin } from '../config/firebaseAdmin';
import { prisma } from 'config/client';
import { signAccessToken, issueRefreshToken } from '../utils/jwt';

const r = Router();
const RT_COOKIE = 'rt';

function rtCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

// POST /api/firebase/login
// body: { idToken: string }
r.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'idToken is required' });
    }

    // 1) Verify idToken bằng Firebase Admin
    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const email = decoded.email || undefined;
    const name = (decoded.name as string | undefined) || undefined;

    // 2) Tìm OAuthAccount(provider='firebase', providerUserId=firebaseUid)
    let link = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'firebase',
          providerUserId: firebaseUid,
        },
      },
      include: { user: true },
    });

    let user = link?.user;
    if (!user) {
      // Nếu chưa có link, map theo email trước (nếu có)
      if (email) {
        user = await prisma.user.findUnique({ where: { email } }) || undefined;
      }

      // Nếu vẫn chưa có user => tạo mới
      if (!user) {
        const username =
          email ? email.split('@')[0] : `fb_${firebaseUid.slice(0, 8)}`;

        user = await prisma.user.create({
          data: {
            email,
            name,
            username,
          },
        });
      }

      // Tạo link OAuthAccount
      await prisma.oAuthAccount.create({
        data: {
          provider: 'firebase',
          providerUserId: firebaseUid,
          userId: user.id,
        },
      });
    }

    const userId = user.id;

    // 3) Sinh access_token + refresh_token giống JWT login
    const access_token = signAccessToken(userId, user.role);
    const { raw: refresh_raw, expiresAt } = await issueRefreshToken(userId);

    res.cookie(RT_COOKIE, refresh_raw, {
      ...rtCookieOptions(),
      maxAge: expiresAt.getTime() - Date.now(),
    });

    // 4) Trả về cho frontend đúng format bạn đang dùng
    return res.json({
      provider: 'firebase',
      access_token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e: any) {
    console.error('Firebase login error:', e);
    return res.status(401).json({ error: 'Invalid Firebase idToken' });
  }
});

export default r;
