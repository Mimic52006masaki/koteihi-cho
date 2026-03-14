CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  salary INT DEFAULT 0,
  safety_margin INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE monthly_cycles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  status ENUM('open','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE fixed_costs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  default_amount INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE monthly_fixed_costs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  monthly_cycle_id BIGINT NOT NULL,
  fixed_cost_id BIGINT NOT NULL,
  amount INT NOT NULL,
  actual_amount INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monthly_cycle_id) REFERENCES monthly_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY (fixed_cost_id) REFERENCES fixed_costs(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_id ON monthly_cycles(user_id);
CREATE INDEX idx_cycle_id ON monthly_fixed_costs(monthly_cycle_id);
CREATE INDEX idx_fixed_user ON fixed_costs(user_id);
CREATE INDEX idx_fixed_user_created ON fixed_costs(user_id, created_at);