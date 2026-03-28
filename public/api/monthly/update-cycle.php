<?php
require '../cors.php';
require '../../../app/middleware/auth.php';

$pdo = require '../../../app/config/database.php';

$data = json_decode(file_get_contents("php://input"), true);

$cycle_id = $data['cycle_id'] ?? null;
$new_salary = isset($data['salary']) ? (int)$data['salary'] : 0;
$new_account_id = isset($data['salary_account_id']) && $data['salary_account_id'] !== "" 
    ? (int)$data['salary_account_id']
    : null;

if (!$cycle_id) {
    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => "cycle_id required"
    ]);
    exit;
}

try {

    $pdo->beginTransaction();

    // ① 現在のデータ取得
    $stmt = $pdo->prepare("
        SELECT salary, salary_account_id
        FROM monthly_cycles
        WHERE id = ?
    ");
    $stmt->execute([$cycle_id]);
    $current = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$current) {
        throw new Exception("cycle not found");
    }

    $old_salary = (int)($current['salary'] ?? 0);
    $old_account_id = $current['salary_account_id'] !== null
        ? (int)$current['salary_account_id']
        : null;

    // ② 差分計算
    $diff = $new_salary - $old_salary;

    // ③ 月次更新
    $stmt = $pdo->prepare("
        UPDATE monthly_cycles
        SET salary = ?, salary_account_id = ?
        WHERE id = ?
    ");
    $stmt->execute([$new_salary, $new_account_id, $cycle_id]);

    // ④ 同じ口座なら差分だけ加算
    if ($new_account_id !== null && $new_account_id === $old_account_id) {

        if ($diff !== 0) {
            $stmt = $pdo->prepare("
                UPDATE accounts
                SET balance = balance + ?
                WHERE id = ?
            ");
            $stmt->execute([$diff, $new_account_id]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("account not found");
            }
        }

    } else {

        // ⑤ 口座変更時

        // 古い口座から全額戻す
        if ($old_account_id !== null) {
            $stmt = $pdo->prepare("
                UPDATE accounts
                SET balance = balance - ?
                WHERE id = ?
            ");
            $stmt->execute([$old_salary, $old_account_id]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("old account not found");
            }
        }

        // 新しい口座に全額追加
        if ($new_account_id !== null) {
            $stmt = $pdo->prepare("
                UPDATE accounts
                SET balance = balance + ?
                WHERE id = ?
            ");
            $stmt->execute([$new_salary, $new_account_id]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("new account not found");
            }
        }
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "data" => null,
        "error" => null
    ]);

} catch (Exception $e) {

    $pdo->rollBack();

    echo json_encode([
        "success" => false,
        "data" => null,
        "error" => $e->getMessage()
    ]);
}