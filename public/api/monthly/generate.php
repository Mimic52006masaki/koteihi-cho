<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$pdo->beginTransaction();

try {
    
    // open月次があるか確認
    $stmt = $pdo->prepare("
        SELECT id FROM monthly_cycles
        WHERE user_id = ? AND status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $existing = $stmt->fetch();

    if ($existing) {
        $pdo->rollBack();
        echo json_encode([
            "success" => false,
            "data" => null,
            "error" => "既に進行中の月次があります"
        ]);
        exit;
    }

    // 新規作成
    $stmt = $pdo->prepare("
        INSERT INTO monthly_cycles(user_id, cycle_date, start_date)
        VALUES (?, CURDATE(), CURDATE())
    ");
    $stmt->execute([$user_id]);
    $cycle_id = $pdo->lastInsertId();

    // 有効な固定費取得
    $stmt = $pdo->prepare("
        SELECT id, default_amount
        FROM fixed_costs
        WHERE user_id = ? AND is_active = 1
    ");
    $stmt->execute([$user_id]);
    $fixedCosts = $stmt->fetchAll();

    // 月次詳細生成
    foreach ($fixedCosts as $fc) {
        $stmt = $pdo->prepare("
            INSERT INTO monthly_fixed_costs
            (monthly_cycle_id, fixed_cost_id, amount)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([
            $cycle_id,
            $fc['id'],
            $fc['default_amount']
        ]);
    }
    $pdo->commit();
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "月次生成に失敗しました"
    ]);
}