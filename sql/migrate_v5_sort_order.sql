-- Additive migration. 既存テーブルの変更・削除はしない。
-- MariaDB 10.5 のため IF NOT EXISTS が使える（再実行しても安全）。

ALTER TABLE fixed_costs ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- 既存行は id 順を初期の並びとする。全て 0 のままだと並べ替えの基準が作れない。
UPDATE fixed_costs SET sort_order = id WHERE sort_order = 0;

CREATE INDEX IF NOT EXISTS fixed_costs_user_sort ON fixed_costs (user_id, sort_order);
