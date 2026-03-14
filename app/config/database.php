<?php
$dsn = "mysql:host=localhost;dbname=budget_app;charset=utf8mb4";
$user = getenv("DB_USER") ?: "root";
$password = getenv("DB_PASS") ?: "root";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
];

return new PDO($dsn, $user, $password, $options);