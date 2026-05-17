#!/usr/bin/env bash
#
# Deploy storo-id-landingpage ke server produksi via SSH (password auth).
# Menjalankan: git pull -> npm run build -> pm2 restart storo-id
# SSH akan prompt password saat connect.
#
# Usage: ./scripts/deploy.sh

set -euo pipefail

# ANSI colors (skip kalau bukan TTY)
if [ -t 1 ]; then
  C_CYAN=$'\033[36m'; C_YELLOW=$'\033[33m'; C_GREEN=$'\033[32m'; C_RED=$'\033[31m'; C_RESET=$'\033[0m'
else
  C_CYAN=''; C_YELLOW=''; C_GREEN=''; C_RED=''; C_RESET=''
fi

printf "%s==> Deploy ke root@76.13.198.168 (/var/www/html/storo-id-landingpage)%s\n" "$C_CYAN" "$C_RESET"
started_at=$(date +%s)

# Remote script — single-quoted heredoc supaya $ tidak diekspansi di shell lokal
REMOTE_SCRIPT=$(cat <<'EOF'
set -euo pipefail

# Load nvm kalau ada (SSH non-interactive tidak auto-load .bashrc)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Fallback PATH untuk node yang dipasang via nvm
if [ -d "$HOME/.nvm/versions/node" ]; then
  export PATH="$HOME/.nvm/versions/node/$(ls -1 $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin:$PATH"
fi
export PATH="/usr/local/bin:/usr/bin:$PATH"

command -v node >/dev/null || { echo "ERROR: node tidak ditemukan (PATH=$PATH)"; exit 1; }
command -v npm  >/dev/null || { echo "ERROR: npm tidak ditemukan";  exit 1; }
command -v pm2  >/dev/null || { echo "ERROR: pm2 tidak ditemukan";  exit 1; }
echo "node $(node -v) | npm $(npm -v) | pm2 $(pm2 -v)"

cd /var/www/html/storo-id-landingpage

echo "==> [1/3] git pull"
git pull --ff-only

echo "==> [2/3] npm run build"
npm run build

echo "==> [3/3] pm2 restart storo-id"
pm2 restart storo-id --update-env
pm2 save

echo "==> Deploy selesai $(date -Iseconds)"
EOF
)

# Encode ke base64 supaya bisa di-pass sebagai 1 argumen ssh.
# Kalau script di-pipe via stdin, ssh tidak bisa prompt password karena stdin sudah dipakai.
B64=$(printf '%s' "$REMOTE_SCRIPT" | base64 | tr -d '\n')

printf "%s==> Masukkan password saat diminta...%s\n" "$C_YELLOW" "$C_RESET"

set +e
ssh \
  -o StrictHostKeyChecking=accept-new \
  -o ConnectTimeout=15 \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  root@76.13.198.168 \
  "echo $B64 | base64 -d | bash"
exit_code=$?
set -e

elapsed=$(( $(date +%s) - started_at ))
if [ "$exit_code" -eq 0 ]; then
  printf "%s==> Sukses dalam %ss%s\n" "$C_GREEN" "$elapsed" "$C_RESET"
else
  printf "%s==> Gagal (exit %s) setelah %ss%s\n" "$C_RED" "$exit_code" "$elapsed" "$C_RESET"
  exit "$exit_code"
fi
