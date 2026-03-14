<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("
    SELECT id, name, default_amount, is_active, created_at
    FROM fixed_costs
    WHERE user_id = ?
    ORDER BY created_at DESC
");

$stmt->execute([$user_id]);

echo json_encode([
    "success" => true,
    "data" => $stmt->fetchAll()
]);