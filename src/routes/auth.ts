import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from 'config/client';

const r = Router();

/** Đăng ký: { username, password, name?, email?, address? } */
r.post('/register', async (req, res) => {
  const { username, password, name, email, address } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });

  const passHash = await bcrypt.hash(password, 10);

  let user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { username, name: name ?? user.name, address: address ?? user.address, passwordHash: passHash },
    });
  } else {
    const sameUser = await prisma.user.findUnique({ where: { username } });
    if (sameUser) return res.status(409).json({ error: 'username already exists' });

    user = await prisma.user.create({
      data: { username, name, email, address, passwordHash: passHash },
    });
  }

  req.session.userId = user.id;
  return res.json({ user: { id: user.id, username: user.username, name: user.name, email: user.email } });
});

/** Đăng nhập: { username, password } (hỗ trợ email + password để linh hoạt) */
r.post('/login', async (req, res) => {
  const { username, email, password } = req.body || {};
  if ((!username && !email) || !password) return res.status(400).json({ error: 'username (or email) & password required' });

  const user = username
    ? await prisma.user.findUnique({ where: { username } })
    : await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  return res.json({ user: { id: user.id, username: user.username, name: user.name, email: user.email } });
});

r.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ ok: true });
  });
});

r.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.json({ user: null });
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, username: true, name: true, email: true },
  });
  return res.json({ user });
});

export default r;
