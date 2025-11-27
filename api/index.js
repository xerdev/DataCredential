import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Ambil password dari environment variable Vercel
  const ADMIN_PASS = "FirmanID123";
  // 1. JIKA METODE GET (Untuk script Node.js atau Load Data)
  if (req.method === 'GET') {
    const data = await kv.get('license_users') || [];
    console.log('GET /api: Data berhasil dimuat.');
    return res.status(200).json(data);
  }

  // 2. JIKA METODE POST (Untuk Tambah/Hapus Data)
  if (req.method === 'POST') {
    const { password, action, payload } = req.body;
    
    console.log('POST /api: Menerima permintaan. Action:', action);

    // Cek Password Admin
    if (!ADMIN_PASS) {
        console.error('ERROR: ADMIN_PASSWORD Environment Variable TIDAK diatur di Vercel.');
        return res.status(500).json({ error: 'Kesalahan Server: Kunci ADMIN_PASSWORD tidak ditemukan.' });
    }

    if (password !== ADMIN_PASS) {
      console.error('ERROR: Password yang dikirim tidak cocok. Akses Ditolak.');
      return res.status(403).json({ error: 'Password Admin Salah! Akses Ditolak untuk operasi tulis.' });
    }
    
    let currentData = await kv.get('license_users') || [];

    // Aksi Tambah User
    if (action === 'add') {
      // Pastikan ID adalah angka dan tidak nol/kosong
      const newId = parseInt(payload.id);
      if (typeof newId !== 'number' || isNaN(newId) || newId <= 0) {
           return res.status(400).json({ error: 'ID Lisensi harus berupa angka positif.' });
      }
        
      // Cek apakah ID sudah ada
      const exists = currentData.find(u => u.id === newId);
      if (exists) return res.status(400).json({ error: `ID ${newId} sudah terdaftar!` });
      
      const newPayload = { ...payload, id: newId }; // Pastikan ID bertipe number
      currentData.push(newPayload);
      
      await kv.set('license_users', currentData);
      console.log('SUCCESS: User baru ditambahkan. ID:', newId);
      return res.status(200).json({ success: true, data: currentData });
    }

    // Aksi Hapus User
    if (action === 'delete') {
      const idToDelete = parseInt(payload.id);
      console.log(`DELETE: Mencoba menghapus ID ${idToDelete}, tipe: ${typeof idToDelete}, currentData length: ${currentData.length}`);
      
      // Filter data: buat array baru yang TIDAK mengandung ID yang ingin dihapus.
      const newData = currentData.filter(u => u.id !== idToDelete); 
      
      if (newData.length === currentData.length) {
          console.log(`WARN: ID ${idToDelete} tidak ditemukan. Data sebelum filter:`, currentData);
          // Mengembalikan data saat ini dan pesan error, tetapi dengan status 200 agar klien tidak crash
          return res.status(200).json({ success: false, data: currentData, error: `ID ${idToDelete} tidak ditemukan.` });
      }

      await kv.set('license_users', newData);
      console.log('SUCCESS: User ID:', idToDelete, 'berhasil dihapus. Data baru:', newData);
      return res.status(200).json({ success: true, data: newData });
    }
  }

  // Handle method lain
  return res.status(405).json({ error: 'Method not allowed' });
}
