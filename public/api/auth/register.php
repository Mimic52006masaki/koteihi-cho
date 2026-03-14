<?php
require '../../../app/middleware/cors.php';

$pdo = require '../../../app/config/database.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$name || !$email || !$password) {
    echo json_encode([
        "success" => false,
        "error" => "全ての項目を入力してください"
    ]);
    exit;
}

try {
    // 既存メールチェック
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);

    if ($stmt->fetch()) {
        echo json_encode([
            "success" => false,
            "error" => "このメールアドレスは既に登録されています"
        ]);
        exit;
    }

    // パスワードハッシュ化
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // 登録
    $stmt = $pdo->prepare("
        INSERT INTO users(name, email, password)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$name, $email, $hashedPassword]);

    // 自動ログインさせる場合
    $userId = $pdo->lastInsertId();
    session_regenerate_id(true);
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $name;

    echo json_encode([
        "success" => true
    ]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "error" => "登録に失敗しました"
    ]);
}
