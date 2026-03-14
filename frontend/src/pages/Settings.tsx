import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Settings() {
  const [salary, setSalary] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [safetyMargin, setSafetyMargin] = useState(0);

  const loadSettings = async () => {
    const res = await api.get("/settings/get.php");

    setSalary(res.data.data.salary ?? "");
    setBankBalance(res.data.data.bank_balance ?? "");
    setSafetyMargin(res.data.data.safety_margin ?? "");
  };

  const saveSettings = async () => {
    await api.post("/settings/update.php", {
      salary: salary,
      bank_balance: bankBalance,
      safety_margin: safetyMargin,
    });
    alert("保存しました");
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold mb-4">設定</h1>
      <div className="mb-4">
        <label>給与額</label>

        <input
          type="number"
          className="border p-2 w-full"
          value={salary}
          onChange={(e) => setSalary(Number(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label>口座残高</label>

        <input
          type="number"
          className="border p-2 w-full"
          value={bankBalance}
          onChange={(e) => setBankBalance(Number(e.target.value))}
        />
      </div>

      <div className="mb-4">
        <label>固定費予算(安全余剰)</label>

        <input
          type="number"
          className="border p-2 w-full"
          value={safetyMargin}
          onChange={(e) => setSafetyMargin(Number(e.target.value))}
        />
      </div>

      <button
        onClick={saveSettings}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        保存
      </button>
    </div>
  );
}
