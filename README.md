# 🏫 Portal Sekolah

Portal link sekolah mirip lynk.id, dibangun dengan **Next.js 16 + SQLite (@libsql/client)**, siap deploy ke Vercel.

## ✨ Fitur Lengkap

- 🔗 **Link Cards** — tampilan seperti lynk.id
- 📁 **Folder Cards** — tampilan seperti lynk.id
- 🔒 **Password Link / Folder** — proteksi per-link / per-folder, muncul modal prompt
- ➕ **CRUD Link / Folder** — tambah, edit, hapus link / folder
- ⚙️ **Admin Login** — tombol kecil di pojok kanan atas
- ⠿ **Drag & Drop** — atur posisi realtime saat mode admin
- **Rich Text Label** — bold, italic, underline di nama link
- 🖼️ **Upload Gambar** — ikon/gambar di tiap card
- ✨ **5 Efek Animasi** — Glow, Shake, Bounce, Float, Neon
- 👁️ **Show/Hide** — sembunyikan link tanpa hapus
- 📅 **Scheduler** — tampil otomatis berdasarkan waktu mulai/akhir
- 🎨 **Pengaturan Site** — judul, subjudul, logo portal

## 🚀 Quick Start

```bash
npm install || pnpm install
cp .env.example .env.local
npm run dev || pnpm dev
# Buka http://localhost:3000
# Login admin: klik tombol "⚙ Admin" → password: admin123
```

## 🌐 Deploy ke Vercel

1. Push ke GitHub
2. Import di vercel.com
3. Tambah Environment Variable
4. Deploy

**Catatan:** SQLite di Vercel bersifat ephemeral. Untuk data persisten, gunakan [Turso](https://turso.tech)

## 📁 Struktur

```
app/api/auth/       → Login/logout/check
app/api/folders/    → CRUD folder + verify password
app/api/links/      → CRUD link + verify password
app/api/time/       → Fetch time from server
app/api/upload/     → Upload gambar
components/         → LinkCard, LinkFormModal, PasswordModal, dll
lib/db.ts           → SQLite init
lib/auth.ts         → JWT session
```

## Default

- Password admin: `admin123`
- JWT_SECRET: ganti sebelum production!
