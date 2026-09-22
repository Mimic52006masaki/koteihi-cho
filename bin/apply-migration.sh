#!/bin/bash
# =============================================
# 本番DBへマイグレーションを適用する（SSH経由）
#
#   bash bin/apply-migration.sh sql/migrate_v5_sort_order.sql
#
# 適用前に mysqldump を ~/backups/ に取る。
# 接続情報は本番の .htaccess から読ませるので、引数や履歴には残さない。
# =============================================
set -euo pipefail

REMOTE="${KOTEIHI_SSH_HOST:-xserver-seiyu}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_FILE="${1:-}"

if [ -z "$SQL_FILE" ] || [ ! -f "$ROOT/$SQL_FILE" ] && [ ! -f "$SQL_FILE" ]; then
  echo "使い方: bash bin/apply-migration.sh sql/migrate_vX_....sql" >&2
  exit 1
fi
[ -f "$SQL_FILE" ] || SQL_FILE="$ROOT/$SQL_FILE"

echo "▶ 適用するSQL: $SQL_FILE"
cat "$SQL_FILE" | sed 's/^/  | /'
echo ""

REMOTE_SQL="migration-$(date +%Y%m%d-%H%M%S).sql"
scp -q "$SQL_FILE" "$REMOTE:$REMOTE_SQL"

ssh "$REMOTE" "set -e
D=~/animanbuzz.com/public_html/koteihi.animanbuzz.com
H=\$(awk '\$1==\"SetEnv\"&&\$2==\"DB_HOST\"{print \$3}' \$D/.htaccess)
N=\$(awk '\$1==\"SetEnv\"&&\$2==\"DB_NAME\"{print \$3}' \$D/.htaccess)
U=\$(awk '\$1==\"SetEnv\"&&\$2==\"DB_USER\"{print \$3}' \$D/.htaccess)
export MYSQL_PWD=\$(awk '\$1==\"SetEnv\"&&\$2==\"DB_PASS\"{print \$3}' \$D/.htaccess)

mkdir -p ~/backups && chmod 700 ~/backups
TS=\$(date +%Y%m%d-%H%M%S)
mysqldump -h\"\$H\" -u\"\$U\" --single-transaction --routines --triggers \"\$N\" > ~/backups/koteihi-db-\$TS.sql
chmod 600 ~/backups/koteihi-db-\$TS.sql
echo '  バックアップ: ~/backups/koteihi-db-'\$TS'.sql'

mysql -h\"\$H\" -u\"\$U\" \"\$N\" < $REMOTE_SQL
echo '  適用完了'
rm -f $REMOTE_SQL"

echo ""
echo "✅ マイグレーション完了"
