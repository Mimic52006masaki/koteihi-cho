<?php
require '../cors.php';

$pdo = require '../../../app/config/database.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Googleのみのユーザーは password が NULL になりうるので、先に存在を確かめる
if ($user && is_string($user['password']) && $user['password'] !== ''
    && password_verify($password, $user['password'])) {
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
    exit;
}

http_response_code(401);
echo json_encode([
    "success" => false,
    "data" => null,
    "error" => "メールアドレスまたはパスワードが違います"
], JSON_UNESCAPED_UNICODE);
