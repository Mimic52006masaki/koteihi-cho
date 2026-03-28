<?php
require '../../../app/middleware/cors.php';
require '../../../app/config/database.php';

try {
    $pdo->exec("ALTER TABLE users DROP COLUMN bank_balance;");
    echo json_encode(["success" => true, "message" => "bank_balanceカラムをusersテーブルから削除しました。"]);
} catch (PDOException $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>