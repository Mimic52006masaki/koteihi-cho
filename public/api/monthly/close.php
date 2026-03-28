<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

try {

    $pdo->beginTransaction();
    
    // ①open月次取得
    $stmt = $pdo->prepare("
        SELECT id
        FROM monthly_cycles
        WHERE user_id = ?
        AND status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $cycle = $stmt->fetch();

    if (!$cycle) {
        $pdo->rollBack();
        echo json_encode([
            "success" => false,
            "data" => null,
            "error" => "進行中の月次がありません"
        ]);
        exit;
    }

    // ②締め処理
    $stmt = $pdo->prepare("
        UPDATE monthly_cycles
        SET status = 'closed'
        WHERE id = ?
    ");
    $stmt->execute([$cycle['id']]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "data" => null,
        "error" => null
    ]);
} catch (Exception $e) {

    $pdo->rollBack();

    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "月次の締め処理に失敗しました"
    ]);
}