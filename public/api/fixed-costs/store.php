<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$name = trim($data['name'] ?? '');
$amount = (int)($data['default_amount'] ?? 0);

if (!$name || $amount <= 0) {
    echo json_encode([
        "success" => false,
        "error" => "名前と金額を正しく入力してください"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    INSERT INTO fixed_costs(user_id, name, default_amount)
    VALUES (?, ?, ?)
");

$stmt->execute([$user_id, $name, $amount]);

echo json_encode(["success" => true]);