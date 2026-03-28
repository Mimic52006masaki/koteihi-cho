<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$id = (int)($data['id'] ?? 0);
$name = trim($data['name'] ?? '');
$amount = (int)($data['default_amount'] ?? 0);

if (!$id || !$name || $amount <= 0) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "不正なデータです"
    ]);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE fixed_costs
    SET name = ?, default_amount = ?
    WHERE id = ? AND user_id = ?
");

$stmt->execute([$name, $amount, $id, $user_id]);

echo json_encode(["success" => true, "data" => null, "error" => null]);