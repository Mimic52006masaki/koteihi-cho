<?php
require '../../../app/middleware/cors.php';
require '../../../app/middleware/auth.php';

echo json_encode([
    "success" => true,
    "user" => [
        "id" => $_SESSION['user_id'],
        "name" => $_SESSION['user_name']
    ]
]);