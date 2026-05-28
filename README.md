# 🚗 Karenta Auto Serasi — PWA Car Rental App v4.0

A complete, production-ready Progressive Web App for car rental management with Firebase realtime sync.

---

## 📁 Folder Structure

```
karenta/
├── index.html          ← Main app (all HTML + CSS + JS in one file)
├── manifest.json       ← PWA manifest
├── service-worker.js   ← Offline caching + push notifications
├── firebase-rules.json ← Firebase Realtime Database security rules
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
└── README.md
```

---

## 🚀 GitHub Pages Deployment

### Step 1 — Create GitHub Repository
1. Go to [github.com](https://github.com) → **New Repository**
2. Name it: `karenta` (or any name)
3. Set to **Public**
4. Click **Create repository**

### Step 2 — Upload Files
**Option A — GitHub Web UI:**
1. Click **Add file → Upload files**
2. Drag ALL files and the `icons/` folder
3. Commit with message: `Initial deployment`

**Option B — Git CLI:**
```bash
git init
git add .
git commit -m "Initial deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/karenta.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. Go to repository **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)`
4. Click **Save**
5. Wait ~2 minutes → your app is live at:
   `https://YOUR_USERNAME.github.io/karenta/`

---

## 🔥 Firebase Setup

### Step 1 — Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → Name: `karenta-13ce9` (already configured)
3. Disable Google Analytics (optional)
4. Click **Create Project**

### Step 2 — Enable Authentication
1. In Firebase Console → **Authentication → Get started**
2. Click **Email/Password** provider → **Enable** → **Save**

### Step 3 — Create Realtime Database
1. In Firebase Console → **Realtime Database → Create database**
2. Choose location: **asia-southeast1 (Singapore)**
3. Start in **test mode** (we'll add rules next)
4. Click **Enable**

### Step 4 — Apply Security Rules
1. In Realtime Database → **Rules** tab
2. Copy the contents of `firebase-rules.json`
3. Paste into the rules editor
4. Click **Publish**

### Step 5 — Create First Admin Account
1. In Firebase Console → **Authentication → Users**
2. Click **Add user**
3. Enter email and password for your admin account
4. Copy the **User UID**

### Step 6 — Set User Role in Database
1. In Realtime Database → **Data** tab
2. Click the **+** button at root level
3. Add this structure:
```json
{
  "karenta": {
    "users": {
      "YOUR_USER_UID": {
        "email": "admin@yourdomain.com",
        "nama": "Admin Name",
        "role": "owner"
      }
    }
  }
}
```

### Step 7 — Test Login
1. Open your GitHub Pages URL
2. Enter the email and password you created
3. You should be logged in with owner role

---

## 📱 PWA Installation

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **Install** banner at the bottom
3. Or tap **⋮ menu → Add to Home Screen**

### iOS (Safari)
1. Open the app URL in Safari
2. Tap **Share button (□↑)**
3. Tap **Add to Home Screen**

### Desktop (Chrome/Edge)
1. Open the app URL
2. Click the **install icon (⊕)** in the address bar
3. Click **Install**

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 Dashboard | Stats, active bookings, due today, car status |
| 📋 Booking | Full CRUD, payment tracking, status management |
| 📅 Calendar | Visual booking calendar with day details |
| 🚙 Unit Mobil | Car fleet management with photo upload |
| 👥 Pelanggan | Customer management with history |
| 💰 Laporan | Financial reports by month/year/custom range |
| 📤 Export | Excel, CSV, JSON, Print formats |
| ⚙️ Pengaturan | User management, Firebase status, PWA settings |
| 🌙 Dark/Light | Theme toggle |
| 📱 PWA | Installable, offline support |
| ☁️ Cloud Sync | Firebase Realtime Database sync |
| 🔐 Auth | Email/password with role-based access |

---

## 👥 Role Permissions

| Feature | Karyawan | Admin | Owner |
|---------|----------|-------|-------|
| View all data | ✅ | ✅ | ✅ |
| Add booking | ✅ | ✅ | ✅ |
| Edit booking | ❌ | ✅ | ✅ |
| Delete booking | ❌ | ✅ | ✅ |
| Manage cars | ❌ | ✅ | ✅ |
| Manage customers | ❌ | ✅ | ✅ |
| View reports | ❌ | ✅ | ✅ |
| Export data | ❌ | ✅ | ✅ |
| Manage users | ❌ | ✅ | ✅ |
| Firebase settings | ❌ | ❌ | ✅ |

---

## 🔒 Security Features

- Firebase Authentication (Email/Password)
- Role-based access control (owner/admin/karyawan)
- Input sanitization (XSS prevention)
- No sensitive data in localStorage
- Firebase security rules (server-side)
- Secure session management
- Collision-proof UUID generation

---

## 🧪 Final Testing Checklist

### Authentication
- [ ] Login with Firebase email/password
- [ ] Login in offline mode (owner)
- [ ] Logout clears session
- [ ] Session persists on page refresh
- [ ] Role restrictions apply correctly

### Core Features
- [ ] Dashboard stats load correctly
- [ ] Create new booking
- [ ] Edit existing booking
- [ ] Delete booking (admin/owner only)
- [ ] Mark booking as complete
- [ ] Payment input updates correctly
- [ ] KM return modal saves correctly
- [ ] BBM charge modal calculates correctly
- [ ] Car CRUD works (add/edit/delete)
- [ ] Photo upload works
- [ ] Customer CRUD works
- [ ] Calendar shows booking dots
- [ ] Calendar day click shows details

### Sync & Export
- [ ] Realtime sync between two tabs/devices
- [ ] Export to Excel (XLSX)
- [ ] Export to CSV
- [ ] Export to JSON
- [ ] Backup all data

### PWA
- [ ] Install banner appears
- [ ] App installs successfully
- [ ] App opens in standalone mode
- [ ] Offline mode works (cached assets load)
- [ ] Service worker registers

### Responsive
- [ ] Dashboard mobile layout
- [ ] Bottom nav works on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Modals open correctly on mobile
- [ ] Car grid adjusts on mobile

### Theme
- [ ] Dark mode (default)
- [ ] Light mode toggle works
- [ ] Theme persists on refresh

---

## 🛠 Troubleshooting

**"Firebase not connecting"**
→ Check that Authentication and Realtime Database are enabled in Firebase Console
→ Verify the project ID matches `karenta-13ce9`

**"Login failed: user not found"**
→ Create the user in Firebase Console → Authentication → Users

**"Data not syncing"**
→ Check Firebase Realtime Database rules allow read/write
→ Verify internet connection

**"PWA not installing"**
→ Must be served over HTTPS (GitHub Pages provides this)
→ manifest.json and service-worker.js must be in root directory

**"Icons not loading"**
→ Ensure the `icons/` folder is uploaded with all PNG files
→ Check file paths are relative (`./icons/icon-192.png`)

---

## 📞 Support

This app uses:
- **Firebase** `9.23.0` (compat SDK)
- **SheetJS XLSX** `0.18.5`
- **Google Fonts** (Syne + DM Sans)
- No other external dependencies
- No build tools required
- No Node.js required

Fully compatible with GitHub Pages static hosting.
