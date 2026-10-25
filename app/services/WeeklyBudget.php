<?php
/** 週の買い物予算。設定変更は次の月曜から効かせ、行がなければ10,000円。 */
final class WeeklyBudget
{
    public const DEFAULT_AMOUNT = 10000;
    public const MAX_AMOUNT = 1000000;

    public static function weekStart(DateTimeImmutable $today): string {
        return $today->modify('monday this week')->format('Y-m-d');
    }

    public static function nextWeekStart(DateTimeImmutable $today): string {
        return $today->modify('monday next week')->format('Y-m-d');
    }

    public static function amountFor(PDO $pdo, int $userId, string $weekStart): int {
        $stmt = $pdo->prepare('SELECT budget_amount FROM weekly_budget_settings
            WHERE user_id = ? AND effective_from <= ? ORDER BY effective_from DESC LIMIT 1');
        $stmt->execute([$userId, $weekStart]);
        $amount = $stmt->fetchColumn();
        return $amount === false ? self::DEFAULT_AMOUNT : (int)$amount;
    }
}
