-- migrate_v3.sql
-- トランザクション型への移行（v2 → v3）
-- ⚠️ 実行前にバックアップを取ること

-- 1. fixed_costs に種別（入金/振替/支払い）と振替先口座を追加
ALTER TABLE fixed_costs
  ADD COLUMN type ENUM('deposit', 'transfer', 'payment') NOT NULL DEFAULT 'payment' AFTER name,
  ADD COLUMN to_account_id BIGINT NULL AFTER default_account_id,
  ADD CONSTRAINT fk_fixed_costs_to_account
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL;

-- 2. account_histories の type に 'deposit' を追加
--    (migrate_v2.sql で作成済みの場合のみ)
ALTER TABLE account_histories
  MODIFY COLUMN type ENUM('payment', 'transfer', 'salary', 'deposit') NOT NULL DEFAULT 'payment';

-- 3. monthly_cycles に締め日を追加
ALTER TABLE monthly_cycles
  ADD COLUMN close_date DATE NULL AFTER cycle_date;

-- 4. 臨時トランザクションテーブルを新設
CREATE TABLE IF NOT EXISTS spot_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  monthly_cycle_id BIGINT NOT NULL,
  type ENUM('deposit', 'transfer', 'payment') NOT NULL,
  account_id BIGINT NOT NULL,
  to_account_id BIGINT NULL,
  amount INT NOT NULL,
  memo VARCHAR(255),
  transaction_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (monthly_cycle_id) REFERENCES monthly_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);
