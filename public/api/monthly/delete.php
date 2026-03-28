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
    // 自分の closed な月次か確認
    $stmt = $pdo->prepare("
        SELECT id FROM monthly_cycles
        WHERE id = ? AND user_id = ? AND status = 'closed'
    ");
    $stmt->execute([$id, $user_id]);
    if (!$stmt->fetch()) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "data" => null, "error" => "削除できる月次が見つかりません"]);
        exit;
    }

    // ①payments を削除（monthly_fixed_costs 経由）
    $stmt = $pdo->prepare("
        DELETE p FROM payments p
        INNER JOIN monthly_fixed_costs mfc ON mfc.id = p.monthly_fixed_cost_id
        WHERE mfc.monthly_cycle_id = ?
    ");
    $stmt->execute([$id]);

    // ②monthly_fixed_costs を削除
    $stmt = $pdo->prepare("DELETE FROM monthly_fixed_costs WHERE monthly_cycle_id = ?");
    $stmt->execute([$id]);

    // ③salary_logs を削除（テーブルが存在する場合）
    $stmt = $pdo->prepare("DELETE FROM salary_logs WHERE monthly_cycle_id = ?");
    $stmt->execute([$id]);

    // ④spot_transactions を削除（テーブルが存在する場合）
    try {
        $stmt = $pdo->prepare("DELETE FROM spot_transactions WHERE monthly_cycle_id = ?");
        $stmt->execute([$id]);
    } catch (Exception $e) {
        // spot_transactions テーブルがない場合はスキップ
    }

    // ⑤monthly_cycles を削除
    $stmt = $pdo->prepare("DELETE FROM monthly_cycles WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user_id]);

    $pdo->commit();
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
