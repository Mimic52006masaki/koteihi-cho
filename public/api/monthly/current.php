<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("
    SELECT
        mf.id,
        fc.name,
        mf.amount,
        mf.actual_amount
    FROM monthly_cycles mc
    JOIN monthly_fixed_costs mf
        On mf.monthly_cycle_id = mc.id
    JOIN fixed_costs fc
        ON fc.id = mf.fixed_cost_id
    WHERE mc.user_id = ?
    AND mc.status = 'open'
");

$stmt->execute([$user_id]);
$data = $stmt->fetchAll();

echo json_encode([
    "success" => true,
    "data" => $data
]);