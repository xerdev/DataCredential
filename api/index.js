import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 1. JIKA METODE GET (Untuk script Node.js atau Load Data)
  if (req.method === 'GET') {
    // Mengambil data dari Vercel KV
    const data = await kv.get('license_users') || [];
    return res.status(200).json(data);
  }

  // 2. JIKA METODE POST (Untuk Tambah/Hapus Data)
  if (req.method === 'POST') {
    const { password, action, payload } = req.body;

    // Cek Password Admin menggunakan Environment Variable
    if (password !== process.env.ADMIN_PASSWORD) {
      // Menggunakan status 403 (Forbidden) atau 401 (Unauthorized) untuk keamanan
      return res.status(403).json({ error: 'Password Admin Salah! Akses Ditolak.' });
    }

    let currentData = await kv.get('license_users') || [];

    // Aksi Tambah User
    if (action === 'add') {
      // Pastikan ID adalah angka
      if (typeof payload.id !== 'number' || isNaN(payload.id)) {
           return res.status(400).json({ error: 'ID Lisensi harus berupa angka.' });
      }
        
      // Cek apakah ID sudah ada
      const exists = currentData.find(u => u.id === payload.id);
      if (exists) return res.status(400).json({ error: `ID ${payload.id} sudah terdaftar!` });
      
      currentData.push(payload);
      await kv.set('license_users', currentData);
      return res.status(200).json({ success: true, data: currentData });
    }

    // Aksi Hapus User
    if (action === 'delete') {
      const newData = currentData.filter(u => u.id != payload.id);
      await kv.set('license_users', newData);
      return res.status(200).json({ success: true, data: newData });
    }
  }

  // Handle method lain
  return res.status(405).json({ error: 'Method not allowed' });
}