<?php
require __DIR__ . '/../cors.php';
require __DIR__ . '/../../../app/middleware/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); echo json_encode(['success'=>false,'error'=>'GET only']); exit;
}
try {
    $pdo = require __DIR__ . '/../../../app/config/database.php';
    $status = $_GET['status'] ?? 'held';
    if (!in_array($status, ['held','applied','ignored'], true)) {
        http_response_code(400); echo json_encode(['success'=>false,'error'=>'状態が不正です']); exit;
    }
    $before = filter_input(INPUT_GET, 'before', FILTER_VALIDATE_INT) ?: PHP_INT_MAX;
    $q = $pdo->prepare('SELECT id,source_key,raw_json,status,reason,decision_json,payment_id,created_at,updated_at FROM import_records WHERE user_id=? AND status=? AND id<? ORDER BY id DESC LIMIT 51');
    $q->execute([$_SESSION['user_id'], $status, $before]);
    $items = $q->fetchAll(PDO::FETCH_ASSOC); $hasMore = count($items) > 50; $items = array_slice($items, 0, 50);
    foreach ($items as &$item) {
        $item['raw'] = json_decode($item['raw_json'], true);
        $item['decision'] = json_decode($item['decision_json'], true);
        unset($item['raw_json'], $item['decision_json']);
    }
    unset($item);
    echo json_encode(['success'=>true,'data'=>['items'=>$items,'next_cursor'=>$hasMore ? end($items)['id'] : null]], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>'取込履歴を取得できません。DB移行と接続設定を確認してください']);
}
