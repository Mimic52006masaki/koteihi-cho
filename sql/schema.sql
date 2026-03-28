CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  google_id VARCHAR(255) NULL,

  salary INT DEFAULT 0,
  safety_margin INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  type ENUM('asset','payment') DEFAULT 'asset',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE fixed_costs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,

  name VARCHAR(100) NOT NULL,
  default_amount INT NOT NULL,
  default_account_id BIGINT NULL,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE monthly_cycles (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,

  cycle_date DATE NOT NULL,
  status ENUM('open','closed') DEFAULT 'open',
  is_closed BOOLEAN DEFAULT FALSE,

  salary INT DEFAULT 0,
  salary_account_id BIGINT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (salary_account_id) REFERENCES accounts(id) ON DELETE SET NULL,

  UNIQUE (user_id, cycle_date)
);

CREATE TABLE monthly_fixed_costs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  monthly_cycle_id BIGINT NOT NULL,
  fixed_cost_id BIGINT NOT NULL,

  amount INT NOT NULL,
  actual_amount INT NULL,
  paid_date DATE NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (monthly_cycle_id)
    REFERENCES monthly_cycles(id)
    ON DELETE CASCADE,

  FOREIGN KEY (fixed_cost_id)
    REFERENCES fixed_costs(id)
    ON DELETE CASCADE,

  UNIQUE (monthly_cycle_id, fixed_cost_id)
);

CREATE TABLE payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,

  monthly_fixed_cost_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,

  amount INT NOT NULL,
  paid_date DATE NOT NULL,
  status ENUM('paid','unpaid','skipped') DEFAULT 'paid',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (monthly_fixed_cost_id)
    REFERENCES monthly_fixed_costs(id)
    ON DELETE CASCADE,

  FOREIGN KEY (account_id)
    REFERENCES accounts(id)
    ON DELETE RESTRICT
);

CREATE TABLE account_histories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  change_amount INT NOT NULL,
  balance_after INT NOT NULL,
  reason VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE salary_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  monthly_cycle_id BIGINT NOT NULL,
  amount INT NOT NULL,
  received_at DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (monthly_cycle_id) REFERENCES monthly_cycles(id) ON DELETE CASCADE
);
