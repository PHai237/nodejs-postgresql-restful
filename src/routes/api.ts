import { Router } from 'express';
import { getUsers, getUser, postCreateUser, putUpdateUser, patchUpdateUser, deleteUserApi } from '../controllers/UserApiController';
import { basicAuth } from '../middleware/basicAuth';
import { requireApiKey } from '../middleware/apiKey';
import { requireAuthOrJWT } from '../middleware/authOrJWT';
import { requireAuthOrJWTOrApiKey } from '../middleware/authOrJWTOrApiKey';

// API route for user management
const router = Router();

// Lấy tất cả người dùng
router.get('/users', getUsers);

// Lấy người dùng theo id
router.get('/users/:id', getUser);

// Thêm người dùng (dùng Auth hoặc JWT)
router.post('/users', requireAuthOrJWT, postCreateUser);

// Cập nhật người dùng theo id
router.put('/users/:id', requireAuthOrJWT, putUpdateUser);

// Cập nhật một phần người dùng theo id
router.patch('/users/:id', requireAuthOrJWT, patchUpdateUser);

// Xoá người dùng (dùng Auth, JWT hoặc API Key)
router.delete('/users/:id', requireAuthOrJWTOrApiKey, deleteUserApi);

// Route mẫu cho yêu cầu bảo vệ với basic auth
router.get('/secret', basicAuth, (_req, res) => res.json({ ok: true }));

// Export tất cả người dùng chỉ với API Key
router.get('/export/users', requireApiKey, async (_req, res) => {
  const { getAllUsers } = await import('../services/user-service');
  const data = await getAllUsers();
  res.status(200).json({ data });
});

export default router;
