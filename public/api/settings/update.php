<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        "success" => false,
        "error" => "POST required"
    ]);
    exit;
}

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true);

$salary = $data["salary"] ?? 0;
$safety_margin = $data["safety_margin"] ?? 0;
$bank_balance = $data["bank_balance"] ?? 0;

$stmt = $pdo->prepare("
    UPDATE users
    SET salary = ?, safety_margin = ?, bank_balance = ?
    WHERE id = ?
");

$stmt->execute([
    $salary,
    $safety_margin,
    $bank_balance,
    $user_id
]);

echo json_encode([
    "success" => true
]);