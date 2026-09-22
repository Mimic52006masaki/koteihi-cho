#!/bin/bash
# =============================================
# XServer へ配備する（SSH経由）
#
#   bash bin/deploy-to-xserver.sh you@gmail.com
#
# 引数はGoogleログインを許可するアカウント。
# 既に .htaccess に ALLOWED_GOOGLE_EMAILS があれば省略できる。
#
# 配備前に公開ディレクトリとappのtarを ~/backups/ に取る。
# DBは触らない（スキーマ変更は sql/ を個別に流すこと）。
# =============================================
set -euo pipefail

REMOTE="${KOTEIHI_SSH_HOST:-xserver-seiyu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCROOT='~/animanbuzz.com/public_html/koteihi.animanbuzz.com'
WEB_APP='~/animanbuzz.com/public_html/app'
CLI_APP='~/animanbuzz.com/app'
ALLOWED_EMAIL="${1:-}"

echo "▶ フロントエンドをビルド"
(cd "$ROOT/frontend" && npm run build)
rsync -a --delete --exclude='.htaccess' "$ROOT/frontend/dist/" "$ROOT/public_html/"

BUNDLE_JS=$(basename "$(ls "$ROOT"/public_html/assets/*.js | head -1)")
BUNDLE_CSS=$(basename "$(ls "$ROOT"/public_html/assets/*.css | head -1)")
echo "  bundle: $BUNDLE_JS / $BUNDLE_CSS"

echo "▶ 本番をバックアップ"
ssh "$REMOTE" 'mkdir -p ~/backups && chmod 700 ~/backups
TS=$(date +%Y%m%d-%H%M%S)
tar czf ~/backups/koteihi-deploy-$TS.tar.gz -C ~/animanbuzz.com/public_html koteihi.animanbuzz.com app
echo "  -> ~/backups/koteihi-deploy-$TS.tar.gz"'

echo "▶ ディレクトリを用意"
ssh "$REMOTE" "mkdir -p $WEB_APP/bootstrap $WEB_APP/middleware $WEB_APP/services \
  $CLI_APP/bootstrap $CLI_APP/middleware $CLI_APP/services \
  ~/animanbuzz.com/bin $DOCROOT/api/imports $DOCROOT/api/auth $DOCROOT/assets"

echo "▶ 共有PHPを配備（Web用・CLI用の2系統）"
for base in "$WEB_APP" "$CLI_APP"; do
  scp -q "$ROOT/app/bootstrap/http.php"     "$REMOTE:$base/bootstrap/http.php"
  scp -q "$ROOT/app/middleware/cors.php"    "$REMOTE:$base/middleware/cors.php"
  scp -q "$ROOT/app/middleware/auth.php"    "$REMOTE:$base/middleware/auth.php"
  scp -q "$ROOT/app/services/ImportService.php" "$REMOTE:$base/services/ImportService.php"
done

echo "▶ APIを配備"
scp -q "$ROOT/public/api/cors.php"          "$REMOTE:$DOCROOT/api/cors.php"
scp -q "$ROOT/public/api/auth/login.php"    "$REMOTE:$DOCROOT/api/auth/login.php"
scp -q "$ROOT/public/api/auth/logout.php"   "$REMOTE:$DOCROOT/api/auth/logout.php"
scp -q "$ROOT/public/api/auth/register.php" "$REMOTE:$DOCROOT/api/auth/register.php"
scp -q "$ROOT/public/api/auth/google.php"   "$REMOTE:$DOCROOT/api/auth/google.php"
scp -q "$ROOT/public/api/imports/index.php" "$REMOTE:$DOCROOT/api/imports/index.php"
scp -q "$ROOT/bin/import-payments.php"      "$REMOTE:~/animanbuzz.com/bin/import-payments.php"

echo "▶ フロントを配備"
scp -q "$ROOT/public_html/assets/$BUNDLE_JS" "$ROOT/public_html/assets/$BUNDLE_CSS" "$REMOTE:$DOCROOT/assets/"
scp -q "$ROOT/public_html/index.html"        "$REMOTE:$DOCROOT/index.html"

echo "▶ 公開マイグレーションを削除"
ssh "$REMOTE" "rm -fv $DOCROOT/api/migrate.php || true"

if [ -n "$ALLOWED_EMAIL" ]; then
  echo "▶ .htaccess に許可アカウントを設定"
  ssh "$REMOTE" "set -e
  F=$DOCROOT/.htaccess
  cp -p \$F \$F.bak-\$(date +%Y%m%d-%H%M%S)
  sed -i '/^SetEnv ALLOWED_GOOGLE_EMAILS /d; /^SetEnv ALLOW_REGISTRATION /d' \$F
  sed -i '0,/^SetEnv FRONTEND_ORIGIN /s//SetEnv ALLOWED_GOOGLE_EMAILS $ALLOWED_EMAIL\nSetEnv ALLOW_REGISTRATION false\n&/' \$F
  grep -c '^SetEnv ' \$F | sed 's/^/  SetEnv 行数: /'"
fi

echo "▶ 権限と構文チェック"
ssh "$REMOTE" "set -e
chmod 644 $WEB_APP/bootstrap/http.php $WEB_APP/middleware/*.php $WEB_APP/services/*.php $DOCROOT/api/cors.php $DOCROOT/api/auth/*.php $DOCROOT/api/imports/index.php
chmod 700 ~/animanbuzz.com/bin/import-payments.php
for f in $WEB_APP/bootstrap/http.php $DOCROOT/api/cors.php $DOCROOT/api/auth/google.php $DOCROOT/api/auth/login.php $DOCROOT/api/auth/logout.php $DOCROOT/api/auth/register.php; do
  /usr/bin/php8.3 -l \$f
done"

echo ""
echo "▶ 応答を確認"
BASE="https://koteihi.animanbuzz.com"
printf '  %-26s %s\n' "/ (index.html)" "$(curl -s -m 20 $BASE/ | grep -o 'index-[A-Za-z0-9_-]*\.js')"
for path in /api/auth/me.php /api/imports/ /api/accounts/ /api/migrate.php; do
  printf '  %-26s HTTP %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$BASE$path")"
done
printf '  %-26s %s\n' "Set-Cookie (login)" "$(curl -s -i -m 20 -X POST -H 'Content-Type: application/json' \
  -d '{"email":"deploy-check@invalid.local","password":"x"}' "$BASE/api/auth/login.php" \
  | grep -i '^set-cookie' | head -1 | tr -d '\r')"

echo ""
echo "✅ 配備完了"
echo "   /api/migrate.php が 404 なら公開マイグレーションは閉じている"
echo "   Set-Cookie に HttpOnly / Secure / SameSite が付いていることを確認する"
