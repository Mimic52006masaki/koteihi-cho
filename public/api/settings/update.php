<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "POST required"
    ]);
    exit;
}

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true);

$safety_margin = $data["safety_margin"] ?? 0;
// bank_balance は users テーブルから削除されたため、ここでは扱わない

$stmt = $pdo->prepare("
    UPDATE users
    SET safety_margin = ?
    WHERE id = ?
");

$stmt->execute([
    $safety_margin,
    $user_id
]);

echo json_encode([
    "success" => true,
    "data" => null,
    "error" => null
]);