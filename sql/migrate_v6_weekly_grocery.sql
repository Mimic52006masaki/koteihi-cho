-- アークスの週次集計。口座残高や固定費明細には影響しない。
CREATE TABLE IF NOT EXISTS weekly_grocery_budgets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  week_start DATE NOT NULL,
  budget_amount INT NOT NULL DEFAULT 10000,
  spent_amount INT NOT NULL,
  unconfirmed_count INT NOT NULL DEFAULT 0,
  as_of_date DATE NOT NULL,
  source VARCHAR(30) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY weekly_grocery_user_week (user_id, week_start),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
