# 🏗️ ติดจอ - Architecture & Data Flow

## ภาพรวมระบบ

```
                     ┌─────────────────────┐
                     │     Web Browser      │
                     │   (SEO + SSR HTML)   │
                     └──────────┬──────────┘
                                │
                                │ HTML (SSR) + JSON (CSR)
                                ▼
        ┌───────────────────────────────────────┐
        │      Frontend - Nuxt 3 (Node)         │
        │  - Vue 3 components                   │
        │  - Pinia stores                       │
        │  - useFetch() → API                   │
        │  - useSeoMeta + Schema.org JSON-LD    │
        │  - Sitemap, robots.txt auto-generated │
        └────────────────┬──────────────────────┘
                         │  REST API (JSON, JWT bearer)
                         ▼
        ┌───────────────────────────────────────┐
        │   Backend - Node.js + Express          │
        │  - JWT auth (access + refresh cookie)  │
        │  - Passport OAuth: Google/FB/LINE      │
        │  - Rate limit, Helmet, CORS            │
        │  - Controllers / Services / Routes     │
        └──────┬──────────────────────┬──────────┘
               │ Prisma                │ axios
               ▼                       ▼
        ┌──────────────┐       ┌──────────────────┐
        │ PostgreSQL   │       │   TMDB API       │
        │  (Prisma)    │       │   (movie data)   │
        └──────────────┘       └──────────────────┘
```

## Data Flow ตัวอย่าง

### 1) User เข้าหน้าหนัง /movies/spider-man-2

```
Browser → GET /movies/spider-man-2
   ↓
Nuxt 3 SSR
   ↓ (useFetch ระหว่าง render)
Backend GET /api/movies/slug/spider-man-2
   ↓
Prisma → SELECT * FROM movies WHERE slug = 'spider-man-2' + reviews + genres
   ↓
Backend returns JSON
   ↓
Nuxt renders HTML (พร้อม meta tags + JSON-LD Movie schema)
   ↓
Browser ได้ HTML สมบูรณ์ → Google bot สามารถ index ได้
```

### 2) User submit review

```
Browser → POST /api/reviews { movieId, rating, content }
       Authorization: Bearer <accessToken>
   ↓
Backend → requireAuth middleware verify JWT
   ↓
Prisma → upsert Review (1 review/user/movie)
   ↓
recompute averageRating + ratingCount ของ movie
   ↓
Return updated review
```

### 3) OAuth Login (เช่น Google)

```
Browser → GET /api/auth/google
   ↓
Backend redirect → accounts.google.com OAuth consent
   ↓
Google → callback /api/auth/google/callback?code=...
   ↓
Passport: exchange code → profile
   ↓
findOrCreateOAuthUser():
   - หา AuthAccount เดิม (provider=GOOGLE, providerId=...)
   - หากไม่มี: หา user ด้วย email → link account
   - หากไม่มีเลย: สร้าง user ใหม่ + generate unique username
   ↓
Issue JWT access token + refresh token cookie
   ↓
Redirect → frontend /auth/callback?token=...
   ↓
Frontend store token + fetch /me → redirect home
```

## เทคนิคที่ใช้สำหรับ SEO

| Feature | วิธี |
|---|---|
| Server-side rendering | Nuxt 3 default SSR (renderMode='server') |
| Dynamic page titles | `useSeoMeta({ title })` ต่อหน้า |
| OG image | `@nuxtjs/seo` auto-generate |
| Structured data | `useSchemaOrg([defineMovie(...)])` → JSON-LD `<script>` |
| Sitemap | `@nuxtjs/sitemap` — รวม route ทั้งหมด + dynamic จาก API |
| robots.txt | `@nuxtjs/robots` — block `/admin`, `/auth/*` |
| Canonical URL | ตั้ง `site.url` ใน nuxt.config |
| Thai language | `htmlAttrs: { lang: 'th' }` + `defaultLocale: 'th'` |
| Performance | preconnect TMDB image CDN, lazy load posters |

## ระบบ Permission

| Role | สิทธิ์ |
|---|---|
| USER | รีวิว, like, comment, watchlist, แก้ไขโปรไฟล์ |
| MODERATOR | ทุกอย่างของ USER + เพิ่ม/แก้/ลบหนัง, ซ่อน/แสดงรีวิว |
| ADMIN | ทุกอย่าง + จัดการผู้ใช้ (ban, change role), หมวดหมู่, ดู audit log |

ทุก action ของ MOD/ADMIN ถูกบันทึกใน `AdminLog` table เพื่อ audit

## Scale & Performance Notes

- **Denormalize counts** (`averageRating`, `reviewCount`, `likeCount`) เพื่อหลีกเลี่ยง aggregate query ที่หนัก
- ใช้ `Prisma.$transaction` สำหรับ like/unlike (atomic update)
- Index ที่สำคัญ: `Movie.slug`, `Movie.popularity`, `Review.movieId`, `Review.likeCount`
- ใช้ `useFetch` ของ Nuxt (มี cache + dedupe) — ลด round-trip ระหว่าง SSR
- Rate limit 300 req/15min ต่อ IP
- Refresh token rotation — เปลี่ยน token ทุกครั้งที่ refresh
