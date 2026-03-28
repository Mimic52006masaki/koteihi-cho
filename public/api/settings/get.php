<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("
    SELECT safety_margin
    FROM users
    WHERE id = ?
");
$stmt->execute([$user_id]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

// accounts テーブルから合計残高を取得
$stmt_balance = $pdo->prepare("
    SELECT COALESCE(SUM(balance), 0) AS total_balance
    FROM accounts
    WHERE user_id = ?
");
$stmt_balance->execute([$user_id]);
$total_balance = $stmt_balance->fetch(PDO::FETCH_ASSOC)['total_balance'];

$user['bank_balance'] = $total_balance; // bank_balance として返す

echo json_encode([
    "success" => true,
    "data" => $user,
    "error" => null
]);