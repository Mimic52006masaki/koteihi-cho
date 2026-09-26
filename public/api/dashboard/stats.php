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
    JOIN fixed_costs fc ON fc.id = mf.fixed_cost_id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
    AND fc.type != 'deposit'
    AND p.status = 'paid'
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
    JOIN fixed_costs fc ON fc.id = mf.fixed_cost_id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
    AND fc.type != 'deposit'
");
$stmt->execute([$userId]);
$fixedRow = $stmt->fetch(PDO::FETCH_ASSOC);
$total_fixed_costs = (int)($fixedRow['total_fixed_costs'] ?? 0);

// ----------------------------
// 先月（直近の締め済みサイクル）の固定費実績
//
// 以前はここが GROUP BY 無しの SUM だったため、締め済みサイクルを全て1行に畳み込んでいた。
// 後ろの ORDER BY ... LIMIT 1 は1行しかない結果を切るだけで効いておらず、
// 「先月」ではなく「締め済み全期間の累計」を返していた。
// 対象サイクルを先に1件へ絞り、今月側と同じく取消（status!='paid'）と入金を除く。
// ----------------------------
$stmt = $pdo->prepare("
    SELECT id, cycle_date
    FROM monthly_cycles
    WHERE user_id = ? AND status = 'closed'
    ORDER BY cycle_date DESC, id DESC
    LIMIT 1
");
$stmt->execute([$userId]);
$last_cycle = $stmt->fetch(PDO::FETCH_ASSOC);

$last_month_total = 0;
$last_month_cycle_date = null;

if ($last_cycle) {
    $last_month_cycle_date = $last_cycle['cycle_date'];

    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(p.amount), 0) AS last_month_total
        FROM payments p
        JOIN monthly_fixed_costs mf ON mf.id = p.monthly_fixed_cost_id
        JOIN fixed_costs fc ON fc.id = mf.fixed_cost_id
        WHERE mf.monthly_cycle_id = ?
        AND p.status = 'paid'
        AND fc.type != 'deposit'
    ");
    $stmt->execute([$last_cycle['id']]);
    $last_month_total = (int)$stmt->fetchColumn();
}

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
// 口座別 固定費残り予算
// ----------------------------
// 固定費が1件も紐づいていない口座も出すため、固定費側はすべて LEFT JOIN にする。
// 未払いは開いている月の分だけを数える。mf を mc と内部結合してから外部結合しないと、
// 締め済みの月に払わなかった固定費までずっと未払いに加算される。
$stmt = $pdo->prepare("
    SELECT
        a.id AS account_id,
        a.name AS account_name,
        a.balance,
        COALESCE(SUM(CASE WHEN p.id IS NULL AND fc.type != 'deposit' THEN mf.amount ELSE 0 END), 0) AS unpaid_total
    FROM accounts a
    LEFT JOIN fixed_costs fc ON fc.default_account_id = a.id
        AND fc.user_id = ? AND fc.is_active = 1
    LEFT JOIN (
        monthly_fixed_costs mf
        JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
            AND mc.user_id = ? AND mc.status = 'open'
    ) ON mf.fixed_cost_id = fc.id
    LEFT JOIN payments p ON p.monthly_fixed_cost_id = mf.id AND p.status = 'paid'
    WHERE a.user_id = ?
    GROUP BY a.id, a.name, a.balance
    ORDER BY a.name
");
$stmt->execute([$userId, $userId, $userId]);
$accountRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
$account_summaries = array_map(function($row) {
    $balance = (int)$row['balance'];
    $unpaid = (int)$row['unpaid_total'];
    return [
        'account_id'    => (int)$row['account_id'],
        'account_name'  => $row['account_name'],
        'balance'       => $balance,
        'planned_total' => $unpaid,
        'remaining'     => $balance - $unpaid,
    ];
}, $accountRows);

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
        "last_month_cycle_date" => $last_month_cycle_date,
        "has_last_month" => $last_cycle ? true : false,
        "remaining_budget" => $remaining_budget,
        "fixed_count" => (int)$count,
        "recent" => $recent,
        "account_summaries" => $account_summaries
    ]
]);