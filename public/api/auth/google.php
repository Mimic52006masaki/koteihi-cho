<?php
require '../cors.php';

session_start();

$pdo = require '../../../app/config/database.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$credential = $data['credential'] ?? '';

if (!$credential) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "Google トークンが不正です"
    ]);
    exit;
}

// Google tokeninfo エンドポイントでトークン検証
$tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential);
$ctx = stream_context_create(['http' => ['timeout' => 5]]);
$tokenInfoJson = @file_get_contents($tokenInfoUrl, false, $ctx);

if ($tokenInfoJson === false) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "Google トークンの検証に失敗しました"
    ]);
    exit;
}

$tokenInfo = json_decode($tokenInfoJson, true);

// aud（クライアントID）確認
$expectedClientId = getenv('GOOGLE_CLIENT_ID');
if ($expectedClientId && ($tokenInfo['aud'] ?? '') !== $expectedClientId) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "不正なクライアントIDです"
    ]);
    exit;
}

$googleId = $tokenInfo['sub'] ?? '';
$email = $tokenInfo['email'] ?? '';
$name = $tokenInfo['name'] ?? $email;

if (!$googleId || !$email) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "Google アカウント情報を取得できませんでした"
    ]);
    exit;
}

// 既存ユーザーを google_id または email で検索
$stmt = $pdo->prepare("SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1");
$stmt->execute([$googleId, $email]);
$user = $stmt->fetch();

if ($user) {
    // google_id が未設定なら更新（メールで既存ユーザーが見つかった場合）
    if (!$user['google_id']) {
        $pdo->prepare("UPDATE users SET google_id = ? WHERE id = ?")
            ->execute([$googleId, $user['id']]);
    }
} else {
    // 新規ユーザー作成
    $pdo->prepare("INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)")
        ->execute([$name, $email, $googleId]);
    $userId = $pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
}

session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_name'] = $user['name'];

echo json_encode([
    "success" => true,
    "data" => [
        "id" => $user['id'],
        "name" => $user['name'],
        "email" => $user['email']
    ],
    "error" => null
]);
