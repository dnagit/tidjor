# 📦 คู่มือติดตั้งทีละขั้นตอน

## ✅ Prerequisites

- Node.js 18+ (แนะนำ 20 LTS)
- PostgreSQL 14+
- (Optional) Docker — ถ้าจะใช้ container

---

## 🐘 1. ตั้งค่า PostgreSQL

### วิธี A: ใช้ Docker (เร็วที่สุด)

```bash
docker run --name tidjor-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=tidjor \
  -p 5432:5432 -d postgres:16
```

### วิธี B: ติดตั้งบนเครื่อง

- macOS: `brew install postgresql@16 && brew services start postgresql@16`
- Windows: download installer จาก postgresql.org
- สร้าง database: `createdb tidjor`

---

## 🛠️ 2. Backend

```bash
cd backend
npm install

# Copy env
cp .env.example .env
# แก้ไข .env:
#   DATABASE_URL="postgresql://postgres:password@localhost:5432/tidjor"
#   JWT_SECRET=<random 64+ chars>
#   TMDB_API_KEY=<ขอที่ themoviedb.org/settings/api>

# Generate Prisma client + push schema
npx prisma generate
npx prisma migrate dev --name init

# Seed (genres + admin user + sample movie)
node prisma/seed.js
# → จะได้ admin: email=admin@tidjor.com password=admin1234

# รัน server
npm run dev
# → http://localhost:4000
# ทดสอบ: curl http://localhost:4000/api/health
```

### ตั้งค่า OAuth (optional ตอนเริ่มต้น)

**Google:**
1. ไป https://console.cloud.google.com → APIs & Services → Credentials
2. สร้าง OAuth 2.0 Client ID → Web application
3. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
4. คัดลอก Client ID / Secret ใส่ใน `.env`

**Facebook:**
1. https://developers.facebook.com → Create App → Consumer
2. เพิ่ม product "Facebook Login" → Settings → Web
3. Valid OAuth Redirect URI: `http://localhost:4000/api/auth/facebook/callback`

**LINE:**
1. https://developers.line.biz/console/ → Create channel → LINE Login
2. Callback URL: `http://localhost:4000/api/auth/line/callback`
3. เปิด "Email address permission" ใน Channel settings

---

## 🎨 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env
# แก้ NUXT_PUBLIC_API_BASE=http://localhost:4000

npm run dev
# → http://localhost:3000
```

---

## 🧪 4. ทดสอบระบบ

1. เปิด http://localhost:3000 → เห็นหน้า home
2. คลิก "สมัครสมาชิก" → สร้าง user
3. Login → ดูหน้าหนังตัวอย่าง "หลานม่า" ที่ seed ไว้
4. คลิก "เขียนรีวิว" → ใส่คะแนน + เนื้อหา → ส่ง

### Admin
1. Login ด้วย admin@tidjor.com / admin1234
2. เมนูบนขวาจะมี "Admin" → คลิกไปที่ /admin
3. ลอง:
   - Dashboard ดูสถิติ
   - Movies → tab "นำเข้าจาก TMDB" → ค้นหา + import
   - Movies → tab "เพิ่มเอง" → เพิ่มหนังไทย
   - Users → ban/unban / เปลี่ยน role
   - Reviews → ซ่อน/แสดงรีวิว

---

## 🚀 5. Deploy

### Backend (Railway, Render, Fly.io)
- ใส่ env vars เดิม
- Production: ตั้ง `NODE_ENV=production`, `FRONTEND_URL=https://your-domain.com`
- รัน migration: `npx prisma migrate deploy`

### Frontend (Vercel, Netlify, Cloudflare Pages)
- Nuxt 3 build:
  ```bash
  npm run build
  ```
- ออก output ที่ `.output/` — deploy ตาม preset
- Env: `NUXT_PUBLIC_API_BASE=https://api.your-domain.com`
- Vercel: preset auto-detect, แค่ push GitHub repo

### Database
- ใช้ Supabase / Railway / Neon (managed Postgres)
- ใส่ connection string ใน `DATABASE_URL`

---

## 🐛 Troubleshooting

| ปัญหา | แก้ |
|---|---|
| Prisma error: "Environment variable not found: DATABASE_URL" | ตรวจ `.env` อยู่ใน `backend/` ไม่ใช่ root |
| CORS error | ตรวจ `FRONTEND_URL` ใน backend `.env` ตรงกับ port ที่ frontend รัน |
| OAuth redirect URI mismatch | ใส่ callback URL ใน OAuth provider ให้ตรงกับ `.env` |
| TMDB 401 | ขอ API key ใหม่ (อาจต้อง verify email ก่อน) |
| Nuxt 3 build fails | ลบ `.nuxt/`, `node_modules/`, `package-lock.json` แล้ว `npm install` ใหม่ |

---

## 📊 ดู Database ด้วย Prisma Studio

```bash
cd backend
npx prisma studio
# เปิด http://localhost:5555 — GUI สำหรับดู/แก้ data
```
