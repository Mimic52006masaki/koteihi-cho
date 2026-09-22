#!/bin/bash
# =============================================
# XServer へ配備する（SSH経由）
#
#   bash bin/deploy-to-xserver.sh [許可するGoogleアカウント]
#
# 引数を渡すと .htaccess の ALLOWED_GOOGLE_EMAILS を書き換える。
# 既に設定済みなら省略してよい。
#
# ・配備前に公開ディレクトリとappのtarを ~/backups/ に取る
# ・DBは触らない（スキーマ変更は sql/ を個別に流すこと）
# ・rsync は --delete を付けない。サーバー側にしか無いものを消さないため
#   （~/animanbuzz.com/app には別アプリのseiyu-naviが同居している）
# =============================================
set -euo pipefail

REMOTE="${KOTEIHI_SSH_HOST:-xserver-seiyu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# リモートのパスはホーム相対で書く（rsync/sshどちらでもそのまま通る）
DOCROOT='animanbuzz.com/public_html/koteihi.animanbuzz.com'
WEB_APP='animanbuzz.com/public_html/app'   # Webから参照される共有PHP
CLI_APP='animanbuzz.com/app'               # CLI（bin/）から参照される共有PHP
REMOTE_BIN='animanbuzz.com/bin'
ALLOWED_EMAIL="${1:-}"

echo "▶ フロントエンドをビルド"
(cd "$ROOT/frontend" && npm run build)
rsync -a --delete --exclude='.htaccess' "$ROOT/frontend/dist/" "$ROOT/public_html/"

BUNDLE_JS=$(basename "$(ls "$ROOT"/public_html/assets/*.js | head -1)")
echo "  bundle: $BUNDLE_JS"

# 配備するコードが要求するDBスキーマが本番に入っているか先に確かめる。
# 先にファイルだけ置くと、列が無いまま新しいSQLが走って画面が500になる。
echo "▶ DBスキーマの前提を確認"
MISSING=$(ssh "$REMOTE" 'D=~/animanbuzz.com/public_html/koteihi.animanbuzz.com
H=$(awk "\$1==\"SetEnv\"&&\$2==\"DB_HOST\"{print \$3}" $D/.htaccess)
N=$(awk "\$1==\"SetEnv\"&&\$2==\"DB_NAME\"{print \$3}" $D/.htaccess)
U=$(awk "\$1==\"SetEnv\"&&\$2==\"DB_USER\"{print \$3}" $D/.htaccess)
export MYSQL_PWD=$(awk "\$1==\"SetEnv\"&&\$2==\"DB_PASS\"{print \$3}" $D/.htaccess)
mysql -h"$H" -u"$U" -N -e "
  SELECT \"fixed_costs.sort_order\" FROM DUAL WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\"fixed_costs\" AND COLUMN_NAME=\"sort_order\");
  SELECT \"import_records\" FROM DUAL WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=\"import_records\");
" "$N"')

if [ -n "$MISSING" ]; then
  echo "" >&2
  echo "✗ 本番DBに次が足りないため配備を中止した：" >&2
  echo "$MISSING" | sed 's/^/    /' >&2
  echo "" >&2
  echo "  先にマイグレーションを適用すること：" >&2
  echo "    bash bin/apply-migration.sh sql/migrate_v5_sort_order.sql" >&2
  exit 1
fi
echo "  OK"

echo "▶ 本番をバックアップ"
ssh "$REMOTE" 'mkdir -p ~/backups && chmod 700 ~/backups
TS=$(date +%Y%m%d-%H%M%S)
tar czf ~/backups/koteihi-deploy-$TS.tar.gz -C ~/animanbuzz.com/public_html koteihi.animanbuzz.com app
echo "  -> ~/backups/koteihi-deploy-$TS.tar.gz"'

echo "▶ ディレクトリを用意"
ssh "$REMOTE" "mkdir -p $WEB_APP $CLI_APP $REMOTE_BIN $DOCROOT/api $DOCROOT/assets"

echo "▶ 共有PHPを配備（Web用・CLI用の2系統）"
for base in "$WEB_APP" "$CLI_APP"; do
  for dir in bootstrap middleware services; do
    rsync -a "$ROOT/app/$dir/" "$REMOTE:$base/$dir/"
  done
done

echo "▶ APIを配備"
# ディレクトリごと送るので、エンドポイントを増やしてもこのスクリプトは触らなくていい
rsync -a "$ROOT/public/api/" "$REMOTE:$DOCROOT/api/"
rsync -a "$ROOT/bin/import-payments.php" "$REMOTE:$REMOTE_BIN/import-payments.php"

echo "▶ フロントを配備"
# 古いバンドルは消さない。配信済みのindex.htmlを掴んだままのタブを壊さないため
rsync -a "$ROOT/public_html/assets/" "$REMOTE:$DOCROOT/assets/"
rsync -a "$ROOT/public_html/index.html" "$REMOTE:$DOCROOT/index.html"

echo "▶ 公開マイグレーションを削除"
ssh "$REMOTE" "rm -fv $DOCROOT/api/migrate.php || true"

if [ -n "$ALLOWED_EMAIL" ]; then
  echo "▶ .htaccess に許可アカウントを設定"
  # バックアップは公開ディレクトリの外へ置く。DB_PASS を含むファイルなので、
  # Apache の ^\.ht 拒否ルールだけに守りを預けない。
  ssh "$REMOTE" "set -e
  F=$DOCROOT/.htaccess
  mkdir -p ~/backups/htaccess && chmod 700 ~/backups/htaccess
  cp -p \$F ~/backups/htaccess/.htaccess.bak-\$(date +%Y%m%d-%H%M%S)
  chmod 600 ~/backups/htaccess/.htaccess.bak-*
  sed -i '/^SetEnv ALLOWED_GOOGLE_EMAILS /d; /^SetEnv ALLOW_REGISTRATION /d' \$F
  sed -i '0,/^SetEnv FRONTEND_ORIGIN /s//SetEnv ALLOWED_GOOGLE_EMAILS $ALLOWED_EMAIL\nSetEnv ALLOW_REGISTRATION false\n&/' \$F
  grep -E '^SetEnv (ALLOWED_GOOGLE_EMAILS|ALLOW_REGISTRATION) ' \$F | sed 's/^/  /'"
fi

echo "▶ 権限と構文チェック"
ssh "$REMOTE" "set -e
chmod 700 $REMOTE_BIN/import-payments.php
find $WEB_APP $DOCROOT/api -name '*.php' -exec chmod 644 {} +
find $WEB_APP/bootstrap $DOCROOT/api -name '*.php' -print0 | xargs -0 -n1 /usr/bin/php8.3 -l | grep -v '^No syntax errors' || echo '  PHP構文エラーなし'"

echo ""
echo "▶ 応答を確認"
BASE="https://koteihi.animanbuzz.com"
printf '  %-28s %s\n' "/ (index.html)" "$(curl -s -m 20 $BASE/ | grep -o 'index-[A-Za-z0-9_-]*\.js')"
for path in /api/auth/me.php /api/settings/profile.php /api/imports/ /api/accounts/ /api/migrate.php; do
  printf '  %-28s HTTP %s\n' "$path" "$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$BASE$path")"
done
printf '  %-28s %s\n' "Set-Cookie (login)" "$(curl -s -i -m 20 -X POST -H 'Content-Type: application/json' \
  -d '{"email":"deploy-check@invalid.local","password":"x"}' "$BASE/api/auth/login.php" \
  | grep -i '^set-cookie' | head -1 | tr -d '\r')"

echo ""
echo "✅ 配備完了"
echo "   /api/migrate.php は 404、それ以外のAPIは 401（未ログインのため）が正しい"
echo "   Set-Cookie に HttpOnly / Secure / SameSite が付いていることを確認する"
