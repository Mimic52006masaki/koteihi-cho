<?php
require_once __DIR__ . '/config.php';

$account_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$account_id) {
    echo json_encode(["success" => false, "data" => null, "error" => "口座IDが必要です"]);
    exit;
}

// 自分の口座か確認
$stmt = $pdo->prepare("SELECT id, name, balance FROM accounts WHERE id = ? AND user_id = ?");
$stmt->execute([$account_id, $user_id]);
$account = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$account) {
    echo json_encode(["success" => false, "data" => null, "error" => "口座が見つかりません"]);
    exit;
}

// 履歴取得（新しい順・最大50件）
$stmt = $pdo->prepare("
    SELECT id, change_amount, balance_after, type, reason, created_at
    FROM account_histories
    WHERE account_id = ? AND user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
");
$stmt->execute([$account_id, $user_id]);
$histories = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "success" => true,
    "data" => [
        "account" => $account,
        "histories" => $histories
    ],
    "error" => null
]);
