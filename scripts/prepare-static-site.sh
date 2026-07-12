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
copy_file auth-errors.js
copy_file beian-icon.png

copy_glob 'style-claude-*.css'
copy_glob 'data*.js'

for dir in articles content students specialty comprehensive major-map strong-base early-batch; do
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
  batch-guide.js
  batch-guide-links.js
  qualification-risk.js
  crm.html
  crm.js
  admin.html
  admin-console.html
  admin-console.js
  login_landing.html
  auth-errors.js
  beian-icon.png
  style-claude-clean.css
  data-db-part-01.js
  data-db-part-04.js
  data-db.js
  data-early-batch-categories.js
  data-group-names.js
  data-major-details.js
  data-major-details-part-01.js
  data-major-details-part-28.js
  data-major-extra-fields.js
  data-group-changes.js
  data-assassin-risks.js
  specialty/index.html
  specialty/admin.html
  specialty/app.js
  specialty/data-db-part-01.js
  specialty/data-db.js
  specialty/data-major-details-part-01.js
  specialty/data-major-details.js
  students/index.html
  students/app.js
  students/archive.html
  students/archive.js
  students/intake-form-specialty-2026.html
  students/intake-form-v6.6.7.html
  content/index.html
  content/app.js
  content/article.html
  content/article.js
  content/editor.html
  content/editor.js
  content/post-style.css
  comprehensive/index.html
  major-map/index.html
  major-map/styles.css
  major-map/catalog-2026.js
  major-map/data.js
  major-map/app.js
  strong-base/index.html
  strong-base/styles.css
  strong-base/data.js
  strong-base/rules-2026.js
  strong-base/app.js
  early-batch/index.html
  early-batch/styles.css
  early-batch/data.js
  early-batch/rules-2026.js
  early-batch/groups-2026.js
  early-batch/app.js
  articles/zhaoban-negotiation-strategy.html
)

for file in "${required[@]}"; do
  if [[ ! -e "$OUT_DIR/$file" ]]; then
    echo "Missing required static asset: $OUT_DIR/$file" >&2
    exit 1
  fi
done

du -sh "$OUT_DIR"
