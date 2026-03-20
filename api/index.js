const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5002;

/* ═══════════════════════════════════════════════
   CORS
   Allows your Vercel URL + localhost for dev
═══════════════════════════════════════════════ */
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://localhost:5002'
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (Postman, server-to-server) and allowed list
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        // On Vercel, same-origin requests have no separate origin — allow all
        if (process.env.VERCEL) return cb(null, true);
        cb(new Error('CORS blocked: ' + origin));
    },
    credentials: true
}));

app.use(express.json());

/* ── Serve static files (public/) ── */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ═══════════════════════════════════════════════
   TiDB CLOUD — Connection Pool
   
   TiDB Cloud connection string looks like:
   mysql://user:pass@gateway01.xx.tidbcloud.com:4000/dbname?ssl-mode=VERIFY_IDENTITY
   
   Get values from: TiDB Cloud → Connect → Node.js
═══════════════════════════════════════════════ */
let db = null;

function getDBConfig() {
    const config = {
        host:               process.env.TIDB_HOST,
        port:               parseInt(process.env.TIDB_PORT || '4000'),
        user:               process.env.TIDB_USER,
        password:           process.env.TIDB_PASSWORD,
        database:           process.env.TIDB_DATABASE || 'canteen_system',
        waitForConnections: true,
        connectionLimit:    5,       // keep low for serverless
        queueLimit:         0,
        connectTimeout:     10000
    };

    // TiDB Cloud ALWAYS needs SSL
    // Do NOT set rejectUnauthorized: false — TiDB cert is valid
    if (process.env.TIDB_SSL === 'true') {
        config.ssl = { minVersion: 'TLSv1.2' };
    }

    return config;
}

function getDB() {
    if (!db) {
        db = mysql.createPool(getDBConfig());
        console.log('✅ TiDB pool created');
    }
    return db;
}

/* ═══════════════════════════════════════════════
   EMAIL (OTP via Gmail)
   Set MAIL_USER + MAIL_PASS in Vercel env vars
═══════════════════════════════════════════════ */
function getMailer() {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
    });
}

/* ── In-memory OTP store (resets on cold start — fine for serverless) ── */
const otpStore = new Map();

/* ═══════════════════════════════════════════════
   JWT MIDDLEWARE
═══════════════════════════════════════════════ */
const JWT_SECRET = process.env.JWT_SECRET || 'canteen-dev-secret';

function auth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
    }
}

function workerOrAdmin(req, res, next) {
    if (!['worker', 'admin'].includes(req.user?.user_type))
        return res.status(403).json({ error: 'Access denied: workers and admins only' });
    next();
}

/* ═══════════════════════════════════════════════
   HEALTH CHECK
═══════════════════════════════════════════════ */
app.get('/api/health', async (req, res) => {
    try {
        await getDB().execute('SELECT 1');
        res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ status: 'error', db: err.message });
    }
});

/* ═══════════════════════════════════════════════
   AUTH — REGISTER
═══════════════════════════════════════════════ */
app.post('/api/register', async (req, res) => {
    const { admission_number, full_name, email, phone, password, user_type } = req.body;
    if (!admission_number?.trim() || !full_name?.trim() || !password)
        return res.status(400).json({ error: 'Admission number, full name and password are required' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        const pool = getDB();

        // Check duplicate
        const [dup] = await pool.execute(
            'SELECT id FROM users WHERE admission_number = ?', [admission_number.trim()]
        );
        if (dup.length) return res.status(409).json({ error: 'Admission number already registered' });

        const hashed = await bcrypt.hash(password, 10);
        await pool.execute(
            `INSERT INTO users (admission_number, full_name, email, phone, password, user_type)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                admission_number.trim(),
                full_name.trim(),
                email?.trim() || null,
                phone?.trim() || null,
                hashed,
                user_type || 'student'
            ]
        );
        res.status(201).json({ message: 'Registration successful' });
    } catch (err) {
        console.error('Register error:', err.message);
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Admission number or email already exists' });
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

/* ═══════════════════════════════════════════════
   AUTH — LOGIN
═══════════════════════════════════════════════ */
app.post('/api/login', async (req, res) => {
    const { admission_number, password } = req.body;
    if (!admission_number || !password)
        return res.status(400).json({ error: 'Admission number and password are required' });

    try {
        const [rows] = await getDB().execute(
            'SELECT * FROM users WHERE admission_number = ?', [admission_number.trim()]
        );
        if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

        const user  = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign(
            {
                id:               user.id,
                admission_number: user.admission_number,
                user_type:        user.user_type,
                name:             user.full_name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ token, user_type: user.user_type, name: user.full_name });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

/* ═══════════════════════════════════════════════
   FORGOT PASSWORD — SEND OTP
═══════════════════════════════════════════════ */
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });

    try {
        const [rows] = await getDB().execute(
            'SELECT id, full_name FROM users WHERE email = ?', [email.trim()]
        );
        if (!rows.length)
            return res.status(404).json({ error: 'No account found with this email address' });

        // Generate OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        otpStore.set(email.trim(), { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

        const mailer = getMailer();
        if (mailer) {
            await mailer.sendMail({
                from:    `"Canteen System 🍽️" <${process.env.MAIL_USER}>`,
                to:      email.trim(),
                subject: '🔐 Password Reset OTP — Canteen System',
                html: `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#f0f0f8;border-radius:20px;overflow:hidden;border:1px solid #2a2a3a">
                    <div style="background:linear-gradient(135deg,#ff6b2b,#e85a1e);padding:28px 36px;text-align:center">
                        <div style="font-size:2.2rem">🍽️</div>
                        <h1 style="margin:8px 0 4px;font-size:1.3rem;color:#fff;font-weight:700">Canteen Pre-Order System</h1>
                        <p style="margin:0;color:rgba(255,255,255,0.85);font-size:0.9rem">Password Reset Request</p>
                    </div>
                    <div style="padding:36px">
                        <p style="margin:0 0 8px;color:#f0f0f8">Hi <strong>${rows[0].full_name}</strong>,</p>
                        <p style="margin:0 0 24px;color:#888;line-height:1.6">Use the OTP below to reset your password. It expires in <strong style="color:#ff6b2b">5 minutes</strong>.</p>
                        <div style="background:#16161f;border:2px solid #2a2a3a;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px">
                            <p style="margin:0 0 8px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px">Your OTP</p>
                            <div style="letter-spacing:14px;font-size:2.6rem;font-weight:800;color:#ff6b2b;font-family:monospace">${otp}</div>
                        </div>
                        <p style="margin:0;color:#555;font-size:13px;line-height:1.6">If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                    <div style="padding:16px 36px;border-top:1px solid #2a2a3a;text-align:center">
                        <p style="margin:0;color:#333;font-size:12px">© ${new Date().getFullYear()} Canteen Pre-Order System</p>
                    </div>
                </div>`
            });
            console.log(`📧 OTP email sent to ${email}`);
        } else {
            // Dev fallback — show in server logs / Vercel Function logs
            console.log(`\n🔑 ─────────────────────────────`);
            console.log(`   OTP for ${email}: ${otp}`);
            console.log(`   (No MAIL_USER set — check Vercel logs)`);
            console.log(`─────────────────────────────\n`);
        }

        res.json({ message: 'OTP sent to your registered email' });
    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

/* ═══════════════════════════════════════════════
   VERIFY OTP
═══════════════════════════════════════════════ */
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const record = otpStore.get(email.trim());
    if (!record)
        return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email.trim());
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp !== String(otp).trim())
        return res.status(400).json({ error: 'Incorrect OTP. Please check and try again.' });

    res.json({ message: 'OTP verified' });
});

/* ═══════════════════════════════════════════════
   RESET PASSWORD
═══════════════════════════════════════════════ */
app.post('/api/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
        return res.status(400).json({ error: 'Email, OTP and new password are required' });
    if (newPassword.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const record = otpStore.get(email.trim());
    if (!record || record.otp !== String(otp).trim() || Date.now() > record.expiresAt)
        return res.status(400).json({ error: 'Invalid or expired OTP' });

    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        const [result] = await getDB().execute(
            'UPDATE users SET password = ? WHERE email = ?', [hashed, email.trim()]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ error: 'User not found' });

        otpStore.delete(email.trim());
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
});

/* ═══════════════════════════════════════════════
   PROFILE
═══════════════════════════════════════════════ */
app.get('/api/profile', auth, async (req, res) => {
    try {
        const [rows] = await getDB().execute(
            'SELECT full_name, admission_number, email, phone, user_type FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   PROFILE — UPDATE
═══════════════════════════════════════════════ */
app.put('/api/profile', auth, async (req, res) => {
    const { full_name, email, phone } = req.body;
    if (!full_name?.trim()) return res.status(400).json({ error: 'Full name is required' });
    try {
        await getDB().execute(
            'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?',
            [full_name.trim(), email?.trim() || null, phone?.trim() || null, req.user.id]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   MENU
═══════════════════════════════════════════════ */
app.get('/api/menu', async (req, res) => {
    try {
        const [rows] = await getDB().execute(
            'SELECT * FROM menu_items ORDER BY category, name'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/menu', auth, workerOrAdmin, async (req, res) => {
    const { name, description, price, category, image_url, is_available } = req.body;
    if (!name?.trim() || !price) return res.status(400).json({ error: 'Name and price are required' });
    try {
        await getDB().execute(
            `INSERT INTO menu_items (name, description, price, category, image_url, is_available)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name.trim(), description || null, price, category || 'Main Course', image_url || null, is_available ?? 1]
        );
        res.status(201).json({ message: 'Menu item added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/menu/:id', auth, workerOrAdmin, async (req, res) => {
    const { name, description, price, category, image_url, is_available } = req.body;
    try {
        await getDB().execute(
            `UPDATE menu_items SET name=?, description=?, price=?, category=?, image_url=?, is_available=?
             WHERE id=?`,
            [name, description || null, price, category, image_url || null, is_available ?? 1, req.params.id]
        );
        res.json({ message: 'Menu item updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/menu/:id', auth, workerOrAdmin, async (req, res) => {
    try {
        const pool = getDB();
        const id   = req.params.id;
        // Must delete order_items referencing this menu item first (FK constraint)
        await pool.execute('DELETE FROM order_items WHERE menu_item_id = ?', [id]);
        await pool.execute('DELETE FROM menu_items WHERE id = ?', [id]);
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   ORDERS — PLACE (student)
═══════════════════════════════════════════════ */
app.post('/api/orders', auth, async (req, res) => {
    const { items, total_amount, payment_method } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });

    const orderNumber   = 'ORD' + Date.now();
    const paymentStatus = payment_method === 'online' ? 'paid' : 'pending';

    try {
        const pool = getDB();
        const [result] = await pool.execute(
            `INSERT INTO orders
             (order_number, user_id, admission_number, total_amount, status, payment_method, payment_status)
             VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
            [orderNumber, req.user.id, req.user.admission_number, total_amount, payment_method, paymentStatus]
        );
        const orderId = result.insertId;
        for (const item of items) {
            await pool.execute(
                'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.id, item.quantity, item.price]
            );
        }
        res.status(201).json({ message: 'Order placed successfully', order_number: orderNumber });
    } catch (err) {
        console.error('Order error:', err.message);
        res.status(500).json({ error: 'Failed to place order. Please try again.' });
    }
});

/* ═══════════════════════════════════════════════
   ORDERS — MY ORDERS (student)
═══════════════════════════════════════════════ */
app.get('/api/orders/my-orders', auth, async (req, res) => {
    try {
        const pool = getDB();
        const [orders] = await pool.execute(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id]
        );
        for (const order of orders) {
            const [items] = await pool.execute(
                `SELECT oi.quantity, oi.price, m.name
                 FROM order_items oi
                 JOIN menu_items m ON oi.menu_item_id = m.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   ORDERS — ALL (worker/admin)
═══════════════════════════════════════════════ */
app.get('/api/orders', auth, workerOrAdmin, async (req, res) => {
    try {
        const pool   = getDB();
        const status = req.query.status;
        let query  = `SELECT o.*, u.full_name, u.phone
                      FROM orders o
                      JOIN users u ON o.user_id = u.id`;
        let params = [];
        if (status && status !== 'all') {
            query += ' WHERE o.status = ?';
            params.push(status);
        }
        query += ' ORDER BY o.id DESC';
        const [orders] = await pool.execute(query, params);

        // Fetch ordered items for every order
        for (const order of orders) {
            const [items] = await pool.execute(
                `SELECT oi.quantity, oi.price, m.name
                 FROM order_items oi
                 JOIN menu_items m ON oi.menu_item_id = m.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   ORDERS — UPDATE STATUS (worker/admin)
═══════════════════════════════════════════════ */
app.put('/api/orders/:id/status', auth, workerOrAdmin, async (req, res) => {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status value' });
    try {
        await getDB().execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated to: ' + status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   ADMIN — STATS
═══════════════════════════════════════════════ */
app.get('/api/stats', auth, workerOrAdmin, async (req, res) => {
    try {
        const pool = getDB();
        const [[{ total_orders }]]   = await pool.execute('SELECT COUNT(*) AS total_orders FROM orders');
        const [[{ pending_orders }]] = await pool.execute(`SELECT COUNT(*) AS pending_orders FROM orders WHERE status = 'pending'`);
        const [[{ total_revenue }]]  = await pool.execute(`SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE status != 'cancelled'`);
        const [[{ total_students }]] = await pool.execute(`SELECT COUNT(*) AS total_students FROM users WHERE user_type = 'student'`);
        res.json({ total_orders, pending_orders, total_revenue, total_users: total_students });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   ADMIN — ALL USERS
═══════════════════════════════════════════════ */
app.get('/api/users', auth, async (req, res) => {
    if (req.user.user_type !== 'admin')
        return res.status(403).json({ error: 'Admin only' });
    try {
        const [rows] = await getDB().execute(
            'SELECT id, admission_number, full_name, email, phone, user_type, created_at FROM users ORDER BY id DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ═══════════════════════════════════════════════
   SPA FALLBACK — serve index.html for all non-API routes
═══════════════════════════════════════════════ */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ═══════════════════════════════════════════════
   START (local dev only — Vercel handles this on its own)
═══════════════════════════════════════════════ */
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running → http://localhost:${PORT}`);
        console.log(`📋 Health check  → http://localhost:${PORT}/api/health\n`);
    });
}

module.exports = app;
