<?php
/** Bank statement reconciliation: never changes balances or account_histories. */
final class ImportService
{
    private PDO $db;
    public function __construct(PDO $db) { $this->db = $db; }
    private function rows(string $sql, array $args = []): array {
        $q = $this->db->prepare($sql); $q->execute($args); return $q->fetchAll(PDO::FETCH_ASSOC);
    }
    private function run(string $sql, array $args): void {
        $q = $this->db->prepare($sql); $q->execute($args);
    }
    public static function json($value): string {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
    public static function validate(array $input): array {
        if (!array_is_list($input) || count($input) < 1 || count($input) > 200) {
            throw new InvalidArgumentException('明細は1〜200件の配列で指定してください');
        }
        $seen = []; $out = [];
        foreach ($input as $r) {
            if (!is_array($r)) throw new InvalidArgumentException('明細形式が不正です');
            foreach (['source_key', 'description', 'paid_date'] as $key) {
                if (!isset($r[$key]) || !is_string($r[$key]) || trim($r[$key]) === '') {
                    throw new InvalidArgumentException($key . 'が必要です');
                }
            }
            if (strlen($r['source_key']) > 191 || !preg_match('/^[\x21-\x7e]+$/D', $r['source_key']) || isset($seen[$r['source_key']])) {
                throw new InvalidArgumentException('source_keyは重複しない191文字以内のASCII識別子にしてください');
            }
            $seen[$r['source_key']] = true;
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $r['paid_date']);
            if (!$date || $date->format('Y-m-d') !== $r['paid_date']) throw new InvalidArgumentException('日付が不正です');
            foreach (['account_id', 'amount'] as $key) {
                if (!isset($r[$key]) || !is_int($r[$key]) || $r[$key] < 1 || $r[$key] > 2147483647) throw new InvalidArgumentException($key . 'は正の整数です');
            }
            $target = $r['monthly_fixed_cost_id'] ?? null;
            if ($target !== null && (!is_int($target) || $target < 1)) throw new InvalidArgumentException('対象IDが不正です');
            $evidence = $r['match_evidence'] ?? '';
            if (!is_string($evidence) || strlen($evidence) > 4000 || strlen($r['description']) > 4000) throw new InvalidArgumentException('説明が長すぎるか形式が不正です');
            $out[] = ['source_key' => $r['source_key'], 'account_id' => $r['account_id'], 'amount' => $r['amount'], 'paid_date' => $r['paid_date'], 'description' => $r['description'], 'monthly_fixed_cost_id' => $target, 'match_evidence' => $evidence];
        }
        usort($out, fn($a, $b) => strcmp($a['source_key'], $b['source_key']));
        return $out;
    }
    /** Both preview and commit read the same locked state; preview rolls back. */
    public function process(int $user, array $input, ?string $expectedHash = null): array {
        $entries = self::validate($input);
        $this->db->beginTransaction();
        try {
            if (!$this->rows('SELECT id FROM users WHERE id=? FOR UPDATE', [$user])) throw new InvalidArgumentException('ユーザーが見つかりません');
            $counts = array_count_values(array_filter(array_column($entries, 'monthly_fixed_cost_id'), fn($v) => $v !== null));
            $plan = [];
            foreach ($entries as $r) $plan[] = $this->decide($user, $r, $counts);
            $hash = hash('sha256', self::json($plan));
            if ($expectedHash !== null) {
                if (!hash_equals($hash, $expectedHash)) throw new RuntimeException('入力またはDBが変わりました。再度プレビューしてください');
                foreach ($plan as $d) $this->apply($user, $d);
                $this->db->commit();
            } else $this->db->rollBack();
            return ['preview_hash' => $hash, 'committed' => $expectedHash !== null, 'items' => $plan];
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            throw $e;
        }
    }
    private function decide(int $user, array $r, array $counts): array {
        $d = ['entry' => $r, 'action' => 'hold', 'reason' => '', 'record' => null, 'target' => null, 'payments' => []];
        // Validate ownership before retaining input. No foreign account data enters the ledger.
        if (!$this->rows('SELECT id FROM accounts WHERE id=? AND user_id=? FOR UPDATE', [$r['account_id'], $user])) throw new InvalidArgumentException('自分の口座を指定してください');
        $old = $this->rows('SELECT * FROM import_records WHERE user_id=? AND source_key=? FOR UPDATE', [$user, $r['source_key']]);
        if ($old) {
            $d['record'] = $old[0];
            $raw = json_decode($old[0]['raw_json'], true, 512, JSON_THROW_ON_ERROR);
            foreach (['account_id','amount','paid_date','description'] as $k) {
                if ($raw[$k] !== $r[$k]) throw new InvalidArgumentException('既存source_keyの原明細は変更できません: ' . $r['source_key']);
            }
            if ($old[0]['status'] !== 'held') {
                $d['action'] = 'skip'; $d['reason'] = '処理済みの明細'; return $d;
            }
        }
        $target = $r['monthly_fixed_cost_id'];
        if (!$target || trim($r['match_evidence']) === '') {
            $d['reason'] = '固定費との対応が未確認。対象月次項目と名称・口座の照合根拠を確認してください'; return $d;
        }
        $rows = $this->rows("SELECT mf.*, mc.status AS cycle_status, mc.is_closed, mc.cycle_date, fc.name, fc.type, fc.default_account_id
            FROM monthly_fixed_costs mf JOIN monthly_cycles mc ON mc.id=mf.monthly_cycle_id
            JOIN fixed_costs fc ON fc.id=mf.fixed_cost_id
            WHERE mf.id=? AND mc.user_id=? AND fc.user_id=? FOR UPDATE", [$target, $user, $user]);
        if (!$rows) { $d['reason'] = '対象月次項目が見つかりません。固定費を自動作成せず確認してください'; return $d; }
        $d['target'] = $rows[0]; $t = $rows[0];
        $d['payments'] = $this->rows('SELECT * FROM payments WHERE monthly_fixed_cost_id=? ORDER BY id FOR UPDATE', [$target]);
        if ($t['cycle_status'] !== 'open' || (int)$t['is_closed'] !== 0 || $t['type'] !== 'payment') {
            $d['reason'] = 'open月次の支払い項目だけが取込対象です'; return $d;
        }
        if ($r['paid_date'] < $t['cycle_date']) { $d['reason'] = '明細日が対象サイクル開始日前です。対象月次を確認してください'; return $d; }
        $next = $this->rows('SELECT cycle_date FROM monthly_cycles WHERE user_id=? AND cycle_date>? ORDER BY cycle_date LIMIT 1 FOR UPDATE', [$user, $t['cycle_date']]);
        if ($next && $r['paid_date'] >= $next[0]['cycle_date']) { $d['reason'] = '明細日が次のサイクルに属します。対象月次を確認してください'; return $d; }
        // Previously held bank candidates must not disappear merely by splitting a batch.
        $otherHeld = $this->rows("SELECT decision_json FROM import_records WHERE user_id=? AND status='held' AND source_key<>? FOR UPDATE", [$user, $r['source_key']]);
        foreach ($otherHeld as $held) {
            $decision = json_decode($held['decision_json'], true, 512, JSON_THROW_ON_ERROR);
            if (($decision['entry']['monthly_fixed_cost_id'] ?? null) === $target) {
                $d['reason'] = '同じ固定費に別の保留明細があります。各明細の対応を確認してください'; return $d;
            }
        }
        if ((int)$t['default_account_id'] !== $r['account_id']) { $d['reason'] = '既定口座と明細口座が不一致。口座変更の有無を確認してください'; return $d; }
        if (($counts[$target] ?? 0) > 1) { $d['reason'] = '同じ固定費に複数の銀行明細があります。合算・別支払いの判断が必要です'; return $d; }
        $paid = array_values(array_filter($d['payments'], fn($p) => $p['status'] === 'paid'));
        if (!$d['payments']) {
            if ($t['actual_amount'] !== null || $t['paid_date'] !== null) {
                $d['reason'] = '支払履歴なしで月次実績が登録されています。先行入力を確認してください'; return $d;
            }
            $d['action'] = 'insert'; $d['reason'] = '照合根拠を指定した未登録の支払い'; return $d;
        }
        if (count($paid) === 1 && count($d['payments']) === 1) {
            $p = $paid[0];
            $days = abs((new DateTimeImmutable($p['paid_date']))->diff(new DateTimeImmutable($r['paid_date']))->days);
            if ((int)$p['account_id'] === $r['account_id'] && (int)$p['amount'] === $r['amount'] && $days <= 3) {
                $linked = $this->rows("SELECT id FROM import_records WHERE payment_id=? AND status='applied' AND source_key<>? FOR UPDATE", [$p['id'], $r['source_key']]);
                if (!$linked) {
                    $d['action'] = $days === 0 ? 'link' : 'correct_date';
                    $d['reason'] = $days === 0 ? '既存支払いへ紐付け（追加なし）' : '一意一致した既存支払いの日付を銀行明細日へ補正'; return $d;
                }
            }
        }
        $d['reason'] = '既存支払いと口座・金額・日付・件数を一意に照合できません。原明細と登録内容を確認してください';
        return $d;
    }
    private function apply(int $user, array $d): void {
        if ($d['action'] === 'skip') return;
        $r = $d['entry']; $payment = null;
        if ($d['action'] !== 'hold') {
            if ($d['action'] === 'insert') {
                $this->run("INSERT INTO payments (monthly_fixed_cost_id,account_id,amount,paid_date,status) VALUES (?,?,?,?,'paid')", [$r['monthly_fixed_cost_id'],$r['account_id'],$r['amount'],$r['paid_date']]);
                $payment = (int)$this->db->lastInsertId();
            } else {
                $payment = (int)$d['payments'][0]['id'];
                if ($d['action'] === 'correct_date') $this->run('UPDATE payments SET paid_date=? WHERE id=?', [$r['paid_date'],$payment]);
            }
            $sum = $this->rows("SELECT SUM(amount) AS amount, MAX(paid_date) AS paid_date FROM payments WHERE monthly_fixed_cost_id=? AND status='paid'", [$r['monthly_fixed_cost_id']])[0];
            $this->run('UPDATE monthly_fixed_costs SET actual_amount=?,paid_date=? WHERE id=?', [$sum['amount'],$sum['paid_date'],$r['monthly_fixed_cost_id']]);
            $check = $this->rows('SELECT * FROM payments WHERE id=?', [$payment])[0];
            $monthly = $this->rows('SELECT actual_amount,paid_date FROM monthly_fixed_costs WHERE id=?', [$r['monthly_fixed_cost_id']])[0];
            if ((int)$check['amount'] !== $r['amount'] || $check['paid_date'] !== $r['paid_date'] || (int)$check['account_id'] !== $r['account_id'] || (int)$monthly['actual_amount'] !== (int)$sum['amount'] || $monthly['paid_date'] !== $sum['paid_date']) throw new RuntimeException('反映後の照合に失敗しました');
        }
        $status = $d['action'] === 'hold' ? 'held' : 'applied';
        // Do not recursively embed previous decision snapshots.
        $decision = $d; unset($decision['record']);
        $json = self::json($decision);
        if ($d['record']) {
            $id = (int)$d['record']['id'];
            if ($d['record']['decision_json'] === $json && $d['record']['status'] === $status) return;
            $this->run('UPDATE import_records SET status=?,reason=?,decision_json=?,payment_id=? WHERE id=?', [$status,$d['reason'],$json,$payment,$id]);
        } else {
            $this->run('INSERT INTO import_records (user_id,source_key,raw_json,status,reason,decision_json,payment_id) VALUES (?,?,?,?,?,?,?)', [$user,$r['source_key'],self::json($r),$status,$d['reason'],$json,$payment]);
            $id = (int)$this->db->lastInsertId();
        }
        $this->run('INSERT INTO import_events (record_id,action,before_json,after_json) VALUES (?,?,?,?)', [$id,$d['action'],self::json(['record' => $d['record'], 'target' => $d['target'], 'payments' => $d['payments']]),self::json(['status' => $status,'payment_id' => $payment,'decision' => $decision, 'payment_after' => $payment ? $this->rows('SELECT * FROM payments WHERE id=?', [$payment])[0] : null, 'monthly_after' => $payment ? $this->rows('SELECT * FROM monthly_fixed_costs WHERE id=?', [$r['monthly_fixed_cost_id']])[0] : null])]);
    }
}
