<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$userId = (int)$_SESSION['user_id'];
$today = new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo'));
$weekStart = $today->modify('monday this week')->format('Y-m-d');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $date = $data['week_start'] ?? '';
    $asOf = $data['as_of_date'] ?? '';
    $spent = $data['spent_amount'] ?? null;
    $unconfirmed = $data['unconfirmed_count'] ?? null;
    $parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    $parsedAsOf = DateTimeImmutable::createFromFormat('!Y-m-d', $asOf);
    $valid = $parsedDate && $parsedDate->format('Y-m-d') === $date
        && $parsedDate->format('N') === '1'
        && $parsedAsOf && $parsedAsOf->format('Y-m-d') === $asOf
        && $date === $weekStart && $asOf <= $today->format('Y-m-d')
        && $asOf >= $date && $asOf <= $parsedDate->modify('+6 days')->format('Y-m-d')
        && filter_var($spent, FILTER_VALIDATE_INT) !== false && $spent >= 0
        && filter_var($unconfirmed, FILTER_VALIDATE_INT) !== false && $unconfirmed >= 0;
    if (!$valid) {
        http_response_code(422);
        echo json_encode(['success' => false, 'data' => null, 'error' => '週・金額・確認状況を確認してください'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $stmt = $pdo->prepare("INSERT INTO weekly_grocery_budgets
        (user_id, week_start, budget_amount, spent_amount, unconfirmed_count, as_of_date, source)
        VALUES (?, ?, 10000, ?, ?, ?, 'moneyforward_csv')
        ON DUPLICATE KEY UPDATE spent_amount = VALUES(spent_amount),
            unconfirmed_count = VALUES(unconfirmed_count), as_of_date = VALUES(as_of_date),
            source = VALUES(source)");
    $stmt->execute([$userId, $date, $spent, $unconfirmed, $asOf]);
} elseif ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'data' => null, 'error' => 'Method not allowed']);
    exit;
}

$stmt = $pdo->prepare('SELECT week_start, budget_amount, spent_amount, unconfirmed_count, as_of_date, source, updated_at
    FROM weekly_grocery_budgets WHERE user_id = ? AND week_start = ?');
$stmt->execute([$userId, $weekStart]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if ($row) {
    $row['budget_amount'] = (int)$row['budget_amount'];
    $row['spent_amount'] = (int)$row['spent_amount'];
    $row['unconfirmed_count'] = (int)$row['unconfirmed_count'];
    $row['remaining_amount'] = $row['budget_amount'] - $row['spent_amount'];
}
echo json_encode(['success' => true, 'data' => ['week_start' => $weekStart, 'budget_amount' => 10000, 'snapshot' => $row ?: null], 'error' => null], JSON_UNESCAPED_UNICODE);
