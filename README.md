# 🎬 ติดจอ (Tid Jor) - Movie Review Platform

เว็บรีวิวหนังสไตล์ IMDB สำหรับคนไทย รองรับการ login หลายช่องทาง พร้อมระบบ Admin หลังบ้าน

## 🏗️ Tech Stack

### Frontend
- **Nuxt 3** (Vue 3 + SSR) — รองรับ SEO เต็มรูปแบบ
- **TailwindCSS** — Styling (Light theme)
- **Pinia** — State management
- **@nuxtjs/seo** — sitemap, robots.txt, OG image
- **@vueuse/nuxt** — Utility composables

### Backend
- **Node.js + Express** — REST API
- **PostgreSQL** + **Prisma ORM** — Database
- **JWT + Passport.js** — Authentication (Email, Google, Facebook, LINE)
- **bcrypt** — Password hashing
- **multer + sharp** — Image upload

### External
- **TMDB API** — Movie data source (international)
- **Cloudinary / S3** — Image hosting (optional)

## 📁 โครงสร้างโปรเจค

```
tidjor/
├── backend/                 # Express API
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── src/
│   │   ├── config/         # DB, passport config
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation, error
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # External APIs (TMDB)
│   │   ├── utils/          # Helpers
│   │   └── app.js          # Express app
│   ├── .env.example
│   └── package.json
│
├── frontend/               # Nuxt 3 app
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── pages/
│   │   ├── index.vue       # Home
│   │   ├── movies/
│   │   ├── reviews/
│   │   ├── auth/
│   │   ├── profile/
│   │   └── admin/          # Admin panel
│   ├── stores/             # Pinia
│   ├── server/             # Nuxt server middleware
│   ├── public/
│   ├── nuxt.config.ts
│   └── package.json
│
└── README.md
```

## 🚀 วิธีติดตั้ง

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# แก้ไข .env ใส่ DATABASE_URL, JWT_SECRET, OAuth keys, TMDB_API_KEY
npx prisma migrate dev
npx prisma db seed
npm run dev    # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# ใส่ NUXT_PUBLIC_API_BASE=http://localhost:4000
npm run dev    # http://localhost:3000
```

## 🔑 Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://user:pass@localhost:5432/tidjor"
JWT_SECRET="your-super-secret-key"
JWT_REFRESH_SECRET="another-secret"
PORT=4000

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=

# TMDB
TMDB_API_KEY=
TMDB_BASE_URL=https://api.themoviedb.org/3

# Frontend URL (for OAuth redirect)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
NUXT_PUBLIC_API_BASE=http://localhost:4000
NUXT_PUBLIC_SITE_URL=https://tidjor.com
```

## 📊 Database Schema (ภาพรวม)

- **User** — ข้อมูลผู้ใช้ + OAuth providers
- **Movie** — ข้อมูลหนัง (จาก TMDB หรือ admin เพิ่มเอง)
- **Genre** — หมวดหมู่ (Action, Drama, ฯลฯ)
- **Review** — รีวิวจากผู้ใช้ + คะแนน
- **Comment** — คอมเมนต์บนรีวิว
- **ReviewLike** — กดถูกใจรีวิว
- **Watchlist** — รายการอยากดู
- **AdminLog** — บันทึกการแก้ไขจาก admin

ดู [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma) สำหรับ schema เต็ม

## 🌐 SEO Features

- ✅ SSR ทุกหน้าด้วย Nuxt 3
- ✅ Dynamic meta tags ต่อหนัง (title, description, OG image)
- ✅ JSON-LD structured data (Movie, Review schema.org)
- ✅ Auto sitemap.xml
- ✅ robots.txt
- ✅ Canonical URLs
- ✅ Thai language tags (`lang="th"`)

## 🔐 ระบบ Authentication

รองรับ 4 ช่องทาง:
1. Email + Password (bcrypt + JWT)
2. Google OAuth 2.0
3. Facebook OAuth
4. LINE Login

ทุกช่องทางใช้ JWT access token + refresh token

## 👨‍💼 Admin Features

- จัดการหนัง (เพิ่ม/แก้/ลบ) — รองรับทั้ง import จาก TMDB และเพิ่มหนังไทยเอง
- จัดการผู้ใช้ (ban, role, ดู activity)
- ตรวจสอบ/ลบ รีวิวที่ไม่เหมาะสม
- จัดการ Genre
- Dashboard สถิติ (ผู้ใช้ใหม่, รีวิวล่าสุด, หนังยอดนิยม)

## 📝 License

MIT
