#!/usr/bin/env bash
# ============================================================
# ย้าย tidjor-backend / tidjor-frontend ใน pm2 ไปรันด้วย Node 20 (รันครั้งเดียว)
#
#   bash scripts/pm2-node20.sh
#
# - ไม่แตะแอปอื่นใน pm2 และไม่ใช้ `pm2 update` (ซึ่งจะรีสตาร์ททุกแอป)
# - ล็อก interpreter เป็น Node 20 แบบ path เต็ม → pm2 restart ครั้งต่อไป (deploy.sh) ก็ยังเป็น 20
# - backend start ด้วย src/server.js ตรง ๆ ไม่ผ่าน npm (npm จะไปเรียก node ตัวอื่นตาม PATH)
# - เก็บ env เดิมจาก pm2 (PORT, HOST, NITRO_*, NUXT_*, NODE_ENV) มาใช้ต่อ
# ============================================================
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-20}"
PM2_BACKEND="${PM2_BACKEND:-tidjor-backend}"
PM2_FRONTEND="${PM2_FRONTEND:-tidjor-frontend}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ok()   { echo -e "\033[1;32m✓ $*\033[0m"; }
warn() { echo -e "\033[1;31m⚠ $*\033[0m"; }
die()  { warn "$*"; exit 1; }

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
set +u
. "$NVM_DIR/nvm.sh"
nvm use "$NODE_VERSION" >/dev/null
NODE_BIN="$(nvm which "$NODE_VERSION")"
set -u
ok "ใช้ $NODE_BIN ($("$NODE_BIN" -v))"

[ -f "$ROOT/backend/src/server.js" ] || die "ไม่พบ backend/src/server.js"
[ -f "$ROOT/frontend/.output/server/index.mjs" ] || die "ไม่พบ frontend/.output — รัน bash scripts/deploy.sh frontend ก่อน"

# pm2 CLI กับ daemon คนละเวอร์ชันจะพิมพ์คำเตือนปนมาก่อน JSON → ตัดทิ้ง
PM2_JSON="$(pm2 jlist 2>/dev/null | sed -n '/^\[/,$p')"

# พิมพ์ env เดิมของ process เป็นบรรทัด KEY=VALUE (เฉพาะที่เกี่ยวกับ port/runtime)
old_env() {
  node -e "
    const p = JSON.parse(process.argv[2]).find((x) => x.name === process.argv[1]);
    if (!p) process.exit(0);
    const env = { ...p.pm2_env, ...(p.pm2_env.env || {}) };
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string' && /^(PORT|HOST|NODE_ENV|NITRO_.+|NUXT_.+)$/.test(k)) console.log(k + '=' + v);
    }
  " "$1" "$PM2_JSON"
}

move() {
  local name="$1" cwd="$2" script="$3"
  local envs=()
  while IFS= read -r line; do [ -n "$line" ] && envs+=("$line"); done < <(old_env "$name")

  echo
  ok "$name → $script"
  [ ${#envs[@]} -gt 0 ] && printf '    env เดิม: %s\n' "${envs[@]}"

  pm2 delete "$name" >/dev/null 2>&1 || true
  (cd "$cwd" && env ${envs[@]+"${envs[@]}"} pm2 start "$script" --name "$name" --cwd "$cwd" --interpreter "$NODE_BIN")
}

move "$PM2_BACKEND"  "$ROOT/backend"  "$ROOT/backend/src/server.js"
move "$PM2_FRONTEND" "$ROOT/frontend" "$ROOT/frontend/.output/server/index.mjs"

pm2 save
echo
pm2 ls
echo
ok "เสร็จ — เช็ก: pm2 logs $PM2_BACKEND --lines 30   (ต้องเห็นบรรทัด cron ทำงาน)"
