<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$name = trim($data['name'] ?? '');
$amount = (int)($data['default_amount'] ?? 0);
$type = $data['type'] ?? 'payment';
$default_account_id = isset($data['default_account_id']) ? (int)$data['default_account_id'] : null;
$to_account_id = isset($data['to_account_id']) ? (int)$data['to_account_id'] : null;

$allowed_types = ['deposit', 'transfer', 'payment'];
if (!$name || $amount <= 0 || !in_array($type, $allowed_types)) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "名前・金額・種別を正しく入力してください"
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
    $stmt = $pdo->prepare("
        INSERT INTO fixed_costs(user_id, name, type, default_amount, default_account_id, to_account_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$user_id, $name, $type, $amount, $default_account_id, $to_account_id]);
    $fixed_cost_id = $pdo->lastInsertId();

    // 進行中の月次サイクルがあれば追加
    $stmt = $pdo->prepare("
        SELECT id FROM monthly_cycles
        WHERE user_id = ? AND status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $cycle = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($cycle) {
        $stmt = $pdo->prepare("
            INSERT INTO monthly_fixed_costs (monthly_cycle_id, fixed_cost_id, amount)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$cycle['id'], $fixed_cost_id, $amount]);
    }

    $pdo->commit();
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
