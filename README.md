# Karenta Auto Serasi — PWA

Aplikasi manajemen rental mobil berbasis Progressive Web App (PWA).

## Struktur File yang WAJIB ada di Repository

```
/
├── index.html          ← App utama (hasil patched)
├── sw.js               ← Service Worker (HARUS di root, sejajar index.html)
├── .nojekyll           ← Cegah GitHub Pages proses Jekyll
├── 404.html            ← Fallback routing
└── .github/
    └── workflows/
        └── deploy.yml  ← Auto-deploy ke GitHub Pages
```

## Setup Firebase Security Rules

Paste isi `firebase-rules.json` ke:
Firebase Console → Realtime Database → Rules → Publish

## URL Setelah Deploy

`https://<username>.github.io/<nama-repo>/`

Contoh: `https://karentabatam.github.io/karenta-app/`

## Catatan Penting

- Service Worker (`sw.js`) HARUS ada di root repo, sejajar `index.html`
- Aktifkan GitHub Pages dari Settings → Pages → Source: GitHub Actions
- Setelah pertama deploy, buka app dan ikuti setup awal untuk buat akun Owner
