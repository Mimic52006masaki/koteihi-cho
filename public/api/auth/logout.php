<?php
require '../cors.php';

// cors.php（= app/bootstrap/http.php）がセッションを開始済み。
// 以前はここでセッションが開始されておらず session_destroy() が失敗していた。
$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $params['path'],
        'domain'   => $params['domain'],
        'secure'   => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?: 'Lax',
    ]);
}

if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

echo json_encode(["success" => true, "data" => null, "error" => null]);
