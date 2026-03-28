<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$id = (int)($data['id'] ?? 0);

if (!$id) {
    echo json_encode(["success" => false, "data" => null, "error" => "IDは必須です"]);
    exit;
}

$pdo->beginTransaction();

try {
    // 現在の状態を取得してからトグル
    $stmt = $pdo->prepare("
        SELECT is_active, default_amount FROM fixed_costs
        WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$id, $user_id]);
    $fc = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$fc) {
        $pdo->rollBack();
        echo json_encode(["success" => false, "data" => null, "error" => "固定費が見つかりません"]);
        exit;
    }

    $new_active = $fc['is_active'] ? 0 : 1;

    $stmt = $pdo->prepare("
        UPDATE fixed_costs SET is_active = ? WHERE id = ? AND user_id = ?
    ");
    $stmt->execute([$new_active, $id, $user_id]);

    // 進行中の月次サイクルを取得
    $stmt = $pdo->prepare("
        SELECT id FROM monthly_cycles
        WHERE user_id = ? AND status = 'open'
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $cycle = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($cycle) {
        $cycle_id = $cycle['id'];

        if ($new_active === 1) {
            // 有効化: まだ月次に存在しなければ追加
            $stmt = $pdo->prepare("
                SELECT id FROM monthly_fixed_costs
                WHERE monthly_cycle_id = ? AND fixed_cost_id = ?
            ");
            $stmt->execute([$cycle_id, $id]);
            $exists = $stmt->fetch();

            if (!$exists) {
                $stmt = $pdo->prepare("
                    INSERT INTO monthly_fixed_costs (monthly_cycle_id, fixed_cost_id, amount)
                    VALUES (?, ?, ?)
                ");
                $stmt->execute([$cycle_id, $id, $fc['default_amount']]);
            }
        } else {
            // 無効化: 未払いの場合のみ月次から削除
            $stmt = $pdo->prepare("
                DELETE mf FROM monthly_fixed_costs mf
                LEFT JOIN payments p ON p.monthly_fixed_cost_id = mf.id AND p.status = 'paid'
                WHERE mf.monthly_cycle_id = ?
                  AND mf.fixed_cost_id = ?
                  AND p.id IS NULL
            ");
            $stmt->execute([$cycle_id, $id]);
        }
    }

    $pdo->commit();
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
