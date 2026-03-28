-- migrate_v2.sql
-- 既存DBへのマイグレーション（v1 → v2）
-- ⚠️ 実行前にバックアップを取ること

-- fixed_costs: default_account_id 追加（既に存在する場合はスキップ）
-- ALTER TABLE fixed_costs
--   ADD COLUMN default_account_id BIGINT NULL AFTER default_amount,
--   ADD CONSTRAINT fk_fixed_costs_account
--     FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- monthly_cycles: 各カラムを個別に追加（重複エラーが出た行をコメントアウト）
ALTER TABLE monthly_cycles ADD COLUMN status ENUM('open','closed') DEFAULT 'open';
ALTER TABLE monthly_cycles ADD COLUMN salary INT DEFAULT 0;
ALTER TABLE monthly_cycles ADD COLUMN salary_account_id BIGINT NULL;
ALTER TABLE monthly_cycles ADD COLUMN salary_received BOOLEAN DEFAULT FALSE;
ALTER TABLE monthly_cycles ADD CONSTRAINT fk_monthly_cycles_salary_account
  FOREIGN KEY (salary_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- monthly_fixed_costs: 各カラムを個別に追加（重複エラーが出た行をコメントアウト）
ALTER TABLE monthly_fixed_costs ADD COLUMN actual_amount INT NULL;
ALTER TABLE monthly_fixed_costs ADD COLUMN paid_date DATE NULL;

-- payments: status 追加（重複エラーが出た行をコメントアウト）
ALTER TABLE payments ADD COLUMN status ENUM('paid','unpaid','skipped') DEFAULT 'paid';

-- account_histories テーブル作成（type カラム・reference_id カラム含む）
CREATE TABLE IF NOT EXISTS account_histories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  change_amount INT NOT NULL,
  balance_after INT NOT NULL,
  type ENUM('payment','transfer','salary') NOT NULL DEFAULT 'payment',
  reference_id BIGINT NULL COMMENT 'monthly_cycle_id (transfer/salary) or payment_id (payment)',
  reason VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- salary_logs テーブル作成
CREATE TABLE IF NOT EXISTS salary_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  monthly_cycle_id BIGINT NOT NULL,
  amount INT NOT NULL,
  received_at DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (monthly_cycle_id) REFERENCES monthly_cycles(id) ON DELETE CASCADE
);

-- transfer_histories 廃止（データがある場合はバックアップ後に実行）
DROP TABLE IF EXISTS transfer_histories;

-- users: Google認証対応
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL AFTER password;
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;
