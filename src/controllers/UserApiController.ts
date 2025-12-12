// src/controllers/UserApiController.ts
import { Request, Response } from 'express';
import { createUser, deleteUser, getAllUsers, getUserById, updateUser } from 'services/user-service';

// GET /api/users
const getUsers = async (req: Request, res: Response) => {
  const users = await getAllUsers();
  return res.status(200).json({ data: users });
};

// GET /api/users/:id
const getUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.status(200).json({ data: user });
};

// POST /api/users  { name | fullName, email, address }
const postCreateUser = async (req: Request, res: Response) => {
  const { name, fullName, email, address } = req.body || {};
  const finalName = (fullName ?? name ?? '').trim();
  const finalEmail = (email ?? '').trim();
  const finalAddress = (address ?? '').trim();

  if (!finalName || !finalEmail) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const created = await createUser(finalName, finalEmail, finalAddress);
  // if (!created) {
  //   return res.status(409).json({ error: 'Cannot create user' });
  // }
  return res.status(201).json({ data: created });
};

// PUT /api/users/:id  { name | fullName, email, address } (cập nhật toàn bộ)
const putUpdateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, fullName, email, address } = req.body || {};
  const finalName = (fullName ?? name ?? '').trim();
  const finalEmail = (email ?? '').trim();
  const finalAddress = (address ?? '').trim();

  if (!finalName || !finalEmail) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  const exists = await getUserById(id);
  if (!exists) return res.status(404).json({ error: 'User not found' });

  const updated = await updateUser(id, finalName, finalEmail, finalAddress);
  return res.status(200).json({ data: updated });
};

// PATCH /api/users/:id  { name?, email?, address? } (cập nhật 1 phần)
const patchUpdateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const current = await getUserById(id);
  if (!current) return res.status(404).json({ error: 'User not found' });

  const nextName = (req.body?.name ?? req.body?.fullName ?? current.name)?.trim?.() ?? current.name;
  const nextEmail = (req.body?.email ?? current.email)?.trim?.() ?? current.email;
  const nextAddr = (req.body?.address ?? current.address)?.trim?.() ?? current.address;

  const updated = await updateUser(id, nextName, nextEmail, nextAddr);
  return res.status(200).json({ data: updated });
};

// DELETE /api/users/:id
const deleteUserApi = async (req: Request, res: Response) => {
  const { id } = req.params;
  const exists = await getUserById(id);
  if (!exists) return res.status(404).json({ error: 'User not found' });

  await deleteUser(id);
  return res.status(204).send(); // No Content
};

export { getUsers, getUser, postCreateUser, putUpdateUser, patchUpdateUser, deleteUserApi };
