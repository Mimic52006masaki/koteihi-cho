<?php
require __DIR__ . '/../app/services/WeeklyBudget.php';
if (getenv('DB_NAME') !== 'koteihi_test') throw new RuntimeException('専用koteihi_test DBでのみ実行できます');
$db = require __DIR__ . '/../app/config/database.php';
if ($db->query('SHOW TABLES')->fetch()) throw new RuntimeException('空のテストDBが必要です');
$db->exec(file_get_contents(__DIR__ . '/../sql/schema.sql'));
$db->exec(file_get_contents(__DIR__ . '/../sql/migrate_v6_weekly_grocery.sql'));
$db->exec(file_get_contents(__DIR__ . '/../sql/migrate_v7_weekly_budget_settings.sql'));
$db->exec("INSERT INTO users(id,name,email) VALUES(1,'Test','test@example.invalid'),(2,'Other','other@example.invalid')");
$fail = 0;
function ok(bool $cond, string $label): void { global $fail; echo ($cond ? 'ok   ' : 'FAIL ') . $label . "\n"; if (!$cond) $fail++; }
$tz = new DateTimeZone('Asia/Tokyo');
$sunday = new DateTimeImmutable('2026-10-25 23:59:00', $tz);
$monday = new DateTimeImmutable('2026-10-26 00:00:00', $tz);
ok(WeeklyBudget::weekStart($sunday) === '2026-10-19', 'Sunday belongs to the week starting Monday 10/19');
ok(WeeklyBudget::nextWeekStart($sunday) === '2026-10-26', 'next week from Sunday is 10/26');
ok(WeeklyBudget::weekStart($monday) === '2026-10-26', 'Monday 0:00 starts a new week');
ok(WeeklyBudget::nextWeekStart($monday) === '2026-11-02', 'next week from Monday is 11/02');
ok(WeeklyBudget::amountFor($db, 1, '2026-10-19') === 10000, 'default is 10,000 without settings');
$db->exec("INSERT INTO weekly_budget_settings(user_id,effective_from,budget_amount) VALUES(1,'2026-10-26',8000),(2,'2026-10-19',3000)");
ok(WeeklyBudget::amountFor($db, 1, '2026-10-19') === 10000, 'this week stays 10,000 after setting next week');
ok(WeeklyBudget::amountFor($db, 1, '2026-10-26') === 8000, 'next week uses 8,000');
ok(WeeklyBudget::amountFor($db, 1, '2026-11-09') === 8000, 'later weeks keep 8,000');
ok(WeeklyBudget::amountFor($db, 2, '2026-10-26') === 3000, 'other user setting is separate');
$db->exec("INSERT INTO weekly_budget_settings(user_id,effective_from,budget_amount) VALUES(1,'2026-10-26',9000)
    ON DUPLICATE KEY UPDATE budget_amount = VALUES(budget_amount)");
ok(WeeklyBudget::amountFor($db, 1, '2026-10-26') === 9000, 'saving twice before Monday overwrites the same week');
ok((int)$db->query('SELECT COUNT(*) FROM weekly_budget_settings WHERE user_id=1')->fetchColumn() === 1, 'one row per effective week');
exit($fail ? 1 : 0);
