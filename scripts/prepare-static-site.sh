#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-_site}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

copy_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cp "$file" "$OUT_DIR/"
  fi
}

copy_glob() {
  local pattern="$1"
  local matched=0
  for file in $pattern; do
    if [[ -f "$file" ]]; then
      cp "$file" "$OUT_DIR/"
      matched=1
    fi
  done
  return 0
}

copy_file .nojekyll
copy_file _redirects
copy_file index.html
copy_file admin.html
copy_file admin-console.html
copy_file admin-console.js
copy_file crm.html
copy_file crm.js
copy_file app.js
copy_file batch-guide.js
copy_file batch-guide-links.js
copy_file qualification-risk.js
copy_file student-account-hub.js
copy_file school-life-info-data.js
copy_file login_landing.html
copy_file beian-icon.png

copy_glob 'style-claude-*.css'
copy_glob 'data*.js'

for dir in articles content students specialty comprehensive; do
  if [[ -d "$dir" ]]; then
    rsync -a --delete \
      --exclude='.DS_Store' \
      "$dir/" "$OUT_DIR/$dir/"
  fi
done

find "$OUT_DIR" -name '.DS_Store' -delete

required=(
  index.html
  app.js
  crm.html
  crm.js
  admin.html
  admin-console.html
  admin-console.js
  login_landing.html
  beian-icon.png
  data-db.js
  data-major-details.js
  data-group-changes.js
  specialty/index.html
  students/index.html
  content/index.html
)

for file in "${required[@]}"; do
  if [[ ! -e "$OUT_DIR/$file" ]]; then
    echo "Missing required static asset: $OUT_DIR/$file" >&2
    exit 1
  fi
done

du -sh "$OUT_DIR"
