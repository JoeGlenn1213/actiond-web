#!/usr/bin/env bash
# Build the static export and atomically swap it into the directory ActionD
# serves via --web-dir (default ~/.localgithub/actiond-web/out).
# Override the target with ACTIOND_WEB_DEPLOY_DIR.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET_DIR="${ACTIOND_WEB_DEPLOY_DIR:-$HOME/.localgithub/actiond-web/out}"

echo "==> Building static export..."
npm run build

echo "==> Deploying to ${TARGET_DIR}"
mkdir -p "$(dirname "$TARGET_DIR")"
rm -rf "${TARGET_DIR}.old"
if [ -d "$TARGET_DIR" ]; then
    mv "$TARGET_DIR" "${TARGET_DIR}.old"
fi
cp -R out "$TARGET_DIR"
rm -rf "${TARGET_DIR}.old"

# Compatibility: ActionD's --web-dir fallback serves {route}/placeholder.html
# for deep links; with trailingSlash the export emits placeholder/index.html.
# Drop flat copies so the fallback chain keeps working everywhere.
for route in actions events; do
    if [ -f "$TARGET_DIR/$route/placeholder/index.html" ]; then
        cp "$TARGET_DIR/$route/placeholder/index.html" "$TARGET_DIR/$route/placeholder.html"
    fi
done

FILE_COUNT=$(find "$TARGET_DIR" -type f | wc -l | tr -d ' ')
echo "==> Done: ${FILE_COUNT} files deployed to ${TARGET_DIR}"
