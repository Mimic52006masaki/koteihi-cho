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
    // 自分の固定費か確認
    $stmt = $pdo->prepare("SELECT id FROM fixed_costs WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user_id]);
    if (!$stmt->fetch()) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "data" => null, "error" => "固定費が見つかりません"]);
        exit;
    }

    // ①この固定費に紐づく payments を全件削除
    $stmt = $pdo->prepare("
        DELETE p FROM payments p
        INNER JOIN monthly_fixed_costs mf ON mf.id = p.monthly_fixed_cost_id
        WHERE mf.fixed_cost_id = ?
    ");
    $stmt->execute([$id]);

    // ②この固定費に紐づく monthly_fixed_costs を全件削除（open/closed 問わず）
    $stmt = $pdo->prepare("DELETE FROM monthly_fixed_costs WHERE fixed_cost_id = ?");
    $stmt->execute([$id]);

    // ③固定費本体を削除
    $stmt = $pdo->prepare("DELETE FROM fixed_costs WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user_id]);

    $pdo->commit();
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
