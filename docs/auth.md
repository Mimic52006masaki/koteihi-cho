# ログインとセッション

## 初期化はここ1か所

`app/bootstrap/http.php` が .env 読み込み・例外ハンドラ・セッション・CORS の唯一の初期化経路。
`public/api/cors.php`（認証系）と `app/middleware/cors.php`（通常API）はどちらもここへ委譲する。
**ここ以外で `session_start()` / `session_set_cookie_params()` を呼ばないこと。** 経路ごとにCookie属性が
変わる状態に戻るため。二重呼び出しは定数ガードで無害化している。

セッションCookieは `HttpOnly` / `SameSite=Lax` 固定、`Secure` はHTTPSで接続されたときだけ付く
（ローカルのhttp開発を壊さないため）。

例外の詳細は `error_log` にだけ出し、クライアントには汎用メッセージを返す。以前はDBの例外メッセージが
そのままレスポンスに載っていた。

## 環境変数

| 変数 | 既定 | 用途 |
|---|---|---|
| `GOOGLE_CLIENT_ID` | なし | IDトークンの `aud` 検証に使う。**未設定ならGoogleログインを拒否**する |
| `VITE_GOOGLE_CLIENT_ID` | なし | フロント用。未設定ならログイン画面にGoogleボタンを出さない |
| `ALLOWED_GOOGLE_EMAILS` | 空 | ログインを許可するGoogleアカウント（カンマ区切り）。**空なら拒否** |
| `ALLOW_REGISTRATION` | `false` | `/api/auth/register.php` を開けるかどうか |

本番はプロジェクト直下の `.env` ではなく、公開ディレクトリの `.htaccess` の `SetEnv` で与える。

## Googleログインの判定順

1. `GOOGLE_CLIENT_ID` と `ALLOWED_GOOGLE_EMAILS` が設定されているか（どちらか欠けたら503）
2. `oauth2.googleapis.com/tokeninfo` でIDトークンを検証
3. `aud` がクライアントIDと一致するか
4. `iss` が `accounts.google.com` か
5. `exp` が未来か
6. `email_verified` が真か
7. メールが `ALLOWED_GOOGLE_EMAILS` に含まれるか
8. `google_id` または `email` で既存ユーザーが見つかるか

**新規ユーザーは作らない。** 以前は見つからなければINSERTしていたため、Googleアカウントさえあれば
誰でもアカウントが増える状態だった。単一利用者のアプリなので自己登録の経路自体を持たせない。

許可済みのGoogleアカウントに紐づくユーザーが無い場合は、サーバー内から直接紐付ける：

```sql
UPDATE users SET google_id = NULL WHERE id = 1;  -- 付け替えるとき
UPDATE users SET email = 'you@gmail.com' WHERE id = 1;
```

`email` が一致すれば初回ログイン時に `google_id` が自動で埋まる。

## 残っている課題

- ログイン試行のレート制限が無い。登録を閉じ、Googleを許可リスト制にしたことで総当たりの的は
  パスワードログイン1経路に絞られたが、制限そのものは未実装。
