#requires -Version 5.1
<#
.SYNOPSIS
  Deploy storo-id-landingpage ke server produksi via SSH (password auth).

.DESCRIPTION
  Menjalankan: git pull -> npm run build -> pm2 restart storo-id
  SSH akan prompt password saat connect.

.EXAMPLE
  ./scripts/deploy.ps1
#>

$ErrorActionPreference = 'Stop'

Write-Host "==> Deploy ke root@76.13.198.168 (/var/www/html/storo-id-landingpage)" -ForegroundColor Cyan
$startedAt = Get-Date

# Remote script — pakai single-quoted here-string supaya `$` tidak diekspansi di PowerShell
$remoteScript = @'
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
'@

# Encode script ke base64 supaya bisa di-pass sebagai 1 argumen ssh.
# Kalau script di-pipe via stdin, ssh tidak bisa prompt password karena stdin sudah dipakai.
$bytes = [Text.Encoding]::UTF8.GetBytes(($remoteScript -replace "`r`n","`n"))
$b64   = [Convert]::ToBase64String($bytes)

Write-Host "==> Masukkan password saat diminta..." -ForegroundColor Yellow
& ssh `
  -o StrictHostKeyChecking=accept-new `
  -o ConnectTimeout=15 `
  -o PreferredAuthentications=password `
  -o PubkeyAuthentication=no `
  root@76.13.198.168 `
  "echo $b64 | base64 -d | bash"
$exit = $LASTEXITCODE

$elapsed = ((Get-Date) - $startedAt).TotalSeconds
if ($exit -eq 0) {
  Write-Host ("==> Sukses dalam {0:N1}s" -f $elapsed) -ForegroundColor Green
} else {
  Write-Host ("==> Gagal (exit {0}) setelah {1:N1}s" -f $exit, $elapsed) -ForegroundColor Red
  exit $exit
}
