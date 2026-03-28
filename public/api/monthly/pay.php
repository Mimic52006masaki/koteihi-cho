<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true);

$monthly_fixed_cost_id = $data["monthly_fixed_cost_id"];
$account_id = $data["account_id"];
$amount = (int)$data["amount"];
$paid_date = $data["paid_date"];

$pdo->beginTransaction();

try {
    // fixed_cost の type と to_account_id を取得
    $stmt = $pdo->prepare("
        SELECT fc.type, fc.to_account_id
        FROM monthly_fixed_costs mfc
        JOIN fixed_costs fc ON fc.id = mfc.fixed_cost_id
        WHERE mfc.id = ?
    ");
    $stmt->execute([$monthly_fixed_cost_id]);
    $fc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$fc) {
        throw new Exception("固定費が見つかりません");
    }

    $type = $fc['type'];
    $to_account_id = $fc['to_account_id'];

    // ①支払い記録
    $stmt = $pdo->prepare("
        INSERT INTO payments
        (monthly_fixed_cost_id, account_id, amount, paid_date, status)
        VALUES (?, ?, ?, ?, 'paid')
    ");
    $stmt->execute([$monthly_fixed_cost_id, $account_id, $amount, $paid_date]);
    $payment_id = $pdo->lastInsertId();

    if ($type === 'payment') {
        // 支払い：口座残高を減らす
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$account_id]);
        $balance_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'payment', ?, '固定費支払い')
        ");
        $stmt->execute([$account_id, $user_id, -$amount, $balance_after, $payment_id]);

    } elseif ($type === 'deposit') {
        // 入金：口座残高を増やす
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$account_id]);
        $balance_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'deposit', ?, '入金')
        ");
        $stmt->execute([$account_id, $user_id, $amount, $balance_after, $payment_id]);

    } elseif ($type === 'transfer') {
        if (!$to_account_id) {
            throw new Exception("振替先口座が設定されていません");
        }

        // 振替元：残高を減らす
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$account_id]);
        $balance_from_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'transfer', ?, '振替（出）')
        ");
        $stmt->execute([$account_id, $user_id, -$amount, $balance_from_after, $payment_id]);

        // 振替先：残高を増やす
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $to_account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$to_account_id]);
        $balance_to_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'transfer', ?, '振替（入）')
        ");
        $stmt->execute([$to_account_id, $user_id, $amount, $balance_to_after, $payment_id]);
    }

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
