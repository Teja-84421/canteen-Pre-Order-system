/* ═══════════════════════════════════════════════════
   CANTEEN PRE-ORDER SYSTEM — Frontend Script
   Works with: Node/Express backend (Vercel + TiDB)
═══════════════════════════════════════════════════ */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5002/api'
    : '/api';

/* ─── Global helpers ─── */
function togglePw(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const isText = el.type === 'text';
    el.type = isText ? 'password' : 'text';
    const icon = btn.querySelector('i');
    if (icon) icon.className = isText ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function selectRole(role) {
    document.getElementById('loginRole').value = role;
    document.getElementById('roleStudent').classList.toggle('active', role === 'student');
    document.getElementById('roleWorker').classList.toggle('active', role === 'worker');
}

let toastTimeout;
function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    clearTimeout(toastTimeout);
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    toastTimeout = setTimeout(() => { t.className = 'toast ' + type; }, 3500);
}

/* ═══════════════════════════════════════════════════
   FOOD IMAGE LOOKUP
   Priority: 1) image_url from DB  2) name keyword  3) category
═══════════════════════════════════════════════════ */
const FOOD_IMAGES = {
    'idli':       'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',
    'dosa':       'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=280&fit=crop',
    'samosa':     'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',
    'biryani':    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=280&fit=crop',
    'chicken':    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=280&fit=crop',
    'paneer':     'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=280&fit=crop',
    'dal':        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',
    'rice':       'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=280&fit=crop',
    'roti':       'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=280&fit=crop',
    'chapati':    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=280&fit=crop',
    'noodles':    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=280&fit=crop',
    'fried rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=280&fit=crop',
    'burger':     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=280&fit=crop',
    'sandwich':   'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=280&fit=crop',
    'pizza':      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=280&fit=crop',
    'pasta':      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=280&fit=crop',
    'vada':       'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=280&fit=crop',
    'pav':        'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=280&fit=crop',
    'poha':       'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',
    'upma':       'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&h=280&fit=crop',
    'paratha':    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=280&fit=crop',
    'puri':       'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&h=280&fit=crop',
    'curry':      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=280&fit=crop',
    'soup':       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=280&fit=crop',
    'salad':      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=280&fit=crop',
    'coffee':     'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=280&fit=crop',
    'tea':        'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=280&fit=crop',
    'juice':      'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=280&fit=crop',
    'lassi':      'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&h=280&fit=crop',
    'lime':       'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=280&fit=crop',
    'milk':       'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=280&fit=crop',
    'shake':      'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=280&fit=crop',
    'egg':        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=280&fit=crop',
    'omelette':   'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400&h=280&fit=crop',
    'bread':      'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?w=400&h=280&fit=crop',
    'cake':       'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=280&fit=crop',
    'sweet':      'https://images.unsplash.com/photo-1558642891-54be180ea339?w=400&h=280&fit=crop',
    'halwa':      'https://images.unsplash.com/photo-1558642891-54be180ea339?w=400&h=280&fit=crop',
    'khichdi':    'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=280&fit=crop',
    'rajma':      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',
    'chole':      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=280&fit=crop',
    'tikka':      'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400&h=280&fit=crop',
    'kebab':      'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=280&fit=crop',
    'roll':       'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=280&fit=crop',
    'wrap':       'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=280&fit=crop',
    'thali':      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=280&fit=crop',
    'fish':       'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=280&fit=crop',
    'mutton':     'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=280&fit=crop',
    'prawn':      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=280&fit=crop',
    'masala':     'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?w=400&h=280&fit=crop',
    'bhaji':      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=280&fit=crop',
    'pakoda':     'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',
    'chips':      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=280&fit=crop',
    'fries':      'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=280&fit=crop',
};

const CATEGORY_IMAGES = {
    'Main Course': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=280&fit=crop',
    'Starter':     'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&h=280&fit=crop',
    'Breakfast':   'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=280&fit=crop',
    'Beverage':    'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=280&fit=crop',
    'Snack':       'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=280&fit=crop',
    'Fast Food':   'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=280&fit=crop',
    'default':     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=280&fit=crop',
};

const EMOJI_MAP = { 'Main Course':'🍛','Starter':'🥗','Breakfast':'🍳','Beverage':'☕','Snack':'🍿','Fast Food':'🍔' };

function getFoodImage(item) {
    if (item.image_url && item.image_url.startsWith('http')) return item.image_url;
    const nameLower = (item.name || '').toLowerCase();
    for (const [keyword, url] of Object.entries(FOOD_IMAGES)) {
        if (nameLower.includes(keyword)) return url;
    }
    return CATEGORY_IMAGES[item.category] || CATEGORY_IMAGES['default'];
}

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {

    let token       = sessionStorage.getItem('token');
    let currentUser = null;
    let menuItems   = [];
    let cart        = [];

    const allPages = {
        login:    document.getElementById('loginPage'),
        register: document.getElementById('registerPage'),
        forgot:   document.getElementById('forgotPasswordPage'),
        app:      document.getElementById('appContainer')
    };

    function showOnly(key) {
        Object.values(allPages).forEach(p => { if (p) p.classList.remove('active'); });
        if (allPages[key]) allPages[key].classList.add('active');
    }

    /* ── Restore session ── */
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp * 1000 < Date.now()) throw new Error('Expired');
            currentUser = { fullName: payload.name, userType: payload.user_type };
            showApp();
        } catch {
            sessionStorage.removeItem('token');
            showOnly('login');
        }
    } else {
        showOnly('login');
    }

    document.getElementById('showRegister')?.addEventListener('click', (e) => { e.preventDefault(); showOnly('register'); });
    document.getElementById('showLogin')?.addEventListener('click',    (e) => { e.preventDefault(); showOnly('login'); });
    document.getElementById('backToLogin')?.addEventListener('click',  (e) => { e.preventDefault(); showOnly('login'); });

    /* ═══ SHOW APP ═══ */
    function showApp() {
        showOnly('app');
        document.querySelectorAll('.dashboard').forEach(d => d.style.display = 'none');

        if (currentUser.userType === 'worker') {
            const wd = document.getElementById('workerDashboard');
            if (wd) { wd.style.display = 'flex'; setupWorkerNavigation(); }
        } else if (currentUser.userType === 'admin') {
            const ad = document.getElementById('adminDashboard');
            if (ad) { ad.style.display = 'flex'; setupAdminNavigation(); }
        } else {
            const sd = document.getElementById('studentDashboard');
            if (sd) { sd.style.display = 'flex'; loadStudentDashboard(); }
        }

        const nameEl   = document.getElementById('userName');
        const avatarEl = document.getElementById('userAvatar');
        if (nameEl)   nameEl.textContent  = currentUser.fullName || '';
        if (avatarEl) avatarEl.textContent = (currentUser.fullName || '?')[0].toUpperCase();
    }

    /* ═══ LOGIN ═══ */
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('.submit-btn');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Signing in…';
        try {
            const res  = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admission_number: document.getElementById('loginAdmissionNumber').value.trim(),
                    password:         document.getElementById('loginPassword').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                token = data.token;
                sessionStorage.setItem('token', token);
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUser = { fullName: payload.name, userType: payload.user_type };
                showApp();
                showToast('Welcome, ' + currentUser.fullName + '! 👋', 'success');
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch {
            showToast('Cannot connect to server.', 'error');
        } finally {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Sign In';
        }
    });

    /* ═══ REGISTER ═══ */
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('regPassword').value;
        const confirm  = document.getElementById('regConfirmPassword').value;
        if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
        if (password.length < 6)  { showToast('Password must be at least 6 characters', 'error'); return; }
        const btn = e.target.querySelector('.submit-btn');
        btn.disabled = true;
        try {
            const res  = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admission_number: document.getElementById('regAdmissionNumber').value.trim(),
                    full_name:        document.getElementById('regFullName').value.trim(),
                    email:            document.getElementById('regEmail').value.trim(),
                    phone:            document.getElementById('regPhone').value.trim(),
                    user_type:        document.getElementById('regUserType').value,
                    password
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Account created! Please sign in.', 'success');
                e.target.reset();
                showOnly('login');
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch { showToast('Connection error', 'error'); }
        finally { btn.disabled = false; }
    });

    /* ═══ LOGOUT ═══ */
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        sessionStorage.removeItem('token');
        token = null; currentUser = null; cart = [];
        if (window._menuRefreshTimer) clearInterval(window._menuRefreshTimer);
        showOnly('login');
        showToast('Logged out successfully');
    });

    /* ═══════════════════════════════════════════════════
       FORGOT PASSWORD
    ═══════════════════════════════════════════════════ */
    let fpEmail = '';
    let fpOtp   = '';
    let otpTimer = null;

    document.getElementById('showForgotPassword')?.addEventListener('click', (e) => {
        e.preventDefault();
        showOnly('forgot');
        showFpStep(1);
    });

    function showFpStep(n) {
        [1, 2, 3].forEach(i => {
            const el = document.getElementById('fpStep' + i);
            if (el) el.style.display = (i === n) ? 'block' : 'none';
        });
    }

    document.getElementById('forgotEmailForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        fpEmail = document.getElementById('forgotEmail').value.trim();
        const btn = e.target.querySelector('.submit-btn');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Sending…';
        try {
            const res  = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('OTP sent to ' + fpEmail, 'success');
                document.getElementById('otpEmailDisplay').textContent = fpEmail;
                showFpStep(2);
                startOtpTimer();
                document.querySelectorAll('.otp-input').forEach(i => { i.value = ''; i.classList.remove('filled'); });
                document.querySelector('.otp-input')?.focus();
            } else {
                showToast(data.error || 'Email not found', 'error');
            }
        } catch { showToast('Connection error', 'error'); }
        finally { btn.disabled = false; btn.querySelector('span').textContent = 'Send OTP'; }
    });

    function startOtpTimer() {
        if (otpTimer) clearInterval(otpTimer);
        let secs = 300;
        tick();
        otpTimer = setInterval(() => {
            secs--;
            tick();
            if (secs <= 0) { clearInterval(otpTimer); showToast('OTP expired. Please resend.', 'error'); }
        }, 1000);
        function tick() {
            const el = document.getElementById('otpCountdown');
            if (el) el.textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
        }
    }

    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((inp, idx) => {
        inp.addEventListener('input', () => {
            inp.value = inp.value.replace(/\D/, '').slice(0, 1);
            inp.classList.toggle('filled', inp.value.length > 0);
            if (inp.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
        });
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && idx > 0) {
                otpInputs[idx - 1].focus();
                otpInputs[idx - 1].value = '';
                otpInputs[idx - 1].classList.remove('filled');
            }
        });
        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text').replace(/\D/g, '');
            [...text.slice(0, 6)].forEach((ch, i) => {
                if (otpInputs[i]) { otpInputs[i].value = ch; otpInputs[i].classList.add('filled'); }
            });
            otpInputs[Math.min(text.length, 5)]?.focus();
        });
    });

    document.getElementById('verifyOtpBtn')?.addEventListener('click', async () => {
        const enteredOtp = Array.from(otpInputs).map(i => i.value).join('');
        if (enteredOtp.length < 6) { showToast('Please enter all 6 digits', 'error'); return; }
        const btn = document.getElementById('verifyOtpBtn');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Verifying…';
        try {
            const res  = await fetch(`${API_URL}/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail, otp: enteredOtp })
            });
            const data = await res.json();
            if (res.ok) {
                fpOtp = enteredOtp;
                clearInterval(otpTimer);
                showToast('OTP verified! ✅', 'success');
                showFpStep(3);
            } else {
                showToast(data.error || 'Invalid OTP', 'error');
                otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
                otpInputs[0]?.focus();
            }
        } catch { showToast('Connection error', 'error'); }
        finally { btn.disabled = false; btn.querySelector('span').textContent = 'Verify OTP'; }
    });

    document.getElementById('resendOtp')?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail })
            });
            const data = await res.json();
            if (res.ok) {
                otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
                showToast('New OTP sent to ' + fpEmail, 'success');
                startOtpTimer();
            } else { showToast(data.error || 'Failed to resend', 'error'); }
        } catch { showToast('Connection error', 'error'); }
    });

    document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPw  = document.getElementById('newPassword').value;
        const confPw = document.getElementById('confirmNewPassword').value;
        if (newPw !== confPw) { showToast('Passwords do not match', 'error'); return; }
        if (newPw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
        const btn = e.target.querySelector('.submit-btn');
        btn.disabled = true;
        try {
            const res  = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: fpEmail, otp: fpOtp, newPassword: newPw })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Password reset! Please sign in. 🎉', 'success');
                setTimeout(() => showOnly('login'), 1800);
            } else { showToast(data.error || 'Reset failed', 'error'); }
        } catch { showToast('Connection error', 'error'); }
        finally { btn.disabled = false; }
    });

    document.getElementById('newPassword')?.addEventListener('input', function () {
        const val  = this.value;
        const fill = document.getElementById('pwStrengthFill');
        const lbl  = document.getElementById('pwStrengthLabel');
        if (!fill || !lbl) return;
        let s = 0;
        if (val.length >= 8)          s++;
        if (/[A-Z]/.test(val))        s++;
        if (/[0-9]/.test(val))        s++;
        if (/[^A-Za-z0-9]/.test(val)) s++;
        const levels = [
            { pct: '0%',   color: 'transparent', text: '' },
            { pct: '25%',  color: '#ff4757',     text: 'Weak' },
            { pct: '50%',  color: '#f0c040',     text: 'Fair' },
            { pct: '75%',  color: '#5b8cff',     text: 'Good' },
            { pct: '100%', color: '#22d4a0',     text: 'Strong' }
        ];
        const lv = levels[Math.min(s, 4)];
        fill.style.width      = val ? lv.pct : '0%';
        fill.style.background = lv.color;
        lbl.textContent = val ? lv.text : '';
        lbl.style.color = lv.color;
    });

    /* ═══════════════════════════════════════════════════
       NAVIGATION SETUP
    ═══════════════════════════════════════════════════ */
    function setupNavigation(dashboardSelector, onSwitch) {
        const links = document.querySelectorAll(`${dashboardSelector} .nav-link`);
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = link.getAttribute('data-page');
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                document.querySelectorAll(`${dashboardSelector} .page-content`).forEach(p => p.classList.remove('active'));
                document.getElementById(pageId)?.classList.add('active');
                onSwitch(pageId);
            });
        });
    }

    /* ─── Student ─── */
    function loadStudentDashboard() {
        setupNavigation('#studentDashboard', (pageId) => {
            if (pageId === 'studentMenu')    loadStudentMenu();
            if (pageId === 'studentOrders')  loadStudentOrders();
            if (pageId === 'studentProfile') loadProfile();
        });
        document.querySelector('#studentDashboard .nav-link')?.click();

        // Auto-refresh student menu every 30 seconds so changes by worker appear instantly
        if (window._menuRefreshTimer) clearInterval(window._menuRefreshTimer);
        window._menuRefreshTimer = setInterval(() => {
            const menuPage = document.getElementById('studentMenu');
            if (menuPage && menuPage.classList.contains('active')) {
                loadStudentMenu();
            }
        }, 30000);
    }

    /* ─── Worker ─── */
    function setupWorkerNavigation() {
        setupNavigation('#workerDashboard', (pageId) => {
            if (pageId === 'workerOrders') loadWorkerOrders();
            if (pageId === 'workerMenu')   loadWorkerMenu();
        });
        // Auto-load orders when worker first lands
        document.querySelector('#workerDashboard .nav-link')?.click();
    }

    /* ─── Admin ─── */
    function setupAdminNavigation() {
        setupNavigation('#adminDashboard', (pageId) => {
            if (pageId === 'adminStats')  loadAdminStats();
            if (pageId === 'adminOrders') loadAdminOrders();
            if (pageId === 'adminMenu')   loadWorkerMenu('adminMenuContainer');
            if (pageId === 'adminUsers')  loadUsers();
        });
        document.querySelector('#adminDashboard .nav-link')?.click();
    }

    /* ═══════════════════════════════════════════════════
       STUDENT MENU — with cart & quantity controls
    ═══════════════════════════════════════════════════ */
    async function loadStudentMenu() {
        const container = document.getElementById('menuContainer');
        if (!container) return;
        container.innerHTML = '<p style="color:var(--text-secondary);padding:20px">Loading menu…</p>';
        try {
            const res = await fetch(`${API_URL}/menu`);
            menuItems = await res.json();
            if (!menuItems.length) {
                container.innerHTML = '<p style="color:var(--text-secondary);padding:20px">No menu items available.</p>';
                return;
            }
            container.innerHTML = '';
            menuItems.forEach(item => {
                const el       = document.createElement('div');
                const avail    = !!item.is_available;
                el.className   = 'menu-item' + (avail ? '' : ' menu-item-unavailable');
                const inCart   = cart.find(c => c.id === item.id);
                const imgSrc   = getFoodImage(item);
                el.innerHTML = `
                    <div class="menu-item-img">
                        <img src="${imgSrc}" alt="${item.name}" loading="lazy"
                             onerror="this.style.display='none'">
                        ${!avail ? `<div class="unavail-overlay">
                            <span class="unavail-label">Not Available</span>
                        </div>` : ''}
                    </div>
                    <div class="menu-item-content">
                        <span class="item-category-tag">${item.category || ''}</span>
                        <h3>${item.name}</h3>
                        <p>${item.description || 'Canteen special'}</p>
                        <div class="menu-item-price">
                            <span class="price" style="${!avail ? 'text-decoration:line-through;opacity:0.5' : ''}">₹${item.price}</span>
                            ${avail ? `
                            <div class="quantity-controls">
                                <button class="quantity-btn" onclick="changeQty(${item.id},-1)">−</button>
                                <span class="quantity" id="qty-${item.id}">${inCart?.quantity || 0}</span>
                                <button class="quantity-btn" onclick="changeQty(${item.id},1)">+</button>
                            </div>` : `<span class="unavail-tag">Currently Unavailable</span>`}
                        </div>
                    </div>`;
                container.appendChild(el);
            });
        } catch {
            container.innerHTML = '<p style="color:var(--danger);padding:20px">Failed to load menu.</p>';
        }
    }

    /* ═══════════════════════════════════════════════════
       WORKER / ADMIN MENU — clean list layout
       containerId: 'workerMenuContainer' or 'adminMenuContainer'
    ═══════════════════════════════════════════════════ */
    async function loadWorkerMenu(containerId = 'workerMenuContainer') {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '<p style="color:var(--text-secondary);padding:20px">Loading menu…</p>';
        try {
            const res   = await fetch(`${API_URL}/menu?all=1`);
            const items = await res.json();
            if (!items.length) {
                container.innerHTML = '<p style="color:var(--text-secondary);padding:20px">No menu items yet. Add one above!</p>';
                return;
            }
            container.innerHTML = items.map(item => {
                const imgSrc = getFoodImage(item);
                const avail  = !!item.is_available;
                const added  = item.created_at
                    ? new Date(item.created_at).toLocaleDateString('en-IN') : '—';
                return `
                <div class="worker-menu-row ${avail ? '' : 'worker-row-unavail'}" id="wrow-${item.id}">
                    <div class="worker-menu-thumb">
                        <img src="${imgSrc}" alt="${item.name}" loading="lazy"
                             onerror="this.style.display='none'">
                        ${!avail ? '<div class="worker-thumb-unavail">Not Available</div>' : ''}
                    </div>
                    <div class="worker-menu-info">
                        <div class="worker-menu-name">${item.name}</div>
                        <div class="worker-menu-desc">${item.description || 'No description'}</div>
                        <div class="worker-menu-meta">
                            <span class="price" style="font-size:1.1rem${!avail ? ';opacity:0.45;text-decoration:line-through' : ''}">₹${item.price}</span>
                            <span style="color:var(--text-muted);font-size:12px">
                                <i class="fas fa-clock"></i> ${added}
                            </span>
                        </div>
                    </div>
                    <div class="worker-menu-btns">
                        <!-- Availability Toggle Switch -->
                        <label class="avail-switch" title="${avail ? 'Mark as Unavailable' : 'Mark as Available'}">
                            <input type="checkbox" ${avail ? 'checked' : ''}
                                   onchange="toggleMenuItem(${item.id}, ${avail ? 1 : 0}, '${containerId}', this)">
                            <span class="avail-track">
                                <span class="avail-thumb"></span>
                            </span>
                            <span class="avail-switch-label">${avail ? 'Available' : 'Not Available'}</span>
                        </label>
                        <button class="wbtn wbtn-edit" onclick="editMenuItem(${item.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="wbtn wbtn-delete" onclick="deleteMenuItem(${item.id}, '${containerId}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>`;
            }).join('');
        } catch {
            container.innerHTML = '<p style="color:var(--danger);padding:20px">Failed to load menu.</p>';
        }
    }

    /* Edit menu item — opens modal pre-filled */
    window.editMenuItem = async function (itemId) {
        try {
            const res   = await fetch(`${API_URL}/menu`);
            const items = await res.json();
            const item  = items.find(i => i.id === itemId);
            if (!item) return;
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-pencil-alt"></i> Edit Menu Item';
            document.getElementById('itemId').value          = item.id;
            document.getElementById('itemName').value        = item.name;
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemPrice').value       = item.price;
            document.getElementById('itemCategory').value    = item.category;
            document.getElementById('itemImage').value       = item.image_url || '';
            document.getElementById('itemAvailable').checked = !!item.is_available;
            document.getElementById('menuItemModal')?.classList.add('active');
        } catch { showToast('Failed to load item', 'error'); }
    };

    /* Toggle available / unavailable — instant UI, no full reload */
    window.toggleMenuItem = async function (itemId, currentStatus, containerId, checkbox) {
        const newStatus = currentStatus ? 0 : 1;
        const row       = document.getElementById('wrow-' + itemId);
        const label     = checkbox?.closest('.avail-switch')?.querySelector('.avail-switch-label');
        const priceEl   = row?.querySelector('.price');
        const thumbDiv  = row?.querySelector('.worker-menu-thumb');

        // Optimistic UI update instantly
        if (row) {
            row.classList.toggle('worker-row-unavail', !newStatus);
            if (newStatus) {
                thumbDiv?.querySelector('.worker-thumb-unavail')?.remove();
                if (priceEl) { priceEl.style.opacity='1'; priceEl.style.textDecoration='none'; }
                if (label)   label.textContent = 'Available';
            } else {
                if (thumbDiv && !thumbDiv.querySelector('.worker-thumb-unavail')) {
                    const d = document.createElement('div');
                    d.className = 'worker-thumb-unavail';
                    d.textContent = 'Not Available';
                    thumbDiv.appendChild(d);
                }
                if (priceEl) { priceEl.style.opacity='0.45'; priceEl.style.textDecoration='line-through'; }
                if (label)   label.textContent = 'Not Available';
            }
        }

        try {
            const res = await fetch(`${API_URL}/menu/${itemId}/toggle`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ is_available: newStatus })
            });
            if (res.ok) {
                showToast(newStatus ? '✅ Available — students can order' : '🚫 Not Available — hidden from students', newStatus ? 'success' : '');
                const studentMenuPage = document.getElementById('studentMenu');
                if (studentMenuPage && studentMenuPage.classList.contains('active')) loadStudentMenu();
            } else {
                if (checkbox) checkbox.checked = !!currentStatus;
                showToast('Failed to update', 'error');
                loadWorkerMenu(containerId);
            }
        } catch {
            if (checkbox) checkbox.checked = !!currentStatus;
            showToast('Connection error', 'error');
        }
    };

    /* Delete menu item */
    window.deleteMenuItem = async function (itemId, containerId) {
        if (!confirm('Delete this menu item? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/menu/${itemId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Item deleted. Student menu updated.', 'success');
                loadWorkerMenu(containerId);
                // Also refresh student menu if open
                const studentMenuPage = document.getElementById('studentMenu');
                if (studentMenuPage && studentMenuPage.classList.contains('active')) loadStudentMenu();
            } else { showToast('Failed to delete', 'error'); }
        } catch { showToast('Connection error', 'error'); }
    };

    /* ═══════════════════════════════════════════════════
       CART
    ═══════════════════════════════════════════════════ */
    window.changeQty = function (itemId, delta) {
        const item = menuItems.find(m => m.id === itemId);
        if (!item) return;
        const existing = cart.find(c => c.id === itemId);
        if (existing) {
            existing.quantity += delta;
            if (existing.quantity <= 0) cart = cart.filter(c => c.id !== itemId);
        } else if (delta > 0) {
            cart.push({ ...item, quantity: 1 });
        }
        const qtyEl = document.getElementById('qty-' + itemId);
        if (qtyEl) qtyEl.textContent = cart.find(c => c.id === itemId)?.quantity || 0;
        updateCartUI();
    };

    function updateCartUI() {
        const cartItems = document.getElementById('cartItems');
        const cartTotal = document.getElementById('cartTotal');
        if (!cartItems || !cartTotal) return;
        let total = 0;
        cartItems.innerHTML = cart.length
            ? cart.map(item => {
                const sub = item.price * item.quantity;
                total += sub;
                return `<div class="cart-item"><span>${item.name} × ${item.quantity}</span><span>₹${sub}</span></div>`;
              }).join('')
            : '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Cart is empty</p>';
        cartTotal.textContent = total;
    }

    /* ═══════════════════════════════════════════════════
       CHECKOUT
       FLOW:
       Cash   → Confirm → place order immediately
       Online → place order (pending) → open UPI app
              → when user returns to tab → mark paid → show success
    ═══════════════════════════════════════════════════ */
    const UPI_ID   = 'sodemunithanmayteja-1@oksbi'; // ← your PhonePe UPI ID
    const UPI_NAME = 'Sode Muni Thanmay Te';

    const checkoutModal   = document.getElementById('checkoutModal');
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');

    // Tracks pending online order waiting for UPI return
    let pendingOnlineOrderId     = null;
    let pendingOnlineOrderNumber = null;
    let upiReturnHandler         = null;

    /* ── Open checkout modal ── */
    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
        if (!cart.length) { showToast('Add items to your cart first', 'error'); return; }
        checkoutModal?.classList.add('active');
        let total = 0;
        document.getElementById('checkoutItems').innerHTML = cart.map(item => {
            const sub = item.price * item.quantity; total += sub;
            return `<div class="cart-item"><span>${item.name} × ${item.quantity}</span><span>₹${sub}</span></div>`;
        }).join('');
        document.getElementById('checkoutTotal').textContent = total;
        // Always reset to cash when opening
        document.getElementById('payCash').checked   = true;
        document.getElementById('payOnline').checked = false;
        showPaymentUI('cash', total);
    });

    /* ── Show QR or cash note depending on selection ── */
    function showPaymentUI(method, amount) {
        const qrSection  = document.getElementById('qrSection');
        const cashNote   = document.getElementById('cashNote');
        const btnText    = document.getElementById('confirmBtnText');
        const qrImg      = document.getElementById('qrImage');
        const qrAmt      = document.getElementById('qrAmountDisplay');

        if (method === 'online') {
            const upiURL = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=CanteenOrder`;
            const qrSrc  = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiURL)}&bgcolor=ffffff&color=000000&margin=10`;
            qrImg.src         = qrSrc;
            qrAmt.textContent = amount;
            qrSection.style.display = 'block';
            cashNote.style.display  = 'none';
            btnText.textContent     = 'Pay & Confirm Order';
        } else {
            qrSection.style.display = 'none';
            cashNote.style.display  = 'flex';
            btnText.textContent     = 'Confirm Order';
            qrImg.src = '';
        }
    }

    /* ── Payment method toggle ── */
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            showPaymentUI(radio.value, total);
        });
    });

    /* ── Place order helper ── */
    async function placeOrder(items, totalAmount, method, paymentStatus) {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ items, total_amount: totalAmount, payment_method: method, payment_status: paymentStatus })
        });
        return res;
    }

    /* ── Confirm button ── */
    confirmOrderBtn?.addEventListener('click', async () => {
        const method      = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cash';
        const totalAmount = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const btn         = confirmOrderBtn;

        /* ════ CASH FLOW ════ */
        if (method === 'cash') {
            btn.disabled = true;
            document.getElementById('confirmBtnText').textContent = 'Placing order…';
            try {
                const res  = await placeOrder(cart, totalAmount, 'cash', 'pending');
                const data = await res.json();
                if (res.ok) {
                    onOrderSuccess(data.order_number);
                } else { showToast(data.error || 'Order failed', 'error'); }
            } catch { showToast('Connection error', 'error'); }
            finally {
                btn.disabled = false;
                document.getElementById('confirmBtnText').textContent = 'Confirm Order';
            }
            return;
        }

        /* ════ ONLINE UPI FLOW ════
           Step 1: Save order as pending in DB
           Step 2: Open UPI app (upi:// deep link)
           Step 3: When user returns to this tab (visibilitychange),
                   mark order as paid and show success — just like
                   Swiggy / IRCTC / BookMyShow do it
        ════════════════════════════════════════ */
        btn.disabled = true;
        document.getElementById('confirmBtnText').textContent = 'Saving order…';

        try {
            // Step 1 — create order with payment_status = pending
            const res  = await placeOrder(cart, totalAmount, 'online', 'pending');
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Order failed', 'error'); btn.disabled = false; document.getElementById('confirmBtnText').textContent = 'Pay & Confirm Order'; return; }

            pendingOnlineOrderId     = data.order_id;
            pendingOnlineOrderNumber = data.order_number;

            // Step 2 — show "Opening PhonePe…" state
            document.getElementById('confirmBtnText').textContent = 'Opening PhonePe…';
            showWaitingState(totalAmount);

            // Step 3 — open UPI deep link (opens PhonePe / GPay / any UPI app)
            const upiURL = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${totalAmount}&cu=INR&tn=${pendingOnlineOrderNumber}`;
            window.location.href = upiURL;

            // Step 4 — when user comes BACK to this tab after paying,
            //           visibilitychange fires → auto-confirm the order
            if (upiReturnHandler) document.removeEventListener('visibilitychange', upiReturnHandler);
            upiReturnHandler = async function () {
                if (document.visibilityState === 'visible' && pendingOnlineOrderId) {
                    document.removeEventListener('visibilitychange', upiReturnHandler);
                    upiReturnHandler = null;

                    // Small delay so UPI app fully closes first
                    await new Promise(r => setTimeout(r, 800));

                    // Mark the order as paid
                    await fetch(`${API_URL}/orders/${pendingOnlineOrderId}/payment`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ payment_status: 'paid' })
                    });

                    onOrderSuccess(pendingOnlineOrderNumber);
                    pendingOnlineOrderId     = null;
                    pendingOnlineOrderNumber = null;
                }
            };
            document.addEventListener('visibilitychange', upiReturnHandler);

        } catch { showToast('Connection error', 'error'); btn.disabled = false; document.getElementById('confirmBtnText').textContent = 'Pay & Confirm Order'; }
    });

    /* ── Show waiting state inside QR card after UPI opens ── */
    function showWaitingState(amount) {
        const qrSection = document.getElementById('qrSection');
        qrSection.innerHTML = `
            <div class="qr-card">
                <div class="qr-waiting-icon"><i class="fas fa-spinner fa-spin"></i></div>
                <p class="qr-waiting-title">Waiting for Payment…</p>
                <p class="qr-waiting-sub">Complete ₹${amount} payment in your UPI app.<br>
                This page will update <strong>automatically</strong> once done.</p>
                <div class="qr-amount-pill" style="margin-top:16px">₹${amount}</div>
            </div>`;
    }

    /* ── Called after any successful order ── */
    function onOrderSuccess(orderNumber) {
        showToast('Order confirmed! 🎉 #' + orderNumber, 'success');
        cart = [];
        updateCartUI();
        document.querySelectorAll('.quantity').forEach(el => el.textContent = '0');
        checkoutModal?.classList.remove('active');
        // Restore QR section for next time
        document.getElementById('qrSection').innerHTML = `
            <div class="qr-card">
                <div class="qr-header">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/PhonePe_Logo.png/120px-PhonePe_Logo.png" alt="PhonePe" style="height:28px;object-fit:contain">
                    <span class="qr-accepted">ACCEPTED HERE</span>
                </div>
                <p class="qr-scan-text">Scan &amp; Pay Using PhonePe / Any UPI App</p>
                <div class="qr-img-wrap"><img id="qrImage" src="" alt="QR Code"/></div>
                <div class="qr-amount-pill">Pay ₹<span id="qrAmountDisplay">0</span></div>
                <p class="qr-name">SODE MUNI THANMAY TE</p>
                <p class="qr-instruction">Tap <strong>"Pay & Confirm Order"</strong> — your UPI app will open automatically.</p>
            </div>`;
        confirmOrderBtn.disabled = false;
        document.getElementById('confirmBtnText').textContent = 'Pay & Confirm Order';
    }

    /* ═══════════════════════════════════════════════════
       STUDENT ORDERS
    ═══════════════════════════════════════════════════ */
    async function loadStudentOrders() {
        const cont = document.getElementById('studentOrdersContainer');
        if (!cont) return;
        cont.innerHTML = '<p style="color:var(--text-secondary)">Loading orders…</p>';
        try {
            const res    = await fetch(`${API_URL}/orders/my-orders`, { headers: { Authorization: `Bearer ${token}` } });
            const orders = await res.json();
            if (!orders.length) {
                cont.innerHTML = '<p style="color:var(--text-secondary);padding:20px">No orders yet. Go order something! 😋</p>';
                return;
            }
            cont.innerHTML = orders.map(o => `
                <div class="order-card">
                    <div class="order-header">
                        <span class="order-number">#${o.order_number}</span>
                        <span class="order-status status-${o.status}">${o.status}</span>
                    </div>
                    ${o.items?.length ? `<div class="order-details">${o.items.map(i => `
                        <div class="order-item">
                            <span>${i.name} × ${i.quantity}</span>
                            <span>₹${i.price * i.quantity}</span>
                        </div>`).join('')}</div>` : ''}
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
                        <span style="color:var(--text-muted);font-size:12px">${o.payment_method} · ${new Date(o.order_date || Date.now()).toLocaleDateString('en-IN')}</span>
                        <span class="order-total">₹${o.total_amount}</span>
                    </div>
                </div>`).join('');
        } catch { cont.innerHTML = '<p style="color:var(--danger)">Failed to load orders.</p>'; }
    }

    /* ═══════════════════════════════════════════════════
       WORKER ORDERS — shows all student orders with status updater
    ═══════════════════════════════════════════════════ */
    async function loadWorkerOrders() {
        const cont = document.getElementById('workerOrdersContainer');
        if (!cont) return;
        cont.innerHTML = '<p style="color:var(--text-secondary)">Loading orders…</p>';
        try {
            const filter = document.getElementById('orderFilter')?.value || 'all';
            const url    = filter !== 'all' ? `${API_URL}/orders?status=${filter}` : `${API_URL}/orders`;
            const res    = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const orders = await res.json();
            if (!orders.length) {
                cont.innerHTML = '<p style="color:var(--text-secondary);padding:20px">No orders found.</p>';
                return;
            }
            cont.innerHTML = orders.map(o => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <span class="order-number">#${o.order_number}</span>
                            <span style="color:var(--text-secondary);font-size:13px;margin-left:10px">
                                <i class="fas fa-user" style="color:var(--accent);margin-right:4px"></i>${o.full_name || '—'}
                            </span>
                            <span style="color:var(--text-muted);font-size:12px;margin-left:8px">
                                <i class="fas fa-id-card" style="margin-right:3px"></i>${o.admission_number || '—'}
                            </span>
                        </div>
                        <span class="order-status status-${o.status}">${o.status}</span>
                    </div>
                    <div style="color:var(--text-secondary);font-size:13px;margin:8px 0">
                        <i class="fas fa-rupee-sign" style="color:var(--accent)"></i> ₹${o.total_amount}
                        &nbsp;·&nbsp; ${o.payment_method}
                        &nbsp;·&nbsp; ${new Date(o.order_date || Date.now()).toLocaleDateString('en-IN')}
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
                        <span style="color:var(--text-muted);font-size:13px">Update Status:</span>
                        <select onchange="updateOrderStatus(${o.id}, this.value)"
                            style="background:var(--input-bg);border:1px solid var(--border);color:var(--text-primary);
                                   padding:7px 12px;border-radius:8px;font-size:13px;cursor:pointer;flex:1">
                            ${['pending','confirmed','preparing','ready','completed','cancelled']
                                .map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`)
                                .join('')}
                        </select>
                    </div>
                </div>`).join('');
        } catch { cont.innerHTML = '<p style="color:var(--danger)">Failed to load orders.</p>'; }
    }

    /* ═══════════════════════════════════════════════════
       ADMIN ORDERS
    ═══════════════════════════════════════════════════ */
    async function loadAdminOrders() {
        const cont = document.getElementById('adminOrdersContainer');
        if (!cont) return;
        cont.innerHTML = '<p style="color:var(--text-secondary)">Loading orders…</p>';
        try {
            const res    = await fetch(`${API_URL}/orders`, { headers: { Authorization: `Bearer ${token}` } });
            const orders = await res.json();
            if (!orders.length) {
                cont.innerHTML = '<p style="color:var(--text-secondary);padding:20px">No orders found.</p>';
                return;
            }
            cont.innerHTML = orders.map(o => `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <span class="order-number">#${o.order_number}</span>
                            <span style="color:var(--text-secondary);font-size:13px;margin-left:10px">${o.full_name || '—'}</span>
                        </div>
                        <span class="order-status status-${o.status}">${o.status}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
                        <select onchange="updateOrderStatus(${o.id}, this.value)"
                            style="background:var(--input-bg);border:1px solid var(--border);color:var(--text-primary);
                                   padding:7px 12px;border-radius:8px;font-size:13px;cursor:pointer">
                            ${['pending','confirmed','preparing','ready','completed','cancelled']
                                .map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`)
                                .join('')}
                        </select>
                        <span class="order-total">₹${o.total_amount}</span>
                    </div>
                </div>`).join('');
        } catch { cont.innerHTML = '<p style="color:var(--danger)">Failed to load orders.</p>'; }
    }

    window.updateOrderStatus = async function (orderId, status) {
        try {
            const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status })
            });
            if (res.ok) showToast('Status updated: ' + status, 'success');
            else showToast('Failed to update status', 'error');
        } catch { showToast('Connection error', 'error'); }
    };

    document.getElementById('orderFilter')?.addEventListener('change', loadWorkerOrders);

    /* ═══════════════════════════════════════════════════
       PROFILE
    ═══════════════════════════════════════════════════ */
    async function loadProfile() {
        const el = document.getElementById('profileInfo');
        if (!el) return;
        el.innerHTML = '<p style="color:var(--text-secondary)">Loading…</p>';
        try {
            const res  = await fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            el.innerHTML = `
                <div class="profile-field"><label>Full Name</label><span>${data.full_name}</span></div>
                <div class="profile-field"><label>Admission No.</label><span>${data.admission_number}</span></div>
                <div class="profile-field"><label>Email</label><span>${data.email || '—'}</span></div>
                <div class="profile-field"><label>Phone</label><span>${data.phone || '—'}</span></div>
                <div class="profile-field"><label>Role</label><span style="text-transform:capitalize">${data.user_type}</span></div>`;
        } catch { el.innerHTML = '<p style="color:var(--danger)">Failed to load profile.</p>'; }
    }

    /* ═══════════════════════════════════════════════════
       ADMIN STATS
    ═══════════════════════════════════════════════════ */
    async function loadAdminStats() {
        const cont = document.getElementById('statsContainer');
        if (!cont) return;
        try {
            const res  = await fetch(`${API_URL}/stats`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            cont.innerHTML = `
                <div class="stat-card"><div class="stat-number">${data.total_orders}</div><div class="stat-label">Total Orders</div></div>
                <div class="stat-card"><div class="stat-number">${data.pending_orders}</div><div class="stat-label">Pending Orders</div></div>
                <div class="stat-card"><div class="stat-number">₹${data.total_revenue}</div><div class="stat-label">Total Revenue</div></div>
                <div class="stat-card"><div class="stat-number">${data.total_users}</div><div class="stat-label">Students</div></div>`;
        } catch { cont.innerHTML = '<p style="color:var(--danger)">Failed to load stats.</p>'; }
    }

    /* ═══════════════════════════════════════════════════
       ADMIN USERS
    ═══════════════════════════════════════════════════ */
    async function loadUsers() {
        const cont = document.getElementById('usersContainer');
        if (!cont) return;
        try {
            const res   = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } });
            const users = await res.json();
            cont.innerHTML = users.map(u => `
                <div class="order-card" style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <div style="font-weight:600;color:var(--text-primary)">${u.full_name}</div>
                        <div style="font-size:13px;color:var(--text-secondary)">${u.admission_number} · ${u.email || 'No email'}</div>
                    </div>
                    <span class="order-status status-${u.user_type === 'student' ? 'confirmed' : 'ready'}"
                          style="text-transform:capitalize">${u.user_type}</span>
                </div>`).join('');
        } catch { cont.innerHTML = '<p style="color:var(--danger)">Failed to load users.</p>'; }
    }

    /* ═══════════════════════════════════════════════════
       MENU ITEM MODAL (Add / Edit)
    ═══════════════════════════════════════════════════ */
    const menuItemModal = document.getElementById('menuItemModal');

    document.getElementById('addMenuItemBtn')?.addEventListener('click', () => {
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-utensils"></i> Add Menu Item';
        document.getElementById('menuItemForm')?.reset();
        document.getElementById('itemId').value = '';
        menuItemModal?.classList.add('active');
    });

    document.getElementById('menuItemForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId  = document.getElementById('itemId').value;
        const payload = {
            name:         document.getElementById('itemName').value,
            description:  document.getElementById('itemDescription').value,
            price:        parseFloat(document.getElementById('itemPrice').value),
            category:     document.getElementById('itemCategory').value,
            image_url:    document.getElementById('itemImage').value || null,
            is_available: document.getElementById('itemAvailable').checked ? 1 : 0
        };
        const url    = itemId ? `${API_URL}/menu/${itemId}` : `${API_URL}/menu`;
        const method = itemId ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                showToast(itemId ? 'Item updated! Students will see changes shortly.' : 'Item added!', 'success');
                menuItemModal?.classList.remove('active');
                // Reload worker/admin menu container
                const workerCont = document.getElementById('workerMenuContainer');
                const adminCont  = document.getElementById('adminMenuContainer');
                if (workerCont && workerCont.closest('.page-content.active')) loadWorkerMenu('workerMenuContainer');
                if (adminCont  && adminCont.closest('.page-content.active'))  loadWorkerMenu('adminMenuContainer');
                // Also reload student menu silently so students see changes
                const studentMenuPage = document.getElementById('studentMenu');
                if (studentMenuPage && studentMenuPage.classList.contains('active')) loadStudentMenu();
            } else { showToast('Failed to save item', 'error'); }
        } catch { showToast('Connection error', 'error'); }
    });

    /* ─── Modal close ─── */
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.modal')?.classList.remove('active'));
    });
    [checkoutModal, menuItemModal].forEach(m => {
        m?.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
    });

});
