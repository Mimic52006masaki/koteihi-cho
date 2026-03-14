<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

try {

    $stmt = $pdo->prepare("
        SELECT
            mc.id,
            mc.start_date,
            mc.end_date,
            COALESCE(SUM(mf.amount), 0) AS total_planned,
            COALESCE(SUM(mf.actual_amount), 0) AS total_actual
        FROM monthly_cycles mc
        LEFT JOIN monthly_fixed_costs mf
            ON mf.monthly_cycle_id = mc.id
        WHERE mc.user_id = ?
        AND mc.status = 'closed'
        GROUP BY mc.id
        ORDER BY mc.start_date DESC
    ");

    $stmt->execute([$user_id]);
    $histories = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "data" => $histories
    ]);

} catch (Exception $e) {
    
    echo json_encode([
        "success" => false,
        "error" => "履歴の取得に失敗しました"
    ]);
}