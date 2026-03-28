<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

// 現在の月次サイクルID
$stmt_cycle = $pdo->prepare("
    SELECT
        mc.id,
        mc.cycle_date,
        mc.status,
        mc.salary,
        mc.salary_account_id,
        mc.salary_received,
        a.name AS salary_account_name
    FROM monthly_cycles mc
    LEFT JOIN accounts a
    ON mc.salary_account_id = a.id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
    LIMIT 1
");

$stmt_cycle->execute([$user_id]);
$current_monthly_cycle = $stmt_cycle->fetch(PDO::FETCH_ASSOC);

if (!$current_monthly_cycle) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "進行中の月次がありません"
    ]);
    exit;
}

$monthly_cycle_id = $current_monthly_cycle['id'];
$cycle_date = $current_monthly_cycle['cycle_date'];
$status = $current_monthly_cycle['status'];
$salary = $current_monthly_cycle['salary'];
$salary_account_id = $current_monthly_cycle['salary_account_id'];
$salary_account_name = $current_monthly_cycle['salary_account_name'];
$salary_received = (bool)$current_monthly_cycle['salary_received'];

$stmt = $pdo->prepare("
SELECT
mf.id,
mf.amount,
fc.name,

p.amount AS paid_amount,
p.paid_date,
a.name AS account_name,
a.id AS account_id

FROM monthly_fixed_costs mf

JOIN fixed_costs fc
ON mf.fixed_cost_id = fc.id

LEFT JOIN payments p
ON p.monthly_fixed_cost_id = mf.id
AND p.status = 'paid'

LEFT JOIN accounts a
ON p.account_id = a.id

WHERE mf.monthly_cycle_id = ?

ORDER BY
p.paid_date IS NULL ASC,
p.paid_date ASC
");

$stmt->execute([$monthly_cycle_id]);

$data = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

echo json_encode([
    "success" => true,
    "data" => [
        "items" => $data,
        "cycle_id" => (int)$monthly_cycle_id,
        "cycle_date" => $cycle_date,
        "status" => $status,
        "salary" => (int)$salary,
        "salary_account_id" => $salary_account_id !== null ? (int)$salary_account_id : null,
        "salary_account_name" => $salary_account_name,
        "salary_received" => $salary_received,
    ],
    "error" => null
]);