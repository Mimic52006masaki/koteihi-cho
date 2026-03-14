import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type MonthData = {
  id: number;
  start_date: string;
  end_date: string;
  total_planned: number;
  total_actual: number;
};

export default function History() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonths();
  }, []);

  const loadMonths = async () => {
    try {
      const res = await api.get("/monthly/history.php");
      setMonths(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">履歴</h1>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-4 text-left">月</th>
              <th className="p-4 text-left">合計</th>
              <th className="p-4"></th>
            </tr>
          </thead>

          <tbody>
            {months.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-4">
                  {m.start_date} ~ {m.end_date}
                  </td>

                <td className="p-4">
                  ¥{Number(m.total_actual).toLocaleString()}
                  </td>

                  <td className="p-4 text-right">
                    <Link
                    to={`/monthly/${m.id}`}
                    className="text-blue-500 hover:underline"
                    >
                    詳細
                    </Link>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
