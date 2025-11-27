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
 * Tampilkan Toast Notification
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - 'success', 'error', atau 'info'
 * @param {number} duration - Durasi tampil dalam ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Custom Modal/Message Box (Mengganti alert/confirm)
 * @param {string} title - Judul modal
 * @param {string} message - Isi pesan
 * @param {boolean} isConfirm - Jika true, modal menjadi konfirmasi
 * @returns {Promise<boolean>} Resolves true for OK/Yes, false for Cancel/No
 */
function showModal(title, message, isConfirm = false) {
    if (!isConfirm) {
        showToast(message, title.includes('Sukses') ? 'success' : 'error');
        return Promise.resolve(true);
    }
    return Promise.resolve(true);
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
    // Tampilkan loading pada tombol
    button.disabled = true;
    const originalText = button.textContent;
    button.innerHTML = '<span class="loader"></span>';
    
    const pass = localStorage.getItem('admin_pass');

    try {
        const res = await fetch(API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                password: pass,
                action: 'delete',
                payload: { id: parseInt(id) }
            })
        });

        const json = await res.json();
        
        if (res.ok) {
            // Jika sukses, response code 200
            render(json.data);
            showToast(`✓ Lisensi ID ${id} berhasil dihapus`, 'success');
        } else {
            // Jika gagal
            showToast(json.error || 'Gagal menghapus data', 'error');
            button.disabled = false;
            button.innerHTML = originalText;
        }
    } catch(e) {
        console.error('[DELETE] Error:', e);
        showToast('Gagal terhubung ke API', 'error');
        button.disabled = false;
        button.innerHTML = originalText;
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
    
    // Event delegation untuk tombol Hapus di level document
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const id = parseInt(e.target.getAttribute('data-delete-id'));
            deleteUser(id, e.target);
        }
    }, true);
    
    // Global functions
    window.deleteUser = deleteUser; 
    window.logout = logout; 

    const storedPass = localStorage.getItem('admin_pass');
    if (storedPass) {
        DOMElements.passInput.value = storedPass;
        login();
    }
});
