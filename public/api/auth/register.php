<?php
require '../cors.php';

/**
 * 自己登録は既定で閉じている。
 *
 * 固定費帳は単一利用者のアプリで登録UIも無いのに、この経路だけが公開されていた。
 * 一時的に開けたい場合だけ ALLOW_REGISTRATION=true を環境設定に置く。
 */
if (!filter_var(getenv('ALLOW_REGISTRATION') ?: 'false', FILTER_VALIDATE_BOOLEAN)) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "新規登録は受け付けていません"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = require '../../../app/config/database.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$name || !$email || !$password) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "全ての項目を入力してください"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        echo json_encode([
            "success" => false,
            "data" => null,
            "error" => "このメールアドレスは既に登録されています"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO users(name, email, password)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$name, $email, $hashedPassword]);

    $userId = $pdo->lastInsertId();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $name;

    echo json_encode([
        "success" => true,
        "data" => null,
        "error" => null
    ]);
} catch (Exception $e) {
    error_log('[koteihi] register failed: ' . $e->getMessage());
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "登録に失敗しました"
    ], JSON_UNESCAPED_UNICODE);
}
