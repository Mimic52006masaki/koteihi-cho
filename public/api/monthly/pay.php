<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true);

$monthly_fixed_cost_id = $data["monthly_fixed_cost_id"];
$account_id = $data["account_id"];
$amount = $data["amount"];
$paid_date = $data["paid_date"];

$pdo->beginTransaction();

try {
    // ①支払い記録（status='paid'）
    $stmt = $pdo->prepare("
        INSERT INTO payments
        (monthly_fixed_cost_id, account_id, amount, paid_date, status)
        VALUES (?, ?, ?, ?, 'paid')
    ");
    $stmt->execute([
        $monthly_fixed_cost_id,
        $account_id,
        $amount,
        $paid_date
    ]);
    $payment_id = $pdo->lastInsertId();

    // ②口座残高を減らす
    $stmt = $pdo->prepare("
        UPDATE accounts
        SET balance = balance - ?
        WHERE id = ?
    ");
    $stmt->execute([$amount, $account_id]);

    // ③残高取得
    $stmt_bal = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
    $stmt_bal->execute([$account_id]);
    $balance_after = (int)$stmt_bal->fetchColumn();

    // ④account_histories に記録
    $stmt_hist = $pdo->prepare("
        INSERT INTO account_histories
        (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
        VALUES (?, ?, ?, ?, 'payment', ?, '固定費支払い')
    ");
    $stmt_hist->execute([$account_id, $user_id, -$amount, $balance_after, $payment_id]);

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
