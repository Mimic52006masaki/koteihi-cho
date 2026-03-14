<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';

$userId = $_SESSION['user_id'];

// ----------------------------
// ユーザー設定取得
// ----------------------------

$stmt = $pdo->prepare("
    SELECT salary, safety_margin, bank_balance
    FROM users
    WHERE id = ?
");

$stmt->execute([$userId]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

$salary = (int)$user["salary"];
$safety_margin = (int)$user["safety_margin"];
$bank_balance = $user['bank_balance'];
$usable_money = $bank_balance - $safety_margin;

// ----------------------------
// 今月の固定費合計
// ----------------------------

$stmt = $pdo->prepare("
    SELECT 
        COALESCE(SUM(mf.actual_amount), 0) AS monthly_total
    FROM monthly_fixed_costs mf
    JOIN monthly_cycles mc
    ON mc.id = mf.monthly_cycle_id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
");

$stmt->execute([$userId]);

$cycle = $stmt->fetch(PDO::FETCH_ASSOC);

$monthly_total = (int)($cycle['monthly_total'] ?? 0);

// ----------------------------
// 先月の固定費合計
// ----------------------------
$stmt = $pdo->prepare("
    SELECT
        COALESCE(SUM(mf.actual_amount), 0) AS last_month_total
    FROM monthly_fixed_costs mf
    JOIN monthly_cycles mc
        ON mc.id = mf.monthly_cycle_id
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
//  最近の支払い
// ----------------------------

$stmt = $pdo->prepare("
    SELECT 
        mf.id, 
        fc.name, 
        mf.actual_amount
    FROM monthly_fixed_costs mf
    JOIN fixed_costs fc
        ON fc.id = mf.fixed_cost_id
    JOIN monthly_cycles mc
        ON mc.id = mf.monthly_cycle_id
    WHERE mc.user_id = ?
    ORDER BY mf.created_at DESC
    LIMIT 5
");

$stmt->execute([$userId]);
$recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ----------------------------

echo json_encode([
    "success" => true,
    "data" => [
        "salary" => (int)$salary,
        "safety_margin" => (int)$safety_margin,
        "bank_balance" => (int)$bank_balance,
        "monthly_total" => (int)$monthly_total,
        "last_month_total" => (int)$last_month_total,
        "remaining_budget" => $remaining_budget,
        "fixed_count" => (int)$count,
        "recent" => $recent
    ]
]);