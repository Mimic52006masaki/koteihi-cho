<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true);

$monthly_fixed_cost_id = $data["monthly_fixed_cost_id"];

$pdo->beginTransaction();

try {
    // ①支払い情報取得（status='paid' のもの）
    $stmt = $pdo->prepare("
        SELECT id, account_id, amount
        FROM payments
        WHERE monthly_fixed_cost_id = ?
        AND status = 'paid'
        LIMIT 1
    ");
    $stmt->execute([$monthly_fixed_cost_id]);
    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$payment) {
        throw new Exception("支払いが見つかりません");
    }

    // ②口座残高を戻す
    $stmt = $pdo->prepare("
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
    ");
    $stmt->execute([
        $payment["amount"],
        $payment["account_id"]
    ]);

    // ③残高取得
    $stmt_bal = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
    $stmt_bal->execute([$payment["account_id"]]);
    $balance_after = (int)$stmt_bal->fetchColumn();

    // ④account_histories に取消記録
    $stmt_hist = $pdo->prepare("
        INSERT INTO account_histories
        (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
        VALUES (?, ?, ?, ?, 'payment', ?, '固定費支払取消')
    ");
    $stmt_hist->execute([
        $payment["account_id"],
        $user_id,
        (int)$payment["amount"],
        $balance_after,
        $payment["id"]
    ]);

    // ⑤payments を削除せず status='unpaid' に更新（履歴保持）
    $stmt = $pdo->prepare("
        UPDATE payments
        SET status = 'unpaid'
        WHERE id = ?
    ");
    $stmt->execute([$payment["id"]]);

    $pdo->commit();

    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => $e->getMessage()
    ]);
}
