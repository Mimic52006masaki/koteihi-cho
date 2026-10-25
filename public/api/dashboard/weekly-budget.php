<?php
require '../cors.php';
require '../../../app/middleware/auth.php';
require '../../../app/services/WeeklyBudget.php';

/**
 * 週の買い物予算の設定。保存した金額は次の月曜から使う（今週の予算は変えない）。
 */
$pdo = require '../../../app/config/database.php';
$userId = (int)$_SESSION['user_id'];
$today = new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo'));
$weekStart = WeeklyBudget::weekStart($today);
$nextWeekStart = WeeklyBudget::nextWeekStart($today);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $amount = $data['budget_amount'] ?? null;
    if (filter_var($amount, FILTER_VALIDATE_INT) === false || $amount < 1 || $amount > WeeklyBudget::MAX_AMOUNT) {
        http_response_code(422);
        echo json_encode(['success' => false, 'data' => null, 'error' => '予算は1〜1,000,000円の整数で入力してください'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $stmt = $pdo->prepare('INSERT INTO weekly_budget_settings (user_id, effective_from, budget_amount)
        VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE budget_amount = VALUES(budget_amount)');
    $stmt->execute([$userId, $nextWeekStart, (int)$amount]);
} elseif ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'data' => null, 'error' => 'Method not allowed']);
    exit;
}

$stmt = $pdo->prepare('SELECT budget_amount FROM weekly_grocery_budgets WHERE user_id = ? AND week_start = ?');
$stmt->execute([$userId, $weekStart]);
$saved = $stmt->fetchColumn();
echo json_encode(['success' => true, 'data' => [
    'week_start' => $weekStart,
    'budget_amount' => $saved === false ? WeeklyBudget::amountFor($pdo, $userId, $weekStart) : (int)$saved,
    'next_week_start' => $nextWeekStart,
    'next_budget_amount' => WeeklyBudget::amountFor($pdo, $userId, $nextWeekStart),
], 'error' => null], JSON_UNESCAPED_UNICODE);
