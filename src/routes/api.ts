// src/routes/api.ts
import { Router } from 'express';
import { getUsers, getUser, postCreateUser, putUpdateUser, patchUpdateUser, deleteUserApi } from '../controllers/UserApiController';
import { basicAuth } from '../middleware/basicAuth';
import { requireApiKey } from '../middleware/apiKey';
import { requireAuthOrJWT } from '../middleware/authOrJWT';
import { requireAuthOrJWTOrApiKey } from '../middleware/authOrJWTOrApiKey';

const router = Router();

router.get('/users', getUsers);
router.get('/users/:id', getUser);

// Ghi: SESSION *hoặc* JWT
router.post('/users', requireAuthOrJWT, postCreateUser);
router.put('/users/:id', requireAuthOrJWT, putUpdateUser);
router.patch('/users/:id', requireAuthOrJWT, patchUpdateUser);

// Xoá: SESSION *hoặc* JWT *hoặc* API key
router.delete('/users/:id', requireAuthOrJWTOrApiKey, deleteUserApi);

// Basic demo
router.get('/secret', basicAuth, (_req, res) => res.json({ ok: true }));

// Export users chỉ với API key
router.get('/export/users', requireApiKey, async (_req, res) => {
  const { getAllUsers } = await import('../services/user-service');
  const data = await getAllUsers();
  res.status(200).json({ data });
});

export default router;
