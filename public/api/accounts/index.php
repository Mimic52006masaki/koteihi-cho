<?php
require 'config.php';

try {
    $stmt = $pdo->prepare("SELECT id, name, type, balance FROM accounts WHERE user_id=?");
    $stmt->execute([$user_id]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(["success"=>true, "data"=>$data, "error"=>null]);
} catch(Exception $e) {
    echo json_encode(["success"=>false, "data"=>null, "error"=>$e->getMessage()]);
}