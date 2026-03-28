<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$id = (int)($data['id'] ?? 0);

if (!$id) {
    echo json_encode(["success" => false, "data" => null, "error" => "IDが不正です"]);
    exit;
}

$pdo->beginTransaction();

try {
    // 自分のトランザクションか確認
    $stmt = $pdo->prepare("
        SELECT id, type, account_id, to_account_id, amount
        FROM spot_transactions
        WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$id, $user_id]);
    $spot = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$spot) {
        throw new Exception("トランザクションが見つかりません");
    }

    $type = $spot['type'];
    $account_id = $spot['account_id'];
    $to_account_id = $spot['to_account_id'];
    $amount = (int)$spot['amount'];

    // 口座残高を元に戻す
    if ($type === 'payment') {
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);
    } elseif ($type === 'deposit') {
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);
    } elseif ($type === 'transfer') {
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $to_account_id]);
    }

    // account_histories の reference_id が spot_id のものを削除
    $stmt = $pdo->prepare("
        DELETE FROM account_histories
        WHERE reference_id = ? AND user_id = ?
    ");
    $stmt->execute([$id, $user_id]);

    // spot_transactions を削除
    $stmt = $pdo->prepare("DELETE FROM spot_transactions WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user_id]);

    $pdo->commit();
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
