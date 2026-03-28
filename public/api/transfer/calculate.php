<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

// 現在の月次取得（給与口座含む）
$stmt_cycle = $pdo->prepare("
    SELECT mc.id, mc.salary_account_id, mc.salary, mc.salary_received,
           a.name AS salary_account_name, a.balance AS salary_balance
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
        "error" => "月次が存在しません"
    ]);
    exit;
}

$cycle_id = $cycle['id'];

// 未払い固定費を支払口座ごとに集計（給与の分配先を算出）
$stmt = $pdo->prepare("
    SELECT
        fc.default_account_id AS account_id,
        a.name AS account_name,
        a.balance AS current_balance,
        SUM(mf.amount) AS total_amount

    FROM monthly_fixed_costs mf

    JOIN fixed_costs fc
    ON mf.fixed_cost_id = fc.id

    LEFT JOIN payments p
    ON p.monthly_fixed_cost_id = mf.id
    AND p.status = 'paid'

    LEFT JOIN accounts a
    ON fc.default_account_id = a.id

    WHERE mf.monthly_cycle_id = ?
    AND p.id IS NULL
    AND fc.default_account_id IS NOT NULL

    GROUP BY fc.default_account_id, a.name, a.balance
    ORDER BY total_amount DESC
");

$stmt->execute([$cycle_id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 合計振替額
$total_transfer = array_reduce($rows, function ($carry, $row) {
    return $carry + (int)$row['total_amount'];
}, 0);

$salary_balance = (int)($cycle['salary_balance'] ?? 0);
$balance_after_transfer = $salary_balance - $total_transfer;

// 振替先リスト整形
$items = array_map(function ($row) {
    $amount = (int)$row['total_amount'];
    $current_balance = (int)$row['current_balance'];
    return [
        "account_id" => (int)$row["account_id"],
        "account_name" => $row["account_name"],
        "amount" => $amount,
        "current_balance" => $current_balance,
    ];
}, $rows);

echo json_encode([
    "success" => true,
    "data" => [
        "items" => $items,
        "total_transfer" => $total_transfer,
        "salary_account_id" => $cycle['salary_account_id'] !== null ? (int)$cycle['salary_account_id'] : null,
        "salary_account_name" => $cycle['salary_account_name'],
        "salary_balance" => $salary_balance,
        "balance_after_transfer" => $balance_after_transfer,
        "salary_received" => (bool)$cycle['salary_received'],
    ],
    "error" => null
]);
