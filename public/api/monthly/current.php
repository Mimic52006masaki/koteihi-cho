<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

// 現在の月次サイクル
$stmt_cycle = $pdo->prepare("
    SELECT id, cycle_date, status
    FROM monthly_cycles
    WHERE user_id = ? AND status = 'open'
    LIMIT 1
");
$stmt_cycle->execute([$user_id]);
$current_monthly_cycle = $stmt_cycle->fetch(PDO::FETCH_ASSOC);

if (!$current_monthly_cycle) {
    echo json_encode([
        "success" => true,
        "data" => null,
        "error" => null
    ]);
    exit;
}

$monthly_cycle_id = $current_monthly_cycle['id'];

// 固定費一覧（type・to_account_id を含む）
$stmt = $pdo->prepare("
    SELECT
        mf.id,
        mf.amount,
        fc.name,
        fc.type,
        fc.default_account_id,
        fc.to_account_id,
        ta.name AS to_account_name,

        p.amount AS paid_amount,
        p.paid_date,
        a.name AS account_name,
        a.id AS account_id

    FROM monthly_fixed_costs mf
    JOIN fixed_costs fc ON mf.fixed_cost_id = fc.id
    LEFT JOIN accounts ta ON ta.id = fc.to_account_id
    LEFT JOIN payments p ON p.monthly_fixed_cost_id = mf.id AND p.status = 'paid'
    LEFT JOIN accounts a ON p.account_id = a.id

    WHERE mf.monthly_cycle_id = ?

    ORDER BY
        p.paid_date IS NULL ASC,
        p.paid_date ASC
");
$stmt->execute([$monthly_cycle_id]);
$items = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

// 臨時トランザクション一覧
$stmt_spot = $pdo->prepare("
    SELECT
        s.id,
        s.type,
        s.account_id,
        a.name AS account_name,
        s.to_account_id,
        ta.name AS to_account_name,
        s.amount,
        s.memo,
        s.transaction_date
    FROM spot_transactions s
    JOIN accounts a ON a.id = s.account_id
    LEFT JOIN accounts ta ON ta.id = s.to_account_id
    WHERE s.monthly_cycle_id = ?
    ORDER BY s.transaction_date DESC, s.created_at DESC
");
$stmt_spot->execute([$monthly_cycle_id]);
$spots = $stmt_spot->fetchAll(PDO::FETCH_ASSOC) ?: [];

echo json_encode([
    "success" => true,
    "data" => [
        "items" => $items,
        "spots" => $spots,
        "cycle_id" => (int)$monthly_cycle_id,
        "cycle_date" => $current_monthly_cycle['cycle_date'],
        "status" => $current_monthly_cycle['status'],
    ],
    "error" => null
]);
