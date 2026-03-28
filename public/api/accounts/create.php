<?php
require 'config.php';

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$name = trim($data['name'] ?? '');
$type = in_array($data['type'] ?? '', ['asset','payment']) ? $data['type'] : 'asset';
$balance = isset($data['balance']) ? (int)$data['balance'] : 0;

if (!$name) {
    echo json_encode(["success"=>false,"data"=>null,"error"=>"口座名は必須です"]);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO accounts (user_id, name, type, balance) VALUES (?, ?, ?, ?)");
    $stmt->execute([$user_id, $name, $type, $balance]);
    $id = $pdo->lastInsertId();
    echo json_encode(["success"=>true,"data"=>["id"=>$id,"name"=>$name,"type"=>$type,"balance"=>$balance],"error"=>null]);
} catch(Exception $e) {
    echo json_encode(["success"=>false,"data"=>null,"error"=>$e->getMessage()]);
}