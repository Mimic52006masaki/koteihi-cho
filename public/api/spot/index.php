<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

// 進行中の月次の臨時トランザクションを取得
$stmt = $pdo->prepare("
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
    WHERE s.user_id = ?
      AND s.monthly_cycle_id = (
          SELECT id FROM monthly_cycles
          WHERE user_id = ? AND status = 'open'
          LIMIT 1
      )
    ORDER BY s.transaction_date DESC, s.created_at DESC
");
$stmt->execute([$user_id, $user_id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(["success" => true, "data" => $rows, "error" => null]);
