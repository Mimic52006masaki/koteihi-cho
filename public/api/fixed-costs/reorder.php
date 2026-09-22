<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

/**
 * 固定費の表示順を並べ替える。
 *
 * 受け取るのは月次項目（monthly_fixed_costs.id）の配列で、画面に出ている順に並んだもの。
 * 並び順そのものは固定費マスタ（fixed_costs.sort_order）に保存するので、翌月以降も引き継がれる。
 *
 * 送られてこなかった項目の位置は動かさない。未払いタブだけを並べ替えても
 * 実行済みの項目が勝手に移動しないようにするため、対象が現在占めている
 * sort_order の「枠」を取り出して、その中で入れ替える。
 */

function reorder_fail($code, $message)
{
    http_response_code($code);
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reorder_fail(405, "POST required");
}

$pdo = require '../../../app/config/database.php';
$userId = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$ids = $data['ids'] ?? null;

if (!is_array($ids) || count($ids) < 2 || count($ids) > 200) {
    reorder_fail(400, "並べ替える項目を2件以上200件以内で指定してください");
}

$clean = [];
foreach ($ids as $id) {
    if (!is_int($id) && !(is_string($id) && ctype_digit($id))) {
        reorder_fail(400, "項目IDが不正です");
    }
    $clean[] = (int)$id;
}
if (count(array_unique($clean)) !== count($clean)) {
    reorder_fail(400, "項目IDが重複しています");
}

$placeholders = implode(',', array_fill(0, count($clean), '?'));

$pdo->beginTransaction();

try {
    // 対象の月次項目 → 固定費 の対応。ユーザーを跨いだ行は取れないようにする
    $stmt = $pdo->prepare("
        SELECT mf.id AS mf_id, fc.id AS fc_id
        FROM monthly_fixed_costs mf
        JOIN fixed_costs fc ON fc.id = mf.fixed_cost_id
        JOIN monthly_cycles mc ON mc.id = mf.monthly_cycle_id
        WHERE mf.id IN ($placeholders) AND mc.user_id = ? AND fc.user_id = ?
    ");
    $stmt->execute([...$clean, $userId, $userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($rows) !== count($clean)) {
        $pdo->rollBack();
        reorder_fail(404, "並べ替える項目が見つかりません");
    }

    $mfToFc = [];
    foreach ($rows as $row) {
        $mfToFc[(int)$row['mf_id']] = (int)$row['fc_id'];
    }

    // 同じ sort_order の行があると入れ替えの基準が壊れるので、
    // 先に現在の並びのまま連番へ正規化する（件数が少ないテーブルなので全行でよい）
    $stmt = $pdo->prepare("
        SELECT id FROM fixed_costs
        WHERE user_id = ?
        ORDER BY sort_order ASC, id ASC
        FOR UPDATE
    ");
    $stmt->execute([$userId]);
    $allIds = array_map('intval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id'));

    $position = [];
    foreach ($allIds as $index => $fcId) {
        $position[$fcId] = $index + 1;
    }

    $update = $pdo->prepare("UPDATE fixed_costs SET sort_order = ? WHERE id = ? AND user_id = ?");
    foreach ($position as $fcId => $pos) {
        $update->execute([$pos, $fcId, $userId]);
    }

    // 対象が占めている枠を取り出し、その中で新しい順に割り当て直す
    $targetFcIds = [];
    foreach ($clean as $mfId) {
        $targetFcIds[] = $mfToFc[$mfId];
    }

    $slots = [];
    foreach ($targetFcIds as $fcId) {
        $slots[] = $position[$fcId];
    }
    sort($slots, SORT_NUMERIC);

    foreach ($targetFcIds as $index => $fcId) {
        $update->execute([$slots[$index], $fcId, $userId]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "data" => ["count" => count($targetFcIds)],
        "error" => null
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[koteihi] reorder failed: ' . $e->getMessage());
    reorder_fail(500, "並べ替えに失敗しました");
}
