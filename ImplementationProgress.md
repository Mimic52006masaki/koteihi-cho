# 固定費帳 v2 改善計画（フェーズ1〜6）

固定費帳アプリのUX改善およびデータモデル改善を行う。

## 目的

- 金額入力時のUX改善
- 支払日を記録できるようにする
- 支払確定操作のUX追加
- Dashboardに口座残高は**全口座合計**で表示
- 毎月の給与額を管理し、変動履歴を分析可能にする
- 固定費一覧は支払日順に表示
- 給与振込口座を紐づけ、給与入力時に口座残高に加算
- 給与振込口座からの振替額計算と実績入力
- 資産内移動と資産減少を明確に区別し、口座タイプ設定で管理
- 給与振込日に行う振込・振替作業のToDo形式整理
- 固定費発生日も入力して支払確定管理

---

# ステータス

- ⬜ 未着手
- 🟨 作業中
- ✅ 完了

---

# 資産移動カテゴリ定義

### 資産内移動（カテゴリA）
- 自分の口座間で移動するだけ、総資産は変わらない
- 例：メイン口座 → 変動費口座
- 振替元減、振替先加算

### 資産減少（カテゴリB）
- 自分の資産から外部支払や現金引き出し、PayPayチャージなど
- 総資産も減少
- 例：現金で小遣い、PayPayチャージ、ローン返済
- 振替元減、総資産も減少
- 設定画面で口座タイプを選択可能（資産口座 / 支払口座）

---

# フェーズ1：金額Input UX改善

**目的**  
- 金額入力時に「01000」のようにならず、直感的に入力できるUXにする

**対象**
- CurrentMonthly, FixedCosts, Settings

**タスク（1行単位）**
- ✅ 金額 input state 管理、onFocusで0を空に、onChangeで数字更新

---

# フェーズ2：支払日機能追加

**目的**  
- 入力日と実際の支払日を分けて保存
- 固定費一覧を支払日順に表示

**DB変更**
- monthly_fixed_costs に `paid_date DATE NULL` 追加

**API変更**
- /api/monthly/update-actual.php に paid_date パラメータ追加
- current APIレスポンスに paid_date 反映、支払日順に返す

**フロント修正**
- 支払日 input追加、state管理、onChangeで更新
- 固定費一覧を支払日順にソート表示

**タスク（1行単位）**
- ✅ 支払日機能の追加と支払日順ソートの実装

---

# フェーズ3：固定費確定UX

**目的**  
- 支払確定操作の追加、支払済み表示

**フロント修正**
- 確定ボタン追加、支払済み表示（✔ 支払済み・支払日・金額）

**API**
- /api/monthly/update-actual.php に actual_amount + paid_date + account_id 送信

**タスク（1行単位）**
- ✅ 支払確定UX（支払日・金額入力）と未払いに戻す機能の実装

---

# フェーズ4：口座管理・紐付け

**目的**  
- 各固定費の支払いを口座と紐づけ、支払い履歴を管理
- Dashboardでは全口座合計表示
- 固定費一覧・履歴で個別口座確認可能

**DB変更**
- accounts テーブル追加（id, name, balance, type, created_at, updated_at）
- monthly_fixed_costs から actual_amount, paid_date, account_id を削除
- payments テーブル追加（id, monthly_fixed_cost_id, account_id, amount, paid_date, created_at）

**API**
- /api/accounts/index.php で口座一覧取得
- /api/monthly/pay.php (仮) で payments テーブルに支払い記録を追加/更新
- current APIレスポンスに payments テーブルから取得した account_id / account_name および支払い履歴を含める

**フロント修正**
- 固定費行に口座選択ドロップダウン、state管理、支払い履歴表示
- Dashboardで全口座残高表示、必要に応じて口座別残高確認UI

**タスク（1行単位）**
- ✅ 口座管理と支払い履歴機能の実装

---

# フェーズ5：給与額管理＋口座紐付け

**目的**  
- 給与額を月次データに紐づけ管理
- 過去給与額の変動分析
- 給与振込口座を指定、口座残高に加算

**DB変更**
- monthly_cycles に salary INT NULL
- monthly_cycles に salary_account_id INT NULL（給与振込口座）

**API変更**
- /api/monthly/update-cycle.php に salary + salary_account_id パラメータ
- 給与更新時に salary_account_id で accounts.balance に加算
- current APIレスポンスに salary_account_id / salary_account_name

**フロント修正**
- 給与額 input、振込口座選択 dropdown、state管理
- 入力/変更時に monthly_cycles 保存、過去月給与・口座参照
- Dashboardで当月給与額・振込口座表示、履歴UI（オプション）

---

# フェーズ6：給与振込口座からの振替・実績入力

**目的**  
- 給与口座から固定費口座への振替額計算
- 実際の引き落とし額を入力、口座残高を更新
- 資産内移動と資産減少を区別
- 給与振込日作業フローをToDo形式で整理
- 固定費発生日を入力して支払確定管理

**給与振込日ToDo例**
1. 給与振込口座残高確認
2. 固定費振替予定額計算・確認
3. 振替実行：給与口座減算、固定費口座／現金加算
4. 固定費確定・発生日入力・支払済みチェック
5. 振替後口座残高確認・必要に応じ手動調整
6. Dashboard更新（振替予定・実績比較、各口座残高）

**DB変更**
- accounts.balance（既存）利用、給与口座・各固定費口座残高更新

**API変更**
- /api/monthly/transfer-calculation.php で振替予定額計算
- /api/monthly/transfer-actual.php で実際振替額入力 → accounts.balance 更新
- current APIレスポンスに振替予定額・実績額・口座残高

**フロント修正**
- 振替予定額表示、実際引き落とし額入力、給与口座と固定費口座残高更新
- state管理（transfer_planned / transfer_actual）
- Dashboardで給与口座残高・固定費口座残高、振替予定/実績比較UI

---

# 実装優先順位（推奨）

1. ✅ フェーズ1：Input UX改善
2. ✅ フェーズ2：支払日追加（支払日順表示）
3. ✅ フェーズ3：支払確定UX＋固定費発生日入力
4. ✅ フェーズ4：口座管理・紐付け
5. ⬜ フェーズ5：給与額管理＋口座紐付け
6. ⬜ フェーズ6：給与振込口座からの振替・実績入力

---

# 影響範囲

**Backend**
- monthly_fixed_costs
- accounts（新規）
- monthly_cycles（salary + salary_account_id 追加）
- update-actual.php
- update-cycle.php
- transfer-calculation.php
- transfer-actual.php
- current.php

**Frontend**
- CurrentMonthly.tsx
- FixedCosts.tsx
- Settings.tsx
- Dashboard.tsx（全口座合計・給与額・振替表示）

---

# 将来の拡張候補

- 支払予定日管理（Netflix毎月25日）
- 固定費カレンダー
- 月別固定費推移グラフ
- 口座別残高グラフ・警告表示
- 給与額変動グラフ・予算分析
- 振替自動計算やアラート通知
- 資産内移動/資産減少の柔軟設定
- 給与振込日専用ページUI改善・操作ログ機能