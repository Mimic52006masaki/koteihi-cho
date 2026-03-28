<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

// 現在の月次取得
$stmt_cycle = $pdo->prepare("
    SELECT
        mc.id,
        mc.cycle_date,
        mc.salary,
        mc.salary_account_id,
        mc.salary_received,
        a.name AS salary_account_name
    FROM monthly_cycles mc
    LEFT JOIN accounts a ON mc.salary_account_id = a.id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
    LIMIT 1
");
$stmt_cycle->execute([$user_id]);
$cycle = $stmt_cycle->fetch(PDO::FETCH_ASSOC);

if (!$cycle) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "進行中の月次がありません"
    ]);
    exit;
}

$cycle_id = (int)$cycle['id'];

// 振替実行済みチェック（account_histories に type='transfer' の記録があるか）
$stmt_transfer = $pdo->prepare("
    SELECT COUNT(*) FROM account_histories
    WHERE type = 'transfer'
    AND reference_id = ?
    AND user_id = ?
");
$stmt_transfer->execute([$cycle_id, $user_id]);
$transfer_done = (int)$stmt_transfer->fetchColumn() > 0;

// 固定費支払い進捗
$stmt_costs = $pdo->prepare("
    SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN p.id IS NOT NULL THEN 1 ELSE 0 END) AS paid_count
    FROM monthly_fixed_costs mf
    LEFT JOIN payments p
        ON p.monthly_fixed_cost_id = mf.id
        AND p.status = 'paid'
    WHERE mf.monthly_cycle_id = ?
");
$stmt_costs->execute([$cycle_id]);
$costs = $stmt_costs->fetch(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "data" => [
        "cycle_id" => $cycle_id,
        "cycle_date" => $cycle['cycle_date'],
        "salary" => (int)$cycle['salary'],
        "salary_account_id" => $cycle['salary_account_id'] ? (int)$cycle['salary_account_id'] : null,
        "salary_account_name" => $cycle['salary_account_name'],
        "salary_received" => (bool)$cycle['salary_received'],
        "transfer_done" => $transfer_done,
        "paid_count" => (int)$costs['paid_count'],
        "total_count" => (int)$costs['total_count'],
    ],
    "error" => null
]);
