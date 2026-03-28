<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$name = trim($data['name'] ?? '');
$amount = (int)($data['default_amount'] ?? 0);

if (!$name || $amount <= 0) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "名前と金額を正しく入力してください"
    ]);
    exit;
}

$pdo->beginTransaction();

try {
    $stmt = $pdo->prepare("
        INSERT INTO fixed_costs(user_id, name, default_amount)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$user_id, $name, $amount]);
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
