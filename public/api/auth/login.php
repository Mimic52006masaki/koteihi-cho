<?php
require '../../../app/middleware/cors.php';

$pdo = require '../../../app/config/database.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user['password'])) {
    session_regenerate_id(true);

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];

    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "email" => $user['email']
        ]
    ]);
    exit;
}

echo json_encode([
    "success" => false,
    "error" => "メールアドレスまたはパスワードが違います"
]);