import { Strategy as FacebookStrategy } from 'passport-facebook';
import passport from 'passport';
import { prisma } from 'config/client';

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID as string,
  clientSecret: process.env.FACEBOOK_APP_SECRET as string,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL as string,
  profileFields: ['id', 'emails', 'name'],
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider: 'facebook', providerUserId: profile.id } },
      include: { user: true },
    });

    if (!user) {
      // Nếu không tìm thấy người dùng, tạo mới OAuth account cùng user
      user = await prisma.oAuthAccount.create({
        data: {
          provider: 'facebook',
          providerUserId: profile.id,
          user: {
            create: {
              username: profile.emails ? profile.emails[0].value.split('@')[0] : 'facebook_user',
              email: profile.emails ? profile.emails[0].value : null,
            }
          }
        },
        include: { user: true },
      });
    }

    return done(null, user.user); // Trả về thông tin người dùng
  } catch (err) {
    return done(err, null);
  }
}));

// Lưu thông tin người dùng vào session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  const user = await prisma.user.findUnique({ where: { id } });
  done(null, user);
});
