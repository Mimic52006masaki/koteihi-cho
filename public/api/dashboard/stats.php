<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';

$userId = $_SESSION['user_id'];

// ----------------------------
// ユーザー設定取得
// ----------------------------
$stmt = $pdo->prepare("
    SELECT salary, safety_margin
    FROM users
    WHERE id = ?
");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

$salary = (int)$user["salary"];
$safety_margin = (int)$user["safety_margin"];

// ----------------------------
// 口座残高合計
// ----------------------------
$stmt = $pdo->prepare("
    SELECT COALESCE(SUM(balance),0) AS total_balance
    FROM accounts
    WHERE user_id = ?
");
$stmt->execute([$userId]);
$account_balance = $stmt->fetch(PDO::FETCH_ASSOC);
$total_balance = (int)$account_balance['total_balance'];

$usable_money = $total_balance - $safety_margin;

// ----------------------------
// 今月の固定費合計（実行済み）
// ----------------------------
$stmt = $pdo->prepare("
    SELECT COALESCE(SUM(p.amount), 0) AS monthly_total
    FROM payments p
    JOIN monthly_fixed_costs mf ON mf.id = p.monthly_fixed_cost_id
    JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
");
$stmt->execute([$userId]);
$cycle = $stmt->fetch(PDO::FETCH_ASSOC);
$monthly_total = (int)($cycle['monthly_total'] ?? 0);

// ----------------------------
// 今月の固定費合計（予定額）
// ----------------------------
$stmt = $pdo->prepare("
    SELECT COALESCE(SUM(mf.amount), 0) AS total_fixed_costs
    FROM monthly_fixed_costs mf
    JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
");
$stmt->execute([$userId]);
$fixedRow = $stmt->fetch(PDO::FETCH_ASSOC);
$total_fixed_costs = (int)($fixedRow['total_fixed_costs'] ?? 0);

// ----------------------------
// 先月の固定費合計
// ----------------------------
$stmt = $pdo->prepare("
    SELECT COALESCE(SUM(p.amount), 0) AS last_month_total
    FROM payments p
    JOIN monthly_fixed_costs mf ON mf.id = p.monthly_fixed_cost_id
    JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
    WHERE mc.user_id = ?
    AND mc.status = 'closed'
    ORDER BY mc.id DESC
    LIMIT 1
");
$stmt->execute([$userId]);
$lastMonth = $stmt->fetch(PDO::FETCH_ASSOC);
$last_month_total = (int)($lastMonth['last_month_total'] ?? 0);

// ----------------------------
// 残り予算
// ----------------------------
$remaining_budget = $usable_money - $monthly_total;

// ----------------------------
// 固定費数
// ----------------------------
$stmt = $pdo->prepare("
    SELECT COUNT(*)
    FROM fixed_costs
    WHERE user_id = ?
    AND is_active = 1
");
$stmt->execute([$userId]);
$count = $stmt->fetchColumn();

// ----------------------------
// 最近の支払い
// ----------------------------
$stmt = $pdo->prepare("
    SELECT p.id, fc.name, p.amount
    FROM payments p
    JOIN monthly_fixed_costs mf ON mf.id = p.monthly_fixed_cost_id
    JOIN fixed_costs fc ON fc.id = mf.fixed_cost_id
    JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
    WHERE mc.user_id = ?
    ORDER BY p.created_at DESC
    LIMIT 5
");
$stmt->execute([$userId]);
$recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ----------------------------
echo json_encode([
    "success" => true,
    "error" => null,
    "data" => [
        "salary" => $salary,
        "safety_margin" => $safety_margin,
        "total_balance" => $total_balance,
        "monthly_total" => $monthly_total,
        "total_fixed_costs" => $total_fixed_costs,
        "last_month_total" => $last_month_total,
        "remaining_budget" => $remaining_budget,
        "fixed_count" => (int)$count,
        "recent" => $recent
    ]
]);