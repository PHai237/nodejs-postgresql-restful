import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import oauthGoogleRoutes from './routes/oauthGoogle';
import oauthFacebookRoutes from './routes/oauthFacebook';
import authGatewayRoutes from './routes/authGateway';

import webRoutes from './routes/web';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import jwtRoutes from './routes/jwt';

const app = express();
const port = Number(process.env.PORT) || 3000;

// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/public', express.static(path.join(__dirname, '../public')));

// ==== OAuth routes (Google / Facebook) ====
app.use('/api/oauth/google', oauthGoogleRoutes);
app.use('/api/oauth/facebook', oauthFacebookRoutes);

// ==== Auth gateway: 1 API cho FE bắt đầu login ====
app.use('/api/auth-gateway', authGatewayRoutes);

// webRoutes(app);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/jwt', jwtRoutes);
app.use('/api', apiRoutes);

// 404 cho /api/* (đặt SAU tất cả app.use('/api/...')
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler JSON thống nhất
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err?.code === 'P2002') {
      const target =
        (err.meta && (err.meta.target as string | string[])) || undefined;
      return res.status(409).json({ error: 'Duplicate value', target });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
