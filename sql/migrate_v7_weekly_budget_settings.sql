-- 週の買い物予算の変更履歴。effective_from（月曜）以降の週にその金額を使う。行がない週は10,000円。
CREATE TABLE IF NOT EXISTS weekly_budget_settings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  effective_from DATE NOT NULL,
  budget_amount INT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY weekly_budget_user_from (user_id, effective_from),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
