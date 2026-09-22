#!/usr/bin/env php
<?php
require __DIR__ . '/../app/services/ImportService.php';
try {
    $options = getopt('', ['user:', 'file:', 'commit:']);
    if (!isset($options['user'], $options['file']) || !ctype_digit($options['user']) || (int)$options['user'] < 1) {
        throw new InvalidArgumentException('Usage: php bin/import-payments.php --user=ID --file=/absolute/input.json [--commit=PREVIEW_HASH]');
    }
    $text = file_get_contents($options['file']);
    if ($text === false || strlen($text) > 2000000) throw new InvalidArgumentException('入力ファイルを確認してください（最大2MB）');
    $input = json_decode($text, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($input)) throw new InvalidArgumentException('入力はJSON配列です');
    // Configure DB_* in the server environment; never pass credentials in argv.
    if (!getenv('DB_NAME') || !getenv('DB_USER')) throw new RuntimeException('DB_NAMEとDB_USERを保護された環境設定で明示してください');
    $pdo = require __DIR__ . '/../app/config/database.php';
    $result = (new ImportService($pdo))->process((int)$options['user'], $input, $options['commit'] ?? null);
    echo ImportService::json($result), PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, '取込失敗: ' . $e->getMessage() . PHP_EOL); exit(1);
}
