<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$close_date = $data['close_date'] ?? null;

if (!$close_date) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "締め日を選択してください"
    ]);
    exit;
}

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

    // ②締め処理（close_date を記録）
    $stmt = $pdo->prepare("
        UPDATE monthly_cycles
        SET status = 'closed', close_date = ?
        WHERE id = ?
    ");
    $stmt->execute([$close_date, $cycle['id']]);

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
