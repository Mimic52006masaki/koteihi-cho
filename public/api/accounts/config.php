<?php
// CORS 設定
require_once __DIR__ . '/../../../app/middleware/cors.php';

// 認証ミドルウェア
require_once __DIR__ . '/../../../app/middleware/auth.php';

// DB 接続
$pdo = require __DIR__ . '/../../../app/config/database.php';

// セッションユーザー
$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    echo json_encode(["success" => false, "error" => "ログインしてください"]);
    exit;
}

// JSON レスポンス
header('Content-Type: application/json');