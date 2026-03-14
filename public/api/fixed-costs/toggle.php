<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$id = (int)($data['id'] ?? 0);

if (!$id) {
    echo json_encode(["success" => false]);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE fixed_costs
    SET is_active = NOT is_active
    WHERE id = ? AND user_id = ?
");

$stmt->execute([$id, $user_id]);

echo json_encode([
    "success" => true
]);