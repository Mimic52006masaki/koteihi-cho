-- Additive migration. Back up and inspect current schema before production use.
CREATE TABLE import_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  source_key VARCHAR(191) COLLATE utf8mb4_bin NOT NULL,
  raw_json LONGTEXT NOT NULL,
  status ENUM('held','applied','ignored') NOT NULL,
  reason TEXT NOT NULL,
  decision_json LONGTEXT NOT NULL,
  payment_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY import_source (user_id, source_key),
  KEY import_status (user_id, status, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE import_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  record_id BIGINT NOT NULL,
  action VARCHAR(40) NOT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (record_id) REFERENCES import_records(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
