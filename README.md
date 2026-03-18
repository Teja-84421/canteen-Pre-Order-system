# 🍽️ Canteen Pre-Order System
**Stack:** Node.js + Express · TiDB Cloud (MySQL) · Vercel · Vanilla JS

---

## 🚀 Deploy to Vercel + TiDB in 4 Steps

### Step 1 — Create the database in TiDB Cloud
1. Go to [tidbcloud.com](https://tidbcloud.com) → your cluster
2. Click **"SQL Editor"** (left sidebar)
3. Click the **"+"** button next to *Databases* and create `canteen_system`
4. Select `canteen_system` from the dropdown at the top of the SQL editor
5. Paste the full contents of **`setup.sql`** and click **Run**

### Step 2 — Get your TiDB connection details
1. TiDB Cloud → your cluster → **Connect** button (top right)
2. Choose **Connection Type: General** → **Framework: Node.js**
3. Note down: Host, Port (4000), Username, Password

### Step 3 — Add Environment Variables in Vercel
Go to your Vercel project → **Settings → Environment Variables**

| Variable | Where to find it | Example |
|---|---|---|
| `TIDB_HOST` | TiDB Connect page | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` |
| `TIDB_PORT` | TiDB Connect page | `4000` |
| `TIDB_USER` | TiDB Connect page | `abcdef1234.root` |
| `TIDB_PASSWORD` | TiDB Connect page | `your_password` |
| `TIDB_DATABASE` | The name you created | `canteen_system` |
| `TIDB_SSL` | Always required | `true` |
| `JWT_SECRET` | Make up any long string | `my-secret-abc-xyz-123` |
| `MAIL_USER` | Your Gmail address | `yourname@gmail.com` |
| `MAIL_PASS` | Gmail App Password (16 chars) | `abcdabcdabcdabcd` |
| `FRONTEND_URL` | Your Vercel URL (after first deploy) | `https://canteen.vercel.app` |

### Step 4 — Push to GitHub
```bash
git add .
git commit -m "feat: dark UI redesign + 2-col login + OTP forgot password"
git push
```
Vercel detects the push and auto-deploys. ✅

---

## 🔑 Gmail App Password (for OTP emails)
> Without this, OTP is printed to Vercel Function logs (useful for testing)

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. **Security** → **2-Step Verification** → enable it
3. Search for **"App Passwords"** on the same page
4. Select app: **Mail** → click **Generate**
5. Copy the 16-character password → paste as `MAIL_PASS` (no spaces)

---

## 🏃 Run Locally
```bash
npm install
# Fill in your TiDB values in .env
npm run dev       # nodemon (auto-restart)
# or
npm start         # plain node
```
Open: http://localhost:5002

**Test the server:**
```
http://localhost:5002/api/health
```
Should return: `{ "status": "ok", "db": "connected" }`

---

## 📁 Project Structure
```
canteen-system/
├── api/
│   └── index.js        ← Express server + all API routes
├── public/
│   ├── index.html      ← Main UI (dark theme)
│   ├── style.css       ← Dark theme CSS
│   └── script.js       ← All frontend logic
├── setup.sql           ← Run once in TiDB SQL Editor
├── vercel.json         ← Vercel routing config
├── package.json
├── .env                ← Local secrets (DO NOT commit)
├── .env.example        ← Template for teammates
└── .gitignore
```

## 👤 Default Login Credentials (from setup.sql)
| Role | Admission No | Password |
|---|---|---|
| Admin | `ADMIN001` | `admin123` |
| Worker | `WORK001` | `worker123` |

---

## 🐛 Troubleshooting

**"No connection attached" in VS Code**
→ This is just the TiDB VS Code extension trying to connect. It does NOT affect your app. Ignore it.

**`npm start` fails with react-scripts error**
→ Make sure you're running `npm start` inside the `canteen-system-vercel` folder (where `package.json` is), not a parent folder.

**OTP not arriving in email**
→ Check Vercel Function logs (Vercel dashboard → Deployments → Functions → logs). The OTP is always printed there as a fallback.

**TiDB connection error on Vercel**
→ Double-check that `TIDB_SSL=true` is set in Vercel environment variables and that your password is correct.
