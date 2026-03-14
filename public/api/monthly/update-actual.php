<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];

$id = (int)($data['id'] ?? 0);
$actual = isset($data['actual_amount']) ? (int)$data['actual_amount'] : null;

if (!$id) {
    echo json_encode([
        "success" => false,
        "error" => "不正なIDです"
    ]);
    exit;
}

try {

    // ①その明細が自分のopen月次のものか確認
    $stmt = $pdo->prepare("
        SELECT mf.id
        FROM monthly_fixed_costs mf
        JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
        WHERE mf.id = ?
        AND mc.user_id = ?
        AND mc.status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$id, $user_id]);
    $valid = $stmt->fetch();

    if (!$valid) {
        echo json_encode([
            "success" => false,
            "error" => "更新できません"
        ]);
        exit;
    }

    // ②更新
    $stmt = $pdo->prepare("
        UPDATE monthly_fixed_costs
        SET actual_amount = ?
        WHERE id = ?
    ");
    $stmt->execute([$actual, $id]);

    echo json_encode(["success" => true]);
} catch (Exception $e) {
    
    echo json_encode([
        "success" => false,
        "error" => "実績更新に失敗しました"
    ]);
}