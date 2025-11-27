// URL API, mengarah ke api/index.js (default Vercel)
const API = '/api'; 

// Elemen DOM
const DOMElements = {
    loginBox: document.getElementById('login-box'),
    dashboard: document.getElementById('dashboard'),
    passInput: document.getElementById('pass'),
    loginBtn: document.getElementById('login-btn'),
    nameInput: document.getElementById('name'),
    idInput: document.getElementById('id'),
    waInput: document.getElementById('wa'),
    addUserBtn: document.getElementById('add-user-btn'),
    addLoader: document.getElementById('add-loader'),
    tbody: document.getElementById('tbody'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Modal
    modal: document.getElementById('custom-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalOk: document.getElementById('modal-ok'),
    modalCancel: document.getElementById('modal-cancel'),
};

/**
 * Custom Modal/Message Box (Mengganti alert/confirm)
 * @param {string} title - Judul modal
 * @param {string} message - Isi pesan
 * @param {boolean} isConfirm - Jika true, modal menjadi konfirmasi
 * @returns {Promise<boolean>} Resolves true for OK/Yes, false for Cancel/No
 */
function showModal(title, message, isConfirm = false) {
    return new Promise(resolve => {
        DOMElements.modalTitle.textContent = title;
        DOMElements.modalBody.textContent = message;
        DOMElements.modalCancel.classList.toggle('hide', !isConfirm);
        
        // Atur warna judul sesuai konteks
        DOMElements.modalTitle.style.color = isConfirm ? 'var(--danger)' : 'var(--accent)';
        
        // Listener untuk tombol OK/Ya
        const handleOk = () => {
            DOMElements.modal.classList.remove('show');
            DOMElements.modalOk.removeEventListener('click', handleOk);
            DOMElements.modalCancel.removeEventListener('click', handleCancel);
            resolve(true);
        };
        
        // Listener untuk tombol Batal/Tidak
        const handleCancel = () => {
            DOMElements.modal.classList.remove('show');
            DOMElements.modalOk.removeEventListener('click', handleOk);
            DOMElements.modalCancel.removeEventListener('click', handleCancel);
            resolve(false);
        };

        DOMElements.modalOk.addEventListener('click', handleOk);
        DOMElements.modalCancel.addEventListener('click', handleCancel);
        DOMElements.modal.classList.add('show');
    });
}

/**
 * Fungsi untuk proses Login
 */
async function login() {
    const pass = DOMElements.passInput.value;
    if (!pass) return showModal('Gagal Masuk', 'Harap isi password admin!', false);
    
    // Tampilkan loading saat mencoba login
    DOMElements.loginBtn.disabled = true;
    DOMElements.loginBtn.innerHTML = '<span class="loader"></span> Memproses...';

    // Tes koneksi & password dengan mencoba load data
    try {
        const res = await fetch(API);
        
        if (res.ok) {
            const data = await res.json(); 
            
            // Simpan password di localStorage untuk akses cepat
            localStorage.setItem('admin_pass', pass);
            DOMElements.loginBox.classList.add('hide');
            DOMElements.dashboard.classList.remove('hide');
            render(data);
        } else {
            // Walaupun GET tidak memvalidasi password, kegagalan fetch bisa karena koneksi/error server
            throw new Error('Gagal memuat data. Cek koneksi.');
        }
    } catch(e) {
        showModal('Error Koneksi', e.message || 'Terjadi kesalahan saat memuat data.', false);
    } finally {
        DOMElements.loginBtn.disabled = false;
        DOMElements.loginBtn.innerHTML = 'Masuk ke Dashboard';
    }
}

/**
 * Fungsi untuk menambah user baru
 */
async function addUser() {
    const name = DOMElements.nameInput.value.trim();
    const id = DOMElements.idInput.value.trim();
    const wa = DOMElements.waInput.value.trim();
    const pass = localStorage.getItem('admin_pass');

    if (!name || !id || !wa) return showModal('Input Error', 'Harap lengkapi semua data: Nama, ID, dan Kontak WA/Tele.', false);

    // Tampilkan loading
    DOMElements.addUserBtn.disabled = true;
    DOMElements.addLoader.classList.remove('hide');
    DOMElements.addUserBtn.style.opacity = '0.7';

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                password: pass,
                action: 'add',
                payload: { name, id: parseInt(id), no_wa: wa }
            })
        });

        const json = await res.json();
        if (res.ok) {
            render(json.data);
            DOMElements.nameInput.value = '';
            DOMElements.idInput.value = '';
            DOMElements.waInput.value = '';
            showModal('Sukses!', 'Pengguna lisensi berhasil disimpan.', false);
        } else {
            showModal('Gagal Menambah', json.error || 'Terjadi kesalahan saat menyimpan data.', false);
        }
    } catch(e) {
        showModal('Error Jaringan', 'Gagal terhubung ke API. Cek koneksi internet Anda.', false);
    } finally {
        DOMElements.addUserBtn.disabled = false;
        DOMElements.addLoader.classList.add('hide');
        DOMElements.addUserBtn.style.opacity = '1';
    }
}

/**
 * Fungsi untuk menghapus user
 * @param {number} id - ID pengguna yang akan dihapus
 * @param {HTMLButtonElement} button - Tombol yang diklik untuk menampilkan loading
 */
async function deleteUser(id, button) {
    console.log('deleteUser() dipanggil dengan ID:', id);
    
    const confirmed = await showModal(
        'Konfirmasi Hapus', 
        `Anda yakin ingin menghapus Lisensi ID: ${id}? Tindakan ini tidak dapat dibatalkan.`, 
        true
    );
    if (!confirmed) {
        console.log('User membatalkan penghapusan');
        return;
    }
    
    console.log('User mengkonfirmasi penghapusan, memproses...');
    
    // Tampilkan loading pada tombol
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '...';
    button.style.opacity = '0.7';
    
    const pass = localStorage.getItem('admin_pass');

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                password: pass,
                action: 'delete',
                payload: { id }
            })
        });

        const json = await res.json();
        console.log('Response dari API:', json);
        
        if (res.ok) {
            // Jika sukses, response code 200
            render(json.data);
            showModal('Sukses!', `Lisensi ID ${id} berhasil dihapus.`, false);
        } else {
            // Jika gagal (misal 403 Forbidden atau 400 Bad Request)
            showModal('Gagal Hapus', json.error || 'Terjadi kesalahan saat menghapus data. Cek log Vercel.', false);
        }
    } catch(e) {
        console.error('Error saat delete:', e);
        showModal('Error Jaringan', 'Gagal terhubung ke API. Cek koneksi internet Anda.', false);
    } finally {
        // Hapus loading
        button.disabled = false;
        button.textContent = originalText;
        button.style.opacity = '1';
    }
}

/**
 * Fungsi untuk merender daftar pengguna ke tabel
 * @param {Array<Object>} data - Daftar pengguna
 */
function render(data) {
    DOMElements.tbody.innerHTML = '';
    if (!data || data.length === 0) {
        DOMElements.tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Belum ada data lisensi yang tersimpan.</td></tr>';
        return;
    }
    
    data.sort((a, b) => a.id - b.id); // Urutkan berdasarkan ID
    
    // Menggunakan DocumentFragment untuk menghindari reflow
    const fragment = document.createDocumentFragment();
    
    data.forEach(u => {
        const tr = document.createElement('tr');
        
        // Membangun string HTML untuk baris
        tr.innerHTML = `
            <td class="text-id">${u.id}</td>
            <td>
                ${u.name} 
                <br> 
                <span class="text-contact">WA/Tele: ${u.no_wa}</span>
            </td>
            <td class="text-right">
                <button class="btn btn-danger delete-btn" data-delete-id="${u.id}">Hapus</button>
            </td>
        `;
        
        fragment.appendChild(tr);
    });
    
    DOMElements.tbody.appendChild(fragment);
}

/**
 * Fungsi untuk Logout / Mereset sesi
 */
function logout() {
    localStorage.removeItem('admin_pass');
    location.reload();
}

/**
 * Inisialisasi: Cek Login saat load
 */
document.addEventListener('DOMContentLoaded', () => {
    // Hubungkan fungsi ke tombol
    DOMElements.loginBtn.addEventListener('click', login);
    DOMElements.addUserBtn.addEventListener('click', addUser);
    DOMElements.logoutBtn.addEventListener('click', logout);
    
    // Event delegation untuk tombol Hapus (bekerja untuk semua tombol yang ditambah ke tabel)
    DOMElements.tbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = parseInt(e.target.getAttribute('data-delete-id'));
            console.log('Delete button clicked for ID:', id);
            deleteUser(id, e.target);
        }
    });
    
    // Global functions (needed for dynamic event listeners in render function)
    window.deleteUser = deleteUser; 
    window.logout = logout; 

    const storedPass = localStorage.getItem('admin_pass');
    if (storedPass) {
        DOMElements.passInput.value = storedPass;
        login();
    }
});
