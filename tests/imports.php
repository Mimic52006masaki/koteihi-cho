<?php
require __DIR__ . '/../app/services/ImportService.php';
if (getenv('DB_NAME') !== 'koteihi_test') throw new RuntimeException('専用koteihi_test DBでのみ実行できます');
$db = require __DIR__ . '/../app/config/database.php';
if ($db->query('SHOW TABLES')->fetch()) throw new RuntimeException('空のテストDBが必要です');
$db->exec(file_get_contents(__DIR__ . '/../sql/schema.sql'));
$db->exec("ALTER TABLE fixed_costs ADD type ENUM('payment','deposit','transfer') DEFAULT 'payment'");
$db->exec(file_get_contents(__DIR__ . '/../sql/migrate_v4_imports.sql'));
$db->exec("INSERT INTO users(id,name,email) VALUES(1,'Test','test@example.invalid'),(2,'Other','other@example.invalid')");
$db->exec("INSERT INTO accounts(id,user_id,name,balance) VALUES(1,1,'Bank',100000),(2,1,'Other Bank',20000),(3,2,'Foreign',1)");
$db->exec("INSERT INTO monthly_cycles(id,user_id,cycle_date) VALUES(1,1,'2026-09-01'),(2,2,'2026-09-01')");
for ($id=1; $id<=12; $id++) {
    $db->exec("INSERT INTO fixed_costs(id,user_id,name,default_amount,default_account_id) VALUES($id,1,'Cost $id',1000,1)");
    $db->exec("INSERT INTO monthly_fixed_costs(id,monthly_cycle_id,fixed_cost_id,amount) VALUES($id,1,$id,1000)");
}
$service = new ImportService($db); $checks=0;
function ok($condition, $message) { global $checks; if (!$condition) throw new RuntimeException($message); $checks++; }
function scalar($sql) { global $db; return $db->query($sql)->fetchColumn(); }
function row($id, $key=null) { return ['source_key'=>$key ?? "mf-$id",'account_id'=>1,'amount'=>1000,'paid_date'=>'2026-09-20','description'=>'Bank Cost '.$id,'monthly_fixed_cost_id'=>$id,'match_evidence'=>'Bank name and account checked']; }
function commitRows($rows) { global $service; $p=$service->process(1,$rows); return $service->process(1,$rows,$p['preview_hash']); }
function fails($fn,$message) { try { $fn(); } catch (Throwable $e) { ok(true,$message); return; } ok(false,$message); }
$p=$service->process(1,[row(1)]);
ok($p['items'][0]['action']==='insert','preview insert');
ok((int)scalar('SELECT COUNT(*) FROM payments')===0,'preview must not write');
$service->process(1,[row(1)],$p['preview_hash']);
ok((int)scalar('SELECT actual_amount FROM monthly_fixed_costs WHERE id=1')===1000,'aggregate');
commitRows([row(1)]);
ok((int)scalar('SELECT COUNT(*) FROM payments')===1,'idempotent');
ok((int)scalar('SELECT COUNT(*) FROM import_events')===1,'no duplicate audit');
ok((int)scalar('SELECT balance FROM accounts WHERE id=1')===100000,'balance unchanged');
ok((int)scalar('SELECT COUNT(*) FROM account_histories')===0,'no balance history');
$r=row(1); $r['amount']=1001; fails(fn()=>commitRows([$r]),'immutable raw');
$r=row(2); $r['account_id']=3; fails(fn()=>commitRows([$r]),'tenant account ownership');
$db->exec("INSERT INTO payments(monthly_fixed_cost_id,account_id,amount,paid_date) VALUES(2,1,1000,'2026-09-18')");
$p=commitRows([row(2)]); ok($p['items'][0]['action']==='correct_date','unique date correction');
ok(scalar('SELECT paid_date FROM payments WHERE monthly_fixed_cost_id=2')==='2026-09-20','corrected date');
$db->exec("INSERT INTO payments(monthly_fixed_cost_id,account_id,amount,paid_date) VALUES(3,1,999,'2026-09-20')");
$p=commitRows([row(3),row(4)]);
ok($p['items'][0]['action']==='hold' && $p['items'][1]['action']==='insert','item-level hold');
ok((int)scalar("SELECT COUNT(*) FROM import_records WHERE status='held'")===1,'held retained');
commitRows([row(3)]); ok((int)scalar("SELECT COUNT(*) FROM import_events e JOIN import_records r ON e.record_id=r.id WHERE r.source_key='mf-3'")===1,'unchanged hold no new audit');
$r=row(5); $r['account_id']=2; ok(commitRows([$r])['items'][0]['action']==='hold','account mismatch');
$r=row(6); $r['match_evidence']=''; ok(commitRows([$r])['items'][0]['action']==='hold','missing evidence');
ok(commitRows([row(6)])['items'][0]['action']==='insert','held item re-evaluation');
$p=$service->process(1,[row(7)]); $db->exec('UPDATE monthly_fixed_costs SET amount=1100 WHERE id=7');
fails(fn()=>$service->process(1,[row(7)],$p['preview_hash']),'stale preview');
ok((int)scalar('SELECT COUNT(*) FROM payments WHERE monthly_fixed_cost_id=7')===0,'stale no writes');
$p=commitRows([row(8,'pair-a'),row(8,'pair-b')]); ok($p['items'][0]['action']==='hold' && $p['items'][1]['action']==='hold','multiple bank candidates');
$r=row(9);$r['paid_date']='2026-02-30';fails(fn()=>commitRows([$r]),'invalid date');
$r=row(9);$r['amount']='1000';fails(fn()=>commitRows([$r]),'strict amount');
$db->exec("UPDATE fixed_costs SET type='deposit' WHERE id=9");ok(commitRows([row(9)])['items'][0]['action']==='hold','exclude deposit');
$db->exec("INSERT INTO payments(monthly_fixed_cost_id,account_id,amount,paid_date) VALUES(10,1,1000,'2026-09-20')");
ok(commitRows([row(10)])['items'][0]['action']==='link','existing exact payment');
ok(commitRows([row(10,'another-key')])['items'][0]['action']==='hold','do not link two statements to one payment');
// Force a late failure: the earlier inserted payment must roll back as well.
$db->exec("CREATE TRIGGER fail_import BEFORE INSERT ON import_records FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test failure'");
fails(fn()=>commitRows([row(11)]),'transaction failure');
ok((int)scalar('SELECT COUNT(*) FROM payments WHERE monthly_fixed_cost_id=11')===0,'transaction rollback');
$db->exec('DROP TRIGGER fail_import');
ok(commitRows([row(8,'pair-a')])['items'][0]['action']==='hold','held candidates remain ambiguous across batches');
$r=row(12); $r['monthly_fixed_cost_id']=999;
ok(commitRows([$r])['items'][0]['action']==='hold','missing target');
$p=$service->process(1,[row(11)]); $service->process(1,[row(11)],$p['preview_hash']);
fails(fn()=>$service->process(1,[row(11)],$p['preview_hash']),'second commit using old preview fails');
ok((int)scalar('SELECT COUNT(*) FROM payments WHERE monthly_fixed_cost_id=11')===1,'no duplicate after competing commits');
$db->exec("UPDATE monthly_cycles SET status='closed' WHERE id=1");ok(commitRows([row(12)])['items'][0]['action']==='hold','closed cycle');
echo "$checks integration assertions passed\n";
