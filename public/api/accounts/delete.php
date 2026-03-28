<?php
require 'config.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$id = (int)($data['id'] ?? 0);

if (!$id) {
    echo json_encode(["success" => false, "data" => null, "error" => "IDは必須です"]);
    exit;
}

try {
    // account_histories が存在する場合は削除不可
    $stmt_check = $pdo->prepare("
        SELECT COUNT(*) FROM account_histories WHERE account_id = ?
    ");
    $stmt_check->execute([$id]);

    if ($stmt_check->fetchColumn() > 0) {
        echo json_encode([
            "success" => false,
            "data" => null,
            "error" => "この口座には取引履歴があるため削除できません"
        ]);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM accounts WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $user_id]);
    echo json_encode(["success" => true, "data" => null, "error" => null]);

} catch (Exception $e) {
    echo json_encode(["success" => false, "data" => null, "error" => $e->getMessage()]);
}
