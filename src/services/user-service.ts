import { prisma } from 'config/client';

const createUser = async (fullName: string, email: string, address: string) => {
  const created = await prisma.user.create({
    data: { name: fullName, email, address }
  });
  return created;
};

const getAllUsers = async () => {
  return prisma.user.findMany({ orderBy: [{ id: 'asc' }] });
};

const deleteUser = async (id: string) => {
  await prisma.user.delete({ where: { id: +id } });
};

const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id: +id } });
};

const updateUserById = async (id: string, fullName: string, email: string, address: string) => {
  return prisma.user.update({
    where: { id: +id },
    data: { name: fullName, email, address }
  });
};

export { createUser, getAllUsers, deleteUser, getUserById, updateUserById };
