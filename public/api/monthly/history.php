<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

try {

    // 入金（給料など）は支出ではないので合計に入れない。
    // 取消した支払い（status='unpaid'）も除く。支払いは月次項目ごとに先に集計しておかないと、
    // 取消→再支払いで payments が2行になった項目の予定額が二重に足される。
    $stmt = $pdo->prepare("
        SELECT
            mc.id,
            mc.cycle_date,
            COALESCE(SUM(CASE WHEN fc.type != 'deposit' THEN mf.amount ELSE 0 END), 0) AS total_planned,
            COALESCE(SUM(CASE WHEN fc.type != 'deposit' THEN p.paid_amount ELSE 0 END), 0) AS total_actual
        FROM monthly_cycles mc
        LEFT JOIN monthly_fixed_costs mf
            ON mf.monthly_cycle_id = mc.id
        LEFT JOIN fixed_costs fc
            ON fc.id = mf.fixed_cost_id
        LEFT JOIN (
            SELECT monthly_fixed_cost_id, SUM(amount) AS paid_amount
            FROM payments
            WHERE status = 'paid'
            GROUP BY monthly_fixed_cost_id
        ) p ON p.monthly_fixed_cost_id = mf.id
        WHERE mc.user_id = ?
        AND mc.status = 'closed'
        GROUP BY mc.id, mc.cycle_date
        ORDER BY mc.cycle_date DESC
    ");

    $stmt->execute([$user_id]);
    $histories = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "data" => $histories,
        "error" => null
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "履歴の取得に失敗しました"
    ]);
}