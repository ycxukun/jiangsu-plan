#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/_site}"
ECS_HOST="${ECS_HOST:-121.41.53.61}"
ECS_USER="${ECS_USER:-root}"
ECS_PATH="${ECS_PATH:-/var/www/jiangsu-plan/current}"
SSH_KEY="${SSH_KEY:-$ROOT_DIR/.deploy/keys/aliyun_jiangsu_plan_ed25519}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/jiangsu-plan/backups}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

"$ROOT_DIR/scripts/prepare-static-site.sh" "$OUT_DIR"

release_id="$(date +%Y%m%d-%H%M%S)"
ssh_opts=(-i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10)

ssh "${ssh_opts[@]}" "$ECS_USER@$ECS_HOST" \
  "set -euo pipefail; mkdir -p '$BACKUP_DIR'; if [ -d '$ECS_PATH' ]; then cp -a '$ECS_PATH' '$BACKUP_DIR/current-$release_id'; fi; mkdir -p '$ECS_PATH'"

rsync -az --delete \
  -e "ssh -i '$SSH_KEY' -o BatchMode=yes" \
  --exclude='.DS_Store' \
  "$OUT_DIR/" "$ECS_USER@$ECS_HOST:$ECS_PATH/"

ssh "${ssh_opts[@]}" "$ECS_USER@$ECS_HOST" \
  "set -euo pipefail; nginx -t; systemctl reload nginx; find '$BACKUP_DIR' -maxdepth 1 -type d -name 'current-*' | sort | head -n -8 | xargs -r rm -rf"

echo "Deployed $OUT_DIR to $ECS_USER@$ECS_HOST:$ECS_PATH"
