<?php
require '../cors.php';

$pdo = require '../../../app/config/database.php';

/**
 * Googleログイン。
 *
 * 方針はフェイルクローズ：
 *  - GOOGLE_CLIENT_ID 未設定なら受け付けない（aud検証を素通りさせない）
 *  - ALLOWED_GOOGLE_EMAILS に載っていないメールは受け付けない
 *  - 新規ユーザーは作らない。既存ユーザーに紐づく場合だけログインさせる
 */

function google_deny($code, $message)
{
    http_response_code($code);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$expectedClientId = getenv('GOOGLE_CLIENT_ID');
if (!$expectedClientId) {
    error_log('[koteihi] GOOGLE_CLIENT_ID is not configured; refusing Google sign-in');
    google_deny(503, "Googleログインは利用できません");
}

$allowedEmails = array_values(array_filter(array_map(
    function ($e) { return strtolower(trim($e)); },
    explode(',', (string)getenv('ALLOWED_GOOGLE_EMAILS'))
), function ($e) { return $e !== ''; }));

if (!$allowedEmails) {
    error_log('[koteihi] ALLOWED_GOOGLE_EMAILS is empty; refusing Google sign-in');
    google_deny(503, "Googleログインは利用できません");
}

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$credential = $data['credential'] ?? '';

if (!$credential || !is_string($credential)) {
    google_deny(400, "Google トークンが不正です");
}

// Google tokeninfo エンドポイントで署名・有効期限を含めて検証する
$tokenInfoUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($credential);
$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => false]]);
$tokenInfoJson = @file_get_contents($tokenInfoUrl, false, $ctx);

if ($tokenInfoJson === false) {
    google_deny(401, "Google トークンの検証に失敗しました");
}

$tokenInfo = json_decode($tokenInfoJson, true);
if (!is_array($tokenInfo)) {
    google_deny(401, "Google トークンの検証に失敗しました");
}

// aud（クライアントID）— 一致しなければ他アプリ向けトークンなので拒否
if (($tokenInfo['aud'] ?? '') !== $expectedClientId) {
    google_deny(401, "不正なクライアントIDです");
}

// iss（発行者）
if (!in_array($tokenInfo['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) {
    google_deny(401, "Google トークンの発行者が不正です");
}

// exp（有効期限）— tokeninfo側でも弾かれるが二重に確認する
if (!isset($tokenInfo['exp']) || (int)$tokenInfo['exp'] <= time()) {
    google_deny(401, "Google トークンの有効期限が切れています");
}

$googleId = $tokenInfo['sub'] ?? '';
$email = strtolower(trim($tokenInfo['email'] ?? ''));
$emailVerified = filter_var($tokenInfo['email_verified'] ?? 'false', FILTER_VALIDATE_BOOLEAN);

if (!$googleId || !$email) {
    google_deny(401, "Google アカウント情報を取得できませんでした");
}

// 未確認メールは同一人物の保証がないため受け付けない
if (!$emailVerified) {
    google_deny(403, "メールアドレスが確認済みのGoogleアカウントでログインしてください");
}

if (!in_array($email, $allowedEmails, true)) {
    error_log('[koteihi] Google sign-in rejected for a non-allowlisted account');
    google_deny(403, "このGoogleアカウントではログインできません");
}

// 既存ユーザーのみ。ここで新規作成はしない（登録はWebに公開しない運用）
$stmt = $pdo->prepare("SELECT id, name, email, google_id FROM users WHERE google_id = ? OR email = ? LIMIT 1");
$stmt->execute([$googleId, $email]);
$user = $stmt->fetch();

if (!$user) {
    error_log('[koteihi] Google sign-in: allowlisted account has no matching user row');
    google_deny(403, "このGoogleアカウントに紐づくユーザーがありません");
}

// メールで見つかった既存ユーザーには google_id を紐付ける
if (!$user['google_id']) {
    $pdo->prepare("UPDATE users SET google_id = ? WHERE id = ?")->execute([$googleId, $user['id']]);
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
], JSON_UNESCAPED_UNICODE);
