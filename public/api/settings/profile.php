<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

/**
 * 表示名の変更。
 * ヘッダーやアバターの頭文字に使われるだけの値だが、セッションにも持っているので
 * DBと $_SESSION['user_name'] の両方を更新する。
 */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "POST required"
    ]);
    exit;
}

$pdo = require '../../../app/config/database.php';
$userId = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$name = is_string($data['name'] ?? null) ? $data['name'] : '';

function profile_fail($code, $message)
{
    http_response_code($code);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!mb_check_encoding($name, 'UTF-8')) {
    profile_fail(400, "表示名の文字コードが不正です");
}

// 制御文字は表示崩れと不可視文字の混入につながるので落とす
$name = preg_replace('/[\x{0000}-\x{001F}\x{007F}]/u', '', $name);
if ($name === null) {
    profile_fail(400, "表示名の文字コードが不正です");
}
$name = trim($name);

if ($name === '') {
    profile_fail(400, "表示名を入力してください");
}

// users.name は VARCHAR(100)
if (mb_strlen($name) > 100) {
    profile_fail(400, "表示名は100文字までです");
}

$stmt = $pdo->prepare("UPDATE users SET name = ? WHERE id = ?");
$stmt->execute([$name, $userId]);

$_SESSION['user_name'] = $name;

echo json_encode([
    "success" => true,
    "data" => ["name" => $name],
    "error" => null
], JSON_UNESCAPED_UNICODE);
