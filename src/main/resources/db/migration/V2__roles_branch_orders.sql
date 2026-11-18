-- MANUAL, ONE-TIME predeployment migration for MySQL 8 / TiDB.
-- Hibernate does not execute this file. Take a verified backup first.
-- DDL commits implicitly; run in a maintenance window and record each completed step.
-- Stop if this query returns rows; resolve unknown roles explicitly before continuing:
SELECT id, role FROM users WHERE REPLACE(UPPER(TRIM(role)), 'ROLE_', '')
  NOT IN ('ADMIN','OWNER','MANAGER','BRANCH','CASHIER','EMPLOYEE','POS');

-- Keep original role labels for audit/rollback without copying credentials.
CREATE TABLE IF NOT EXISTS chainpoint_role_migration_backup (
  user_id BIGINT PRIMARY KEY, legacy_role VARCHAR(30) NOT NULL,
  captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO chainpoint_role_migration_backup (user_id, legacy_role) SELECT id, role FROM users;

-- Expanding a native ENUM to VARCHAR preserves all values and allows canonical writes.
ALTER TABLE users MODIFY COLUMN role VARCHAR(30) NOT NULL;
UPDATE users SET role = CASE REPLACE(UPPER(TRIM(role)), 'ROLE_', '')
  WHEN 'ADMIN' THEN 'ROLE_OWNER' WHEN 'OWNER' THEN 'ROLE_OWNER'
  WHEN 'BRANCH' THEN 'ROLE_MANAGER' WHEN 'MANAGER' THEN 'ROLE_MANAGER'
  WHEN 'EMPLOYEE' THEN 'ROLE_CASHIER' WHEN 'POS' THEN 'ROLE_CASHIER'
  WHEN 'CASHIER' THEN 'ROLE_CASHIER' ELSE role END;

CREATE TABLE IF NOT EXISTS manager_branches (
  user_id BIGINT NOT NULL, branch_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, branch_id),
  CONSTRAINT fk_manager_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_manager_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);
INSERT IGNORE INTO manager_branches (user_id, branch_id)
  SELECT id, branch_id FROM users WHERE role = 'ROLE_MANAGER' AND branch_id IS NOT NULL;

-- Run each ALTER only if its column is absent. Existing installations may already
-- have additions from Hibernate ddl-auto=update; inspect INFORMATION_SCHEMA.COLUMNS.
ALTER TABLE branches ADD COLUMN auto_print BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN branch_id BIGINT NULL;
ALTER TABLE products ADD CONSTRAINT fk_product_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
ALTER TABLE bills ADD COLUMN request_key VARCHAR(64) NULL;
ALTER TABLE bills ADD CONSTRAINT uk_bill_request_key UNIQUE (request_key);
ALTER TABLE bills ADD COLUMN provider_reference VARCHAR(100) NULL;
ALTER TABLE bills ADD CONSTRAINT uk_bill_provider_reference UNIQUE (provider_reference);
ALTER TABLE bills ADD COLUMN order_note VARCHAR(500) NULL;
ALTER TABLE bills ADD COLUMN paid_at DATETIME(6) NULL;
ALTER TABLE bills ADD COLUMN cash_received DECIMAL(15,2) NULL;
ALTER TABLE bills ADD COLUMN blockchain_pending BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN redeem_tx_hash VARCHAR(66) NULL;
ALTER TABLE bill_details ADD COLUMN note VARCHAR(255) NULL;

-- Preserve legacy paid/refunded financial records, global products (NULL branch),
-- customer balances and primary branch assignments. Do not infer assignments from
-- branches.manager_name, replay historical bills, or automatically backfill chain work.
