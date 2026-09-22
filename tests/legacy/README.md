# 廃止画面のテスト履歴

PaydayFlow.test.tsx.txt は、現行リポジトリに存在しない `pages/PaydayFlow` と `api/salary` を参照していた旧テスト。現行AppにもPaydayFlowのルートはなく、テスト収集とTypeScriptビルドを阻害していたため、2026-09-22に履歴として退避した。現行機能のテストをskipしたものではない。給与機能を再設計するときの参考として保持する。
