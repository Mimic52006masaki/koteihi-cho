<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$id = (int)($data['id'] ?? 0);
$name = trim($data['name'] ?? '');
$amount = (int)($data['default_amount'] ?? 0);
$type = $data['type'] ?? 'payment';
$default_account_id = isset($data['default_account_id']) ? (int)$data['default_account_id'] : null;
$to_account_id = isset($data['to_account_id']) ? (int)$data['to_account_id'] : null;

$allowed_types = ['deposit', 'transfer', 'payment'];
if (!$id || !$name || $amount <= 0 || !in_array($type, $allowed_types)) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "不正なデータです"
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

$stmt = $pdo->prepare("
    UPDATE fixed_costs
    SET name = ?, type = ?, default_amount = ?, default_account_id = ?, to_account_id = ?
    WHERE id = ? AND user_id = ?
");

$stmt->execute([$name, $type, $amount, $default_account_id, $to_account_id, $id, $user_id]);

echo json_encode(["success" => true, "data" => null, "error" => null]);
