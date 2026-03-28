<?php
$host   = getenv('DB_HOST') ?: 'localhost';
$dbname = getenv('DB_NAME') ?: 'budget_app';
$user     = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: 'root';
$dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
];

return new PDO($dsn, $user, $password, $options);