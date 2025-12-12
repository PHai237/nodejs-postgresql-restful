// src/config/firebaseAdmin.ts
import admin from 'firebase-admin';
import path from 'path';

// Đường dẫn tới file service account JSON (ra ngoài src một cấp)
const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

// Đọc file JSON (Node.js require được JSON)
const serviceAccount = require(serviceAccountPath);

// Khởi tạo Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Lấy đối tượng Firestore
const db = admin.firestore();  // Đối tượng Firestore

export { db, admin };
