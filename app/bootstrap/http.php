<?php
/**
 * 認証・セッション・CORS の唯一の初期化経路。
 *
 * public/api/cors.php（認証系）と app/middleware/cors.php（通常API）は
 * どちらもここへ委譲する。経路ごとに Cookie 属性や CORS がばらつくのを防ぐため、
 * ここ以外で session_start() / session_set_cookie_params() を呼ばないこと。
 *
 * PHP 8.0 で動く範囲の構文に収めている（本番Webの実行バージョンに依存しないため）。
 */

if (defined('KOTEIHI_HTTP_BOOTSTRAPPED')) {
    return;
}
define('KOTEIHI_HTTP_BOOTSTRAPPED', true);

// .env はローカル開発用。本番は .htaccess の SetEnv を使う。
$envPath = dirname(__DIR__, 2) . '/.env';
if (is_file($envPath)) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        putenv(trim($key) . '=' . trim($value));
    }
}

// 例外の詳細はサーバーログだけに残す。DBの内部情報をクライアントへ返さない。
set_exception_handler(function (Throwable $e) {
    error_log('[koteihi] uncaught: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=UTF-8');
    }
    echo json_encode([
        'success' => false,
        'data'    => null,
        'error'   => 'サーバーエラーが発生しました',
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

$isHttps = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
    || ((string)($_SERVER['SERVER_PORT'] ?? '') === '443');

if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

$origin = getenv('FRONTEND_ORIGIN') ?: 'http://localhost:5173';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Vary: Origin');
header('Content-Type: application/json; charset=UTF-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}
