<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("
    SELECT salary, safety_margin, bank_balance
    FROM users
    WHERE id = ?
");
$stmt->execute([$user_id]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "data" => $user
]);