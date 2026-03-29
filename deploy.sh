#!/bin/bash
# =============================================
# XServer デプロイ準備スクリプト
# 実行: bash deploy.sh
# =============================================
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ フロントエンドをビルド中..."
cd "$PROJECT_ROOT/frontend"
npm run build

echo "▶ ビルド成果物を public_html/ にコピー中..."
rsync -a --delete \
  --exclude='.htaccess' \
  "$PROJECT_ROOT/frontend/dist/" \
  "$PROJECT_ROOT/public_html/"

echo ""
echo "✅ ローカル準備完了！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "次のステップ："
echo ""
echo "① XServer コントロールパネルで MySQL DB を作成"
echo "   → DB名・ユーザー名・パスワードをメモ"
echo ""
echo "② public_html/.htaccess の SetEnv を実際の値に書き換え"
echo "   SetEnv DB_HOST  mysqlXXX.xserver.jp"
echo "   SetEnv DB_NAME  実際のDB名"
echo "   SetEnv DB_USER  実際のユーザー名"
echo "   SetEnv DB_PASS  実際のパスワード"
echo ""
echo "③ FTP/SFTP で以下をアップロード"
echo "   public_html/  → ~/animanbuzz.com/public_html/"
echo "   public/api/   → ~/animanbuzz.com/public_html/api/"
echo "   app/          → ~/animanbuzz.com/app/"
echo ""
echo "④ XServer の phpMyAdmin でSQLを実行"
echo "   1. sql/schema.sql"
echo "   2. sql/migrate_v3.sql"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
