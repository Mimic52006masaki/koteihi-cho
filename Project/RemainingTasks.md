# 未実装タスク 作業フロー

> CLAUDE.md の未チェック項目のみ抽出。実装順を守ること。
> 最終更新: 2026-03-25

---

## 実行順サマリー

```
Phase 1残り → Phase 2残り → Phase 4残り → Phase 5 → Phase 6
```

Phase 1〜4 は互いに依存関係あり。Phase 5・6 は独立して進められる。

---

## Phase 1 残り（設計の土台）

### 1-3. client.ts に ApiResponse<T> 型を適用

**対象**: `frontend/src/api/client.ts`

- [x] `types/index.ts` の `ApiResponse<T>` を import
- [x] `api.get` / `api.post` の戻り値を `Promise<ApiResponse<T>>` に変更
- [x] 各 API ファイル（accounts.ts, monthly.ts 等）の呼び出し箇所で型を活用

**完了条件**: `client.ts` を通じた全 API 呼び出しで `any` が消える

---

### 1-7. 給与・安全余剰の設定を Dashboard へ移動

**背景**: 現状 `Settings.tsx` に salary / safety_margin フォームが残存。
Settings の責務は「口座タイプ・表示設定」のみにしたい。

- [x] `Dashboard.tsx` に給与額・安全余剰の設定フォームを追加（または専用モーダル）
- [x] `Settings.tsx` から salary / safety_margin のフォームを削除
- [x] `settings/update.php` から salary / safety_margin の更新を除外（または dashboard 専用APIを新設）

**完了条件**: Settings ページに金額設定が残らない

---

## Phase 2 残り（データ整合性）

### 2-3. transfer_histories テーブル廃止

**背景**: `transfer/execute.php` と `transfer/history.php` は既に `account_histories` を参照済み。
テーブルだけ残っている状態。

- [x] `sql/migrate_v2.sql` の `DROP TABLE IF EXISTS transfer_histories;` のコメントアウトを解除
- [x] 本番 DB でマイグレーションを実行（2026-03-28 完了）
- [x] `sql/schema.sql` から `transfer_histories` テーブル定義を削除

**完了条件**: `transfer_histories` テーブルが DB から消え、schema.sql にも存在しない

---

## Phase 4 残り（UX 改善）

### 4-4. 月次 closed 状態で編集 UI を非表示

**対象**: `frontend/src/pages/CurrentMonthly.tsx`

- [x] `monthly/current.php` のレスポンスに `status` フィールドが含まれていることを確認
- [x] `status === 'closed'` の場合、支払いフォーム（口座・金額・日付・確定ボタン）を非表示にする
- [x] 代わりに「この月は締め済みです」メッセージを表示

**完了条件**: 締め済み月では編集操作が不可能になる

---

### 4-6. 金額 Input 共通コンポーネント

**対象**: `frontend/src/components/AmountInput.tsx`（新規）

- [x] `AmountInput.tsx` を新規作成
  ```tsx
  // props: value: number, onChange: (v: number) => void, placeholder?: string
  // 0 の場合は空文字表示、フォーカス時に全選択
  ```
- [x] `Dashboard.tsx` の金額 input を置換
- [x] `FixedCosts.tsx` の金額 input を置換
- [x] `CurrentMonthly.tsx` の金額 input を置換
- [x] `Settings.tsx` の金額 input を置換（移動後も適用）
- [x] `Accounts.tsx` の金額 input を置換

**完了条件**: 金額入力の挙動が全ページで統一される。1-5 の「送信時の変換処理共通化」も同時に解消。

---

## Phase 5（アーキテクチャ強化）

※ Phase 1〜4 完了後に着手推奨。独立性が高いため並行作業も可。

### 5-2. カスタム hooks 分離

**対象**: `frontend/src/hooks/`（新規ディレクトリ）

- [x] `frontend/src/hooks/` ディレクトリを作成
- [x] `useAccounts.ts` を作成（accounts の useQuery / useMutation をまとめる）
- [x] `useFixedCosts.ts` を作成
- [x] `useMonthly.ts` を作成
- [x] 各ページから hooks に移行（ページコンポーネントは UI のみ）

**完了条件**: 各ページの useQuery / useMutation が hooks 経由になる

---

### 5-3. エラーハンドリング統一

**対象フロントエンド**: `frontend/src/api/client.ts`

- [x] Axios インターセプター（`response.interceptors.use`）を追加
  - 401 → 自動ログアウト + toast.error
  - 500 → toast.error("サーバーエラーが発生しました")
- [x] 各ページの `onError` で重複しているエラー処理を削減

**対象バックエンド**: 全 PHP ファイル

- [x] 未キャッチの例外を catch してJSON形式で返すようにする
  ```php
  set_exception_handler(function($e) {
      http_response_code(500);
      echo json_encode(['success' => false, 'error' => $e->getMessage()]);
  });
  ```
- [x] `app/middleware/` に共通の例外ハンドラーを追加して各 API から require

**完了条件**: 予期しないエラーが発生しても必ず JSON が返り、フロントでトーストが出る

---

### 5-4. 不要な再レンダリング防止

- [x] `TransferPlan.tsx` — ステップ切り替えで全体が再レンダリングされていないか確認。`memo` / `useCallback` を適用
- [x] `Sidebar.tsx` — ルート変更のたびに再レンダリングされていないか確認
- [x] コードレベル解析で対応箇所を特定し最適化を適用（2026-03-28）
  - `CurrentMonthly.tsx`: `CostCard` を `memo` コンポーネントに抽出、`handlePay`/`handleUnpay`/`handleLocalChange` を `useCallback` 化
  - `FixedCosts.tsx`: `handleAdd`/`handleUpdate`/`updateLocal` を `useCallback` 化
  - `Dashboard.tsx`: `handleSaveSalary` を `useCallback` 化

**完了条件**: 明らかに不要な再レンダリングが解消される

---

### 5-5. seed データ整備

**対象**: `sql/seed.sql`（新規）

- [x] `sql/seed.sql` を新規作成
  ```sql
  -- テスト用ユーザー（password_hash 済み）
  -- サンプル口座: asset×1, payment×2
  -- サンプル固定費: 5件（家賃・電気・水道・ネット・スマホ）
  -- サンプル月次データ: 直近2ヶ月分
  ```
- [x] `README.md` にセットアップ手順（schema.sql → migrate_v2.sql → seed.sql の順）を追記

**完了条件**: 新規環境でも `sql/` の3ファイルを順番に実行するだけで動作確認できる

---

### 5-6. CORS 設定の環境変数化

**対象**: `public/api/cors.php`, `app/config/database.php`

- [x] プロジェクトルートに `.env.example` を作成
  ```
  FRONTEND_ORIGIN=http://localhost:5173
  DB_HOST=localhost
  DB_NAME=koteihi_cho
  DB_USER=root
  DB_PASS=root
  ```
- [x] `.env` を `.gitignore` に追加
- [x] `cors.php` で `$_ENV['FRONTEND_ORIGIN']` を参照するよう変更
- [x] `database.php` で `.env` の DB 設定を参照するよう変更（`vlucas/phpdotenv` または手動 parse）

**完了条件**: ハードコードされた Origin・DB 接続情報が消える

---

## Phase 6（拡張・将来）

※ Phase 5 完了後。優先度は低い。

### 6-1. グラフ機能

- [x] `recharts` を `frontend/package.json` に追加
- [x] `History.tsx` に月別固定費推移グラフを追加（棒グラフ：予定・実績）
- [x] `AccountHistory.tsx` に口座残高推移グラフを追加（エリアチャート）

---

### 6-2. 分析機能

- [x] 月別レポートページを新規作成（`Analytics.tsx`：サマリーカード・前月比・月別推移折れ線グラフ）
- [x] 年次サマリー（年間合計・月平均）

---

### 6-3. Google 認証

- [x] `users` テーブルに `google_id VARCHAR(255) NULL` カラム追加（schema.sql + migrate_v2.sql）
- [x] `public/api/auth/google.php` を作成（Google tokeninfo API によるトークン検証）
- [x] `@react-oauth/google` を追加、`main.tsx` に `GoogleOAuthProvider` を設定
- [x] `Login.tsx` に Google ログインボタン追加
- [ ] `.env` に `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` を設定（Google Cloud Console で取得）※ユーザー作業
- [x] DB マイグレーション実行（2026-03-28 完了）

---

## Phase 7（給料日ToDo機能）

### 7-1. 給料日フローページ

- [x] `public/api/monthly/payday-status.php` 新規作成（給与受取・振替・支払い進捗をまとめて返す）
- [x] `frontend/src/api/salary.ts` に `fetchPaydayStatus` / `PaydayStatus` 型を追加
- [x] `frontend/src/pages/PaydayFlow.tsx` 新規作成（3ステップ進行UI）
  - Step1: 給与受取（実行ボタン、受取日入力）
  - Step2: 振替実行（実行ボタン、振替プランへのリンク）
  - Step3: 固定費支払い（進捗バー、支払い管理へのリンク）
- [x] `App.tsx` に `/payday` ルート追加
- [x] `Sidebar.tsx` に「給料日フロー」メニュー追加
- [x] `Dashboard.tsx` を整理し、「給料日フロー」ボタンを導線として追加

---

## Issue #29（テスト整備）

- [x] vitest + @testing-library/react + happy-dom をインストール
- [x] `vite.config.ts` に `test` 設定を追加（environment: 'happy-dom'）
- [x] `tsconfig.app.json` に `vitest/globals` 型追加
- [x] `src/__tests__/setup.ts` を作成（@testing-library/jest-dom を import）
- [x] `AmountInput.test.tsx` — value=0 で空文字表示、onChange 呼び出し、placeholder 表示など 5 テスト
- [x] `Analytics.test.tsx` — データなし・あり・年次サマリー表示の 3 テスト
- [x] `PaydayFlow.test.tsx` — 月次なし・全ステップ・完了バナー・給与未設定など 5 テスト
- [x] `monthly.test.ts` — fetchCurrentMonthly / fetchMonthlyHistory / payFixedCost の 4 テスト
- 計 **17 テスト全パス** (4 ファイル)

---

## 注意事項

- Phase 2-3（transfer_histories廃止）は本番 DB に影響するため、必ずバックアップ後に実行
- Phase 5-6 は CORS Origin のハードコード解消を先に行うこと（開発環境の接続が安定する）
- Phase 6 の実装前に Phase 5-3（エラーハンドリング統一）を完了させること
