<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$cycle_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$cycle_id) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "不正なIDです"
    ]);
    exit;
}

try {
    
    // ①月次が自分のclosedか確認
    $stmt = $pdo->prepare("
        SELECT id, cycle_date, status
        FROM monthly_cycles
        WHERE id = ?
        AND user_id = ?
        AND status = 'closed'
        LIMIT 1
    ");
    $stmt->execute([$cycle_id, $user_id]);
    $cycle = $stmt->fetch();

    if (!$cycle) {
        echo json_encode([
            "success" => false,
            "data" => null,
            "error" => "データが存在しません"
        ]);
        exit;
    }

    // ②明細取得
    $stmt = $pdo->prepare("
        SELECT
            mf.id,
            fc.name,
            mf.amount,
            p.amount AS actual_amount
        FROM monthly_fixed_costs mf
        JOIN fixed_costs fc
            ON fc.id = mf.fixed_cost_id
        LEFT JOIN payments p
            ON p.monthly_fixed_cost_id = mf.id
            AND p.status = 'paid'
        WHERE mf.monthly_cycle_id = ?
        ORDER BY mf.id ASC
    ");
    $stmt->execute([$cycle_id]);
    $items = $stmt->fetchAll();

    // ③合計計算
    $total_planned = 0;
    $total_actual = 0;

    foreach ($items as $item) {
        $total_planned += (int)$item['amount'];
        $total_actual += (int)($item['actual_amount'] ?? 0);
    }

    echo json_encode([
        "success" => true,
        "data" => [
            "cycle" => $cycle,
            "items" => $items,
            "total_planned" => $total_planned,
            "total_actual" => $total_actual
        ],
        "error" => null
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "履歴詳細の取得に失敗しました"
    ]);
}