-- ============================================================
-- ตาราง tmdb_media : เก็บข้อมูล Movie + TV Series จาก TMDB
-- Dialect: PostgreSQL (ตรงกับโปรเจกต์ tidjor ที่ใช้ Prisma + PostgreSQL)
--
-- หมายเหตุ:
--   - ปกติตารางนี้ถูกสร้างผ่าน `npx prisma migrate dev` อยู่แล้ว (model TmdbMedia)
--   - ไฟล์นี้ให้ไว้เป็น reference / สำหรับสร้างตารางเองแบบ manual
--   - กันข้อมูลซ้ำด้วย UNIQUE (tmdb_id, type) → ใช้ทำ upsert (ON CONFLICT)
-- ============================================================

-- ประเภทสื่อ
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
    CREATE TYPE media_type AS ENUM ('movie', 'tv');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS tmdb_media (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tmdb_id           INTEGER          NOT NULL,
  type              media_type       NOT NULL,

  title             TEXT             NOT NULL,
  original_title    TEXT,
  overview          TEXT,
  release_date      TIMESTAMP,                 -- movie.release_date หรือ tv.first_air_date

  poster_path       TEXT,
  poster_url        TEXT,                      -- https://image.tmdb.org/t/p/w500{poster_path}
  backdrop_path     TEXT,
  backdrop_url      TEXT,                      -- https://image.tmdb.org/t/p/original{backdrop_path}

  vote_average      DOUBLE PRECISION,
  vote_count        INTEGER,
  popularity        DOUBLE PRECISION,
  original_language TEXT,

  genre_ids         INTEGER[],                 -- จาก popular list
  genres            JSONB,                     -- object เต็มจาก details endpoint

  adult             BOOLEAN          NOT NULL DEFAULT FALSE,
  status            TEXT,

  created_at        TIMESTAMP        NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP        NOT NULL DEFAULT now(),

  CONSTRAINT tmdb_media_tmdb_id_type_key UNIQUE (tmdb_id, type)
);

CREATE INDEX IF NOT EXISTS tmdb_media_type_idx       ON tmdb_media (type);
CREATE INDEX IF NOT EXISTS tmdb_media_popularity_idx ON tmdb_media (popularity);

-- ------------------------------------------------------------
-- ตัวอย่าง upsert (กันซ้ำ): insert ใหม่ ถ้ามี (tmdb_id, type) แล้วให้ update
-- ------------------------------------------------------------
-- INSERT INTO tmdb_media
--   (id, tmdb_id, type, title, original_title, overview, release_date,
--    poster_path, poster_url, backdrop_path, backdrop_url,
--    vote_average, vote_count, popularity, original_language,
--    genre_ids, genres, adult, status, updated_at)
-- VALUES
--   (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6,
--    $7, $8, $9, $10,
--    $11, $12, $13, $14,
--    $15, $16, $17, $18, now())
-- ON CONFLICT (tmdb_id, type) DO UPDATE SET
--   title             = EXCLUDED.title,
--   original_title    = EXCLUDED.original_title,
--   overview          = EXCLUDED.overview,
--   release_date      = EXCLUDED.release_date,
--   poster_path       = EXCLUDED.poster_path,
--   poster_url        = EXCLUDED.poster_url,
--   backdrop_path     = EXCLUDED.backdrop_path,
--   backdrop_url      = EXCLUDED.backdrop_url,
--   vote_average      = EXCLUDED.vote_average,
--   vote_count        = EXCLUDED.vote_count,
--   popularity        = EXCLUDED.popularity,
--   original_language = EXCLUDED.original_language,
--   genre_ids         = EXCLUDED.genre_ids,
--   genres            = EXCLUDED.genres,
--   adult             = EXCLUDED.adult,
--   status            = EXCLUDED.status,
--   updated_at        = now();
