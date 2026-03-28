import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "../api/settings";
import type { SettingsData } from "../api/settings";
import { fetchAccounts } from "../api/accounts";
import type { Account } from "../types";

export default function Settings() {
  const { data } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const bankBalance = Number(data?.bank_balance ?? 0);
  const safetyMargin = Number(data?.safety_margin ?? 0);
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* 口座サマリー */}
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <div className="font-semibold text-sm text-gray-700">口座残高サマリー</div>
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.type === "asset"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {a.type === "asset" ? "資産" : "支払"}
                </span>
                <span>{a.name}</span>
              </div>
              <span className="font-semibold">¥{Number(a.balance).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-2 flex justify-between text-sm font-bold">
          <span>合計</span>
          <span>¥{totalBalance.toLocaleString()}</span>
        </div>
        <Link to="/accounts" className="text-xs text-blue-500 hover:underline block">
          口座を管理する →
        </Link>
      </div>

      {/* 参照値 */}
      <div className="bg-white rounded-xl shadow p-5 space-y-3">
        <div className="font-semibold text-sm text-gray-700">現在の設定値（参照）</div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">口座残高合計（settings）</span>
          <span>¥{bankBalance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">安全余剰</span>
          <span>¥{safetyMargin.toLocaleString()}</span>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-2 text-sm text-blue-700">
        <div className="font-semibold">設定の変更方法</div>
        <ul className="space-y-1 list-disc list-inside text-blue-600">
          <li>
            <Link to="/dashboard" className="hover:underline">
              給与額・安全余剰 → Dashboard
            </Link>
          </li>
          <li>
            <Link to="/accounts" className="hover:underline">
              口座の残高・追加・削除 → 口座管理
            </Link>
          </li>
          <li>
            <Link to="/fixed-costs" className="hover:underline">
              固定費の追加・編集 → 固定費管理
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
