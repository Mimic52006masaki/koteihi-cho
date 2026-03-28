-- seed.sql
-- テスト用初期データ
-- ⚠️ 実行順: schema.sql → migrate_v2.sql → seed.sql
-- ⚠️ 既存データがある場合は事前に truncate するか新規DBで実行すること

-- -----------------------------------------------
-- ユーザー
-- パスワード: "password"（BCryptハッシュ）
-- -----------------------------------------------
INSERT INTO users (id, name, email, password, salary, safety_margin) VALUES
(1, 'テストユーザー', 'test@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 300000, 10000);

-- -----------------------------------------------
-- 口座
--   id=1: 給与口座（asset）← 給与の振込先
--   id=2: 光熱費口座（payment）
--   id=3: 通信費口座（payment）
-- -----------------------------------------------
INSERT INTO accounts (id, user_id, name, balance, type) VALUES
(1, 1, '給与口座',   300000, 'asset'),
(2, 1, '光熱費口座',  20000, 'payment'),
(3, 1, '通信費口座',  10000, 'payment');

-- -----------------------------------------------
-- 固定費マスタ
-- -----------------------------------------------
INSERT INTO fixed_costs (id, user_id, name, default_amount, default_account_id, is_active) VALUES
(1, 1, '家賃',         80000, NULL, TRUE),
(2, 1, '電気代',        8000, 2,    TRUE),
(3, 1, '水道代',        3000, 2,    TRUE),
(4, 1, 'インターネット', 5500, 3,    TRUE),
(5, 1, 'スマホ',        7000, 3,    TRUE);

-- -----------------------------------------------
-- 月次サイクル（2026年3月・オープン中）
-- salary_account_id=1（給与口座）、給与受取済み
-- -----------------------------------------------
INSERT INTO monthly_cycles (id, user_id, cycle_date, status, is_closed, salary, salary_account_id, salary_received) VALUES
(1, 1, '2026-03-01', 'open', FALSE, 300000, 1, TRUE);

-- -----------------------------------------------
-- 月次固定費（2026年3月分）
-- -----------------------------------------------
INSERT INTO monthly_fixed_costs (id, monthly_cycle_id, fixed_cost_id, amount) VALUES
(1, 1, 1, 80000),
(2, 1, 2,  8000),
(3, 1, 3,  3000),
(4, 1, 4,  5500),
(5, 1, 5,  7000);

-- -----------------------------------------------
-- 給与受取ログ
-- -----------------------------------------------
INSERT INTO salary_logs (user_id, monthly_cycle_id, amount, received_at) VALUES
(1, 1, 300000, '2026-03-25');

-- -----------------------------------------------
-- 口座履歴（給与受取）
-- -----------------------------------------------
INSERT INTO account_histories (account_id, user_id, change_amount, balance_after, type, reason) VALUES
(1, 1, 300000, 300000, 'salary', '給与受取 2026-03-25');
