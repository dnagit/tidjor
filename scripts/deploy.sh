#!/usr/bin/env bash
# ============================================================
# Deploy ติดจอ บน server (pm2 + nvm)
#
#   bash scripts/deploy.sh            # deploy ทั้ง backend + frontend
#   bash scripts/deploy.sh backend    # เฉพาะ backend
#   bash scripts/deploy.sh frontend   # เฉพาะ frontend
#
# ขั้นตอน: git pull → ใช้ Node 20 (nvm) → install → prisma db push (backend)
#          → nuxt build (frontend) → pm2 restart
#
# env (ไม่ต้องตั้งก็ได้):
#   BRANCH=main  NODE_VERSION=20  PM2_BACKEND=tidjor-backend  PM2_FRONTEND=tidjor-frontend
# ============================================================
set -euo pipefail

TARGET="${1:-all}"
BRANCH="${BRANCH:-main}"
NODE_VERSION="${NODE_VERSION:-20}"
PM2_BACKEND="${PM2_BACKEND:-tidjor-backend}"
PM2_FRONTEND="${PM2_FRONTEND:-tidjor-frontend}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo -e "\n\033[1;33m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✓ $*\033[0m"; }
warn() { echo -e "\033[1;31m⚠ $*\033[0m"; }
die()  { warn "$*"; exit 1; }

case "$TARGET" in all|backend|frontend) ;; *) die "ใช้: bash scripts/deploy.sh [all|backend|frontend]" ;; esac

# ---------- Node 20 ผ่าน nvm (default ของ server เป็น 18) ----------
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] || die "ไม่พบ nvm ที่ $NVM_DIR"
# nvm.sh ใช้ตัวแปรที่ยังไม่ได้ตั้ง → ปิด -u ชั่วคราว
set +u
. "$NVM_DIR/nvm.sh"
nvm use "$NODE_VERSION" >/dev/null
set -u
ok "node $(node -v) / npm $(npm -v)"

install_deps() {
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
}

# ---------- อัปเดตโค้ด ----------
log "git pull ($BRANCH)"
cd "$ROOT"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
ok "$(git log -1 --format='%h %s')"

# ---------- Backend ----------
deploy_backend() {
  log "backend: install"
  cd "$ROOT/backend"
  [ -f .env ] || die "ไม่พบ backend/.env"

  # env ที่ฟีเจอร์ใหม่ต้องใช้ — แค่เตือน ไม่หยุด deploy
  for key in DATABASE_URL TMDB_API_KEY ANTHROPIC_API_KEY OMDB_API_KEY TMDB_SYNC_CRON AI_REVIEW_CRON; do
    grep -q "^${key}=." .env || warn "backend/.env ยังไม่มี ${key}"
  done

  install_deps

  # prisma/migrations ถูก .gitignore → migrate deploy บน server ไม่เห็น migration ใหม่
  # จึงใช้ db push ให้ DB ตรงกับ schema.prisma แทน
  # (ไม่ใส่ --accept-data-loss: ถ้ามีการเปลี่ยนที่ทำให้ข้อมูลหาย จะหยุด deploy ก่อน restart)
  log "backend: prisma db push"
  npx prisma db push

  log "backend: pm2 restart $PM2_BACKEND"
  pm2 restart "$PM2_BACKEND" --update-env
}

# ---------- Frontend ----------
deploy_frontend() {
  log "frontend: install + build"
  cd "$ROOT/frontend"
  install_deps
  npm run build

  log "frontend: pm2 restart $PM2_FRONTEND"
  pm2 restart "$PM2_FRONTEND" --update-env
}

if [ "$TARGET" != frontend ]; then deploy_backend; fi
if [ "$TARGET" != backend ]; then deploy_frontend; fi

pm2 save >/dev/null

# ---------- ตรวจว่า pm2 รันด้วย Node 20 จริง ----------
# pm2 จำ node ที่ใช้ตอน start ครั้งแรกไว้ ถ้าเคย start ด้วย node 18 การ restart จะยังเป็น 18
log "ตรวจเวอร์ชัน node ของ pm2"
# pm2 CLI กับ daemon คนละเวอร์ชันจะพิมพ์ ">>>> In-memory PM2 is out-of-date" ปนมาก่อน JSON → ตัดทิ้ง
PM2_JSON="$(pm2 jlist 2>/dev/null | sed -n '/^\[/,$p')"
for name in "$PM2_BACKEND" "$PM2_FRONTEND"; do
  v="$(node -e "
    const list = JSON.parse(process.argv[2]);
    const p = list.find((x) => x.name === process.argv[1]);
    console.log(p ? (p.pm2_env.node_version || '?') + ' ' + p.pm2_env.status : 'ไม่พบ');
  " "$name" "$PM2_JSON" 2>/dev/null)" || v="? (อ่านข้อมูล pm2 ไม่ได้)"
  case "$v" in
    "${NODE_VERSION}".*online) ok "$name: node $v" ;;
    *) warn "$name: node $v — ควรเป็น Node ${NODE_VERSION} และ online (ย้ายด้วย bash scripts/pm2-node20.sh, ดู pm2 logs $name)" ;;
  esac
done

ok "deploy เสร็จ 🎬"
