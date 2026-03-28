<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$type = $data['type'] ?? null;
$account_id = isset($data['account_id']) ? (int)$data['account_id'] : null;
$to_account_id = isset($data['to_account_id']) ? (int)$data['to_account_id'] : null;
$amount = isset($data['amount']) ? (int)$data['amount'] : 0;
$memo = trim($data['memo'] ?? '');
$transaction_date = $data['transaction_date'] ?? null;

$allowed_types = ['deposit', 'transfer', 'payment'];
if (!in_array($type, $allowed_types) || !$account_id || $amount <= 0 || !$transaction_date) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "種別・口座・金額・日付を正しく入力してください"
    ]);
    exit;
}

if ($type === 'transfer' && !$to_account_id) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "振替の場合は振替先口座を選択してください"
    ]);
    exit;
}

$pdo->beginTransaction();

try {
    // 進行中の月次取得
    $stmt = $pdo->prepare("
        SELECT id FROM monthly_cycles
        WHERE user_id = ? AND status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $cycle = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$cycle) {
        throw new Exception("進行中の月次がありません");
    }

    $cycle_id = $cycle['id'];

    // 臨時トランザクション記録
    $stmt = $pdo->prepare("
        INSERT INTO spot_transactions
        (user_id, monthly_cycle_id, type, account_id, to_account_id, amount, memo, transaction_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$user_id, $cycle_id, $type, $account_id, $to_account_id, $amount, $memo ?: null, $transaction_date]);
    $spot_id = $pdo->lastInsertId();

    if ($type === 'payment') {
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$account_id]);
        $balance_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'payment', ?, ?)
        ");
        $stmt->execute([$account_id, $user_id, -$amount, $balance_after, $spot_id, $memo ?: '臨時支払い']);

    } elseif ($type === 'deposit') {
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$account_id]);
        $balance_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'deposit', ?, ?)
        ");
        $stmt->execute([$account_id, $user_id, $amount, $balance_after, $spot_id, $memo ?: '臨時入金']);

    } elseif ($type === 'transfer') {
        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?");
        $stmt->execute([$amount, $account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$account_id]);
        $balance_from_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'transfer', ?, ?)
        ");
        $stmt->execute([$account_id, $user_id, -$amount, $balance_from_after, $spot_id, $memo ?: '臨時振替（出）']);

        $stmt = $pdo->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?");
        $stmt->execute([$amount, $to_account_id]);

        $stmt = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
        $stmt->execute([$to_account_id]);
        $balance_to_after = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            INSERT INTO account_histories
            (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
            VALUES (?, ?, ?, ?, 'transfer', ?, ?)
        ");
        $stmt->execute([$to_account_id, $user_id, $amount, $balance_to_after, $spot_id, $memo ?: '臨時振替（入）']);
    }

    $pdo->commit();
    echo json_encode(["success" => true, "data" => ["id" => $spot_id], "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
