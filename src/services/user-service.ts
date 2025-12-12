import { prisma } from 'config/client'; // Prisma để làm việc với PostgreSQL
import { db } from 'config/firebaseAdmin'; // Firestore Admin SDK

// Thêm user mới vào Postgres và Firestore
const createUser = async (fullName: string, email: string, address: string) => {
  try {
    // Tạo user trong Postgres
    const createdUser = await prisma.user.create({
      data: { name: fullName, email, address },
    });

    // Thêm dữ liệu vào Firestore
    const userRef = db.collection('users').doc(createdUser.id.toString());  // Firestore document
    await userRef.set({
      name: fullName,
      email: email,
      address: address,
      createdAt: new Date(),
    });

    console.log('User added to Firestore');
    return createdUser;
  } catch (error) {
    console.error('Error adding user to Firestore:', error);
    throw error;
  }
};

// Cập nhật thông tin người dùng trong Postgres và Firestore
const updateUser = async (userId: string, fullName: string, email: string, address: string) => {
  try {
    // Cập nhật user trong Postgres
    const updatedUser = await prisma.user.update({
      where: { id: +userId },
      data: { name: fullName, email, address },
    });

    // Cập nhật user trong Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      name: fullName,
      email: email,
      address: address,
      updatedAt: new Date(),
    });

    console.log('User updated in Firestore');
    return updatedUser;
  } catch (error) {
    console.error('Error updating user in Firestore:', error);
    throw error;
  }
};

// Xoá người dùng trong Postgres và Firestore
const deleteUser = async (userId: string) => {
  try {
    // Xoá user trong Postgres
    await prisma.user.delete({
      where: { id: +userId },
    });

    // Xoá user trong Firestore
    const userRef = db.collection('users').doc(userId);
    await userRef.delete();

    console.log('User deleted from Firestore');
  } catch (error) {
    console.error('Error deleting user from Firestore:', error);
    throw error;
  }
};

// Lấy tất cả người dùng
const getAllUsers = async () => {
  return prisma.user.findMany({ orderBy: [{ id: 'asc' }] });
};

// Lấy người dùng theo id
const getUserById = async (id: string) => {
  return prisma.user.findUnique({ where: { id: +id } });
};

export { createUser, getAllUsers, deleteUser, getUserById, updateUser };
