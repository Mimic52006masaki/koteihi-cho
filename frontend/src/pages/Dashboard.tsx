import { useEffect, useState } from "react";
import { api } from "../api/client";

function Dashboard() {

  type Stats = {
    salary: number;
    bank_balance: number;
    safety_margin: number;
    monthly_total: number;
    last_month_total: number;
    remaining_budget: number;
    fixed_count: number;
    recent: {
      id: number;
      name: string;
      actual_amount: number;
    }[];
  };

  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/dashboard/stats.php");
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateMonthly = async () => {
    try {
      await api.post("/monthly/generate.php");
      alert("月次を生成しました");
      loadDashboard();
    } catch (err:any) {
      alert(err.response?.data?.error ?? "月次生成に失敗しました");
    }
  };

  const closeMonthly = async () => {
    try {
      await api.post("/monthly/close.php");
      alert("月次を締めました");
      loadDashboard();
    } catch (err:any) {
      alert(err.response?.data?.error ?? "締め失敗")
    }
  };
  
  
  if (!stats) {
    return <div className="p-6">Loading...</div>;
  }

  const diff = stats.monthly_total - stats.last_month_total;
  const usableMoney = stats.bank_balance - stats.safety_margin;
  const usageRate =
      usableMoney > 0
        ? Math.min(100, Math.round((stats.monthly_total / usableMoney) * 100))
        : 0;
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {stats.remaining_budget < 0 && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          ⚠️ 固定費が口座残高を超えています
        </div>
      )}

      <div className="">
        <button
        onClick={generateMonthly}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          月次開始
        </button>

        <button
        onClick={closeMonthly}
        className="bg-green-500 text-white px-4 py-2 rounded ml-2"
        >
          月次締め
        </button>
      </div>
      <div className="bg-white p-6 rounded-xl shadow space-y-3">
        <div className="text-ms text-gray-500">固定費使用率</div>

        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
          className="bg-blue-500 h-4 rounded-full transition-all duration-500"
          style={{width: `${usageRate}%`}}
          ></div>
        </div>
        <div className="text-sm text-gray-600">{usageRate}%</div>
      </div>
      {/* cards */}
      <div className="grid grid-cols-3 gap-6">

        {/* 給与 */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500">給与</div>
          <div className="text-2xl font-bold">
            ¥{stats.salary.toLocaleString()}
          </div>
        </div>

        {/* 口座残高 */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500">口座残高</div>
          <div className="text-2xl font-bold">
            ¥{stats.bank_balance.toLocaleString()}
          </div>
        </div>

        {/* 固定費 */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500">今月固定費</div>
          <div className="text-2xl font-bold">
            ¥{stats.monthly_total.toLocaleString()}
          </div>
        </div>

        {/* 安全余剰 */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500">安全余剰</div>
          <div className="text-2xl font-bold">
            ¥{stats.safety_margin.toLocaleString()}
          </div>
        </div>

        {/* 残り予算 */}
        <div className="bg-white p-6 rounded-xl shadow">

          <div className="text-sm text-gray-500">
            残り予算
          </div>

          <div 
          className={`text-2xl font-bold ${
            stats.remaining_budget < 0
            ? "text-red-500"
            : "text-green-600"
          }`}
          >
            ¥{stats.remaining_budget.toLocaleString()}
          </div>
        </div>


        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500">先月との差</div>
          <div
            className={`text-2xl font-bold ${
              diff > 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            ¥{diff.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="text-sm text-gray-500">固定費数</div>
          <div className="text-2xl font-bold">{stats.fixed_count}</div>
        </div>
      </div>

      {/* recent peyments */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b font-semibold">最近の支払い</div>

        <div className="divide-y">
          {stats.recent.length === 0 && (
            <div className="p-4 text-gray-500">
              支払いデータがありません
            </div>
          )}
          {stats.recent.map((item) => (
            <div key={item.id} className="flex justify-between p-4">
              <div>{item.name}</div>
              <div>¥{Number(item.actual_amount ?? 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
