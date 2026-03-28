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
        "data" => null,
        "error" => "月次が存在しません"
    ]);
    exit;
}

$cycle_id = $cycle['id'];

// account_histories から type='transfer' の履歴を取得（入金側のみ表示）
$stmt = $pdo->prepare("
    SELECT
        ah.id,
        ah.change_amount AS amount,
        ah.created_at,
        a.name AS to_account_name,
        sa.name AS from_account_name
    FROM account_histories ah
    JOIN accounts a ON ah.account_id = a.id
    JOIN monthly_cycles mc ON ah.reference_id = mc.id
    JOIN accounts sa ON mc.salary_account_id = sa.id
    WHERE ah.type = 'transfer'
    AND ah.reference_id = ?
    AND ah.user_id = ?
    AND ah.change_amount > 0
    ORDER BY ah.created_at DESC
");

$stmt->execute([$cycle_id, $user_id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$data = array_map(function ($row) {
    return [
        "id" => (int)$row["id"],
        "amount" => (int)$row["amount"],
        "from_account_name" => $row["from_account_name"],
        "to_account_name" => $row["to_account_name"],
        "created_at" => $row["created_at"],
    ];
}, $rows);

echo json_encode([
    "success" => true,
    "data" => $data,
    "error" => null
]);
