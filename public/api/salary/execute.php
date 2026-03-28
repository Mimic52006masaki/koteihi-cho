<?php
require '../../cors.php';
require '../../../../app/middleware/auth.php';

$pdo = require '../../../../app/config/database.php';
$user_id = $_SESSION['user_id'];

$data = json_decode(file_get_contents("php://input"), true);

$monthly_cycle_id = isset($data["monthly_cycle_id"]) ? (int)$data["monthly_cycle_id"] : 0;
$amount = isset($data["amount"]) ? (int)$data["amount"] : 0;
$received_at = $data["received_at"] ?? date("Y-m-d");

if (!$monthly_cycle_id || $amount <= 0) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "月次IDと給与額は必須です"
    ]);
    exit;
}

$pdo->beginTransaction();

try {
    // ①月次サイクル確認（自分の・open）
    $stmt_cycle = $pdo->prepare("
        SELECT id, salary_account_id, salary_received
        FROM monthly_cycles
        WHERE id = ?
        AND user_id = ?
        AND status = 'open'
        LIMIT 1
    ");
    $stmt_cycle->execute([$monthly_cycle_id, $user_id]);
    $cycle = $stmt_cycle->fetch(PDO::FETCH_ASSOC);

    if (!$cycle) {
        throw new Exception("月次が存在しないか、すでに締められています");
    }

    if ($cycle['salary_received']) {
        throw new Exception("すでに給与受取済みです");
    }

    $salary_account_id = $cycle['salary_account_id'];
    if (!$salary_account_id) {
        throw new Exception("給与口座が設定されていません");
    }

    // ②salary_logs にレコード作成
    $stmt_log = $pdo->prepare("
        INSERT INTO salary_logs
        (user_id, monthly_cycle_id, amount, received_at)
        VALUES (?, ?, ?, ?)
    ");
    $stmt_log->execute([$user_id, $monthly_cycle_id, $amount, $received_at]);
    $salary_log_id = $pdo->lastInsertId();

    // ③給与口座残高に加算
    $stmt_update = $pdo->prepare("
        UPDATE accounts
        SET balance = balance + ?
        WHERE id = ?
    ");
    $stmt_update->execute([$amount, $salary_account_id]);

    // ④残高取得
    $stmt_bal = $pdo->prepare("SELECT balance FROM accounts WHERE id = ?");
    $stmt_bal->execute([$salary_account_id]);
    $balance_after = (int)$stmt_bal->fetchColumn();

    // ⑤account_histories に type='salary' で記録
    $stmt_hist = $pdo->prepare("
        INSERT INTO account_histories
        (account_id, user_id, change_amount, balance_after, type, reference_id, reason)
        VALUES (?, ?, ?, ?, 'salary', ?, '給与受取')
    ");
    $stmt_hist->execute([$salary_account_id, $user_id, $amount, $balance_after, $monthly_cycle_id]);

    // ⑥monthly_cycles を更新（salary と salary_received）
    $stmt_mc = $pdo->prepare("
        UPDATE monthly_cycles
        SET salary = ?, salary_received = TRUE
        WHERE id = ?
    ");
    $stmt_mc->execute([$amount, $monthly_cycle_id]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "data" => [
            "salary_log_id" => (int)$salary_log_id,
            "balance_after" => $balance_after
        ],
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
