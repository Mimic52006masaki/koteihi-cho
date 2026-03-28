<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

try {
    $pdo->beginTransaction();

    // 現在の月次取得
    $stmt_cycle = $pdo->prepare("
        SELECT id, salary_account_id
        FROM monthly_cycles
        WHERE user_id = ?
        AND status = 'open'
        LIMIT 1
    ");
    $stmt_cycle->execute([$user_id]);
    $cycle = $stmt_cycle->fetch(PDO::FETCH_ASSOC);

    if (!$cycle) {
        throw new Exception("月次が存在しません");
    }

    $cycle_id = $cycle['id'];
    $salary_account_id = $cycle['salary_account_id'];

    if (!$salary_account_id) {
        throw new Exception("給与口座が設定されていません");
    }

    // 二重実行チェック（account_histories の type='transfer' で確認）
    $stmt_check = $pdo->prepare("
        SELECT COUNT(*) FROM account_histories
        WHERE type = 'transfer'
        AND reference_id = ?
        AND user_id = ?
    ");
    $stmt_check->execute([$cycle_id, $user_id]);

    if ($stmt_check->fetchColumn() > 0) {
        throw new Exception("既に振替実行済みです");
    }

    // 振替予定（未払い固定費の口座ごと合計）
    $stmt = $pdo->prepare("
        SELECT
            fc.default_account_id AS account_id,
            SUM(mf.amount) AS total_amount
        FROM monthly_fixed_costs mf
        JOIN fixed_costs fc
            ON mf.fixed_cost_id = fc.id
        LEFT JOIN payments p
            ON p.monthly_fixed_cost_id = mf.id
            AND p.status = 'paid'
        WHERE mf.monthly_cycle_id = ?
            AND p.id IS NULL
            AND fc.default_account_id IS NOT NULL
        GROUP BY fc.default_account_id
    ");
    $stmt->execute([$cycle_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$rows) {
        throw new Exception("振替対象がありません");
    }

    // 全口座ロック
    $account_ids = array_map(fn($r) => (int)$r['account_id'], $rows);
    $account_ids[] = (int)$salary_account_id;
    $account_ids = array_unique($account_ids);

    $placeholders = implode(',', array_fill(0, count($account_ids), '?'));
    $stmt_lock = $pdo->prepare("
        SELECT id FROM accounts
        WHERE id IN ($placeholders)
        FOR UPDATE
    ");
    $stmt_lock->execute($account_ids);

    // 合計金額算出
    $total_transfer = array_reduce($rows, function ($carry, $row) {
        return $carry + (int)$row['total_amount'];
    }, 0);

    // 給与口座残高チェック
    $stmt_balance = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
    $stmt_balance->execute([$salary_account_id]);
    $salary_account = $stmt_balance->fetch(PDO::FETCH_ASSOC);

    if (!$salary_account) {
        throw new Exception("給与口座が存在しません");
    }

    if ($salary_account['balance'] < $total_transfer) {
        throw new Exception("残高不足です");
    }

    // 給与口座から減算
    $stmt_update_from = $pdo->prepare("
        UPDATE accounts
        SET balance = balance - ?
        WHERE id = ?
    ");
    $stmt_update_from->execute([$total_transfer, $salary_account_id]);

    // 給与口座の残高取得
    $stmt_bal = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
    $stmt_bal->execute([$salary_account_id]);
    $salary_balance_after = (int)$stmt_bal->fetchColumn();

    // account_histories に給与口座からの出金を記録
    $stmt_hist_from = $pdo->prepare("
        INSERT INTO account_histories
        (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
        VALUES (?, ?, ?, ?, 'transfer', ?, '振替出金')
    ");
    $stmt_hist_from->execute([
        $salary_account_id,
        $user_id,
        -$total_transfer,
        $salary_balance_after,
        $cycle_id
    ]);

    // 各口座へ加算 + account_histories 記録
    $stmt_update_to = $pdo->prepare("
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
    ");
    $stmt_hist_to = $pdo->prepare("
        INSERT INTO account_histories
        (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
        VALUES (?, ?, ?, ?, 'transfer', ?, '振替入金')
    ");
    $stmt_bal_to = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");

    foreach ($rows as $row) {
        $to_account_id = (int)$row['account_id'];
        $to_amount = (int)$row['total_amount'];

        $stmt_update_to->execute([$to_amount, $to_account_id]);

        $stmt_bal_to->execute([$to_account_id]);
        $to_balance_after = (int)$stmt_bal_to->fetchColumn();

        $stmt_hist_to->execute([
            $to_account_id,
            $user_id,
            $to_amount,
            $to_balance_after,
            $cycle_id
        ]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "data" => ["total_transfer" => $total_transfer],
        "error" => null
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => $e->getMessage()
    ]);
}
