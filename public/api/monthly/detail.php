<?php

require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$monthly_cycle_id = $_GET['id'] ?? null;

if (!$monthly_cycle_id) {
    echo json_encode([
        "success" => false,
        "error" => "monthly_cycle_id is required"
    ]);
    exit;
}

try {

    $stmt = $pdo->prepare("
        SELECT
            mf.id,
            mf.amount,
            fc.name,
            p.amount AS paid_amount,
            p.paid_date,
            a.name AS account_name
        FROM monthly_fixed_costs mf
        JOIN fixed_costs fc 
            ON mf.fixed_cost_id = fc.id
        LEFT JOIN payments p 
            ON p.monthly_fixed_cost_id = mf.id
        LEFT JOIN accounts a
            ON a.id = p.account_id
        WHERE mf.monthly_cycle_id = ?
        ORDER BY p.paid_date IS NULL ASC, p.paid_date ASC
    ");

    $stmt->execute([$monthly_cycle_id]);

    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $data
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "error" => "月次詳細の取得に失敗しました"
    ]);
}