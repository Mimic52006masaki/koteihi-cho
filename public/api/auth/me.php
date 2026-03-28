<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

echo json_encode([
    "success" => true,
    "data" => [
        "id" => $_SESSION['user_id'],
        "name" => $_SESSION['user_name']
    ],
    "error" => null
]);