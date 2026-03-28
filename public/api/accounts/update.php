<?php
require 'config.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$id = (int)($data['id'] ?? 0);
$name = trim($data['name'] ?? '');
$type = in_array($data['type'] ?? '', ['asset','payment']) ? $data['type'] : 'asset';
$balance = isset($data['balance']) ? (int)$data['balance'] : 0;

if (!$id || !$name) {
    echo json_encode(["success"=>false,"data"=>null,"error"=>"IDと口座名は必須です"]);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE accounts SET name=?, type=?, balance=? WHERE id=? AND user_id=?");
    $stmt->execute([$name, $type, $balance, $id, $user_id]);
    echo json_encode(["success"=>true,"data"=>null,"error"=>null]);
} catch(Exception $e) {
    echo json_encode(["success"=>false,"data"=>null,"error"=>$e->getMessage()]);
}