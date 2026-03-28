<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

// 現在の月次取得
$stmt_cycle = $pdo->prepare("
    SELECT id
    FROM monthly_cycles
    WHERE user_id = ?
    AND status = 'open'
    LIMIT 1
");
$stmt_cycle->execute([$user_id]);
$cycle = $stmt_cycle->fetch(PDO::FETCH_ASSOC);

if (!$cycle) {
    echo json_encode([
        "success" => false,
        "error" => "月次が存在しません"
    ]);
    exit;
}

$cycle_id = $cycle['id'];

// 実績(payments)集計
$stmt = $pdo->prepare("
    SELECT
        fc.default_account_id AS account_id,
        a.name AS account_name,
        SUM(p.amount) AS total_amount

    FROM payments p

    JOIN monthly_fixed_costs mf
    ON p.monthly_fixed_cost_id = mf.id

    JOIN fixed_costs fc
    ON mf.fixed_cost_id = fc.id

    LEFT JOIN accounts a
    ON fc.default_account_id = a.id

    WHERE mf.monthly_cycle_id = ?
    AND fc.default_account_id IS NOT NULL

    GROUP BY fc.default_account_id, a.name
    ORDER BY total_amount DESC
");

$stmt->execute([$cycle_id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 数値整形
$data = array_map(function ($row) {
    return [
        "account_id" => (int)$row["account_id"],
        "account_name" => $row["account_name"],
        "amount" => (int)$row["total_amount"],
    ];
}, $rows);

echo json_encode([
    "success" => true,
    "data" => $data
]);