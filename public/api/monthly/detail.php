<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

try {
    
    // ①open月次取得
    $stmt = $pdo->prepare("
        SELECT id, start_date, status
        FROM monthly_cycles
        WHERE user_id = ? AND status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $cycle = $stmt->fetch();

    if (!$cycle) {
        echo json_encode([
            "success" => false,
            "error" => "進行中の月次がありません"
        ]);
        exit;
    }

    // ②月次詳細取得
    $stmt = $pdo->prepare("
        SELECT
            mf.id,
            fc.name,
            mf.amount,
            mf.actual_amount
        FROM monthly_fixed_costs mf
        JOIN fixed_costs fc
            ON fc.id = mf.fixed_cost_id
        WHERE mf.monthly_cycle_id = ?
        ORDER BY mf.id ASC
    ");
    $stmt->execute([$cycle['id']]);
    $items = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "data" => [
            "cycle" => $cycle,
            "items" => $items
        ]
    ]);

} catch (Exception $e) {
    
    echo json_encode([
        "success" => false,
        "error" => "月次詳細の取得に失敗しました"
    ]);
}