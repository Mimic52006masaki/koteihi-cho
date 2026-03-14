import { useEffect, useState } from "react"
import { api } from "../api/client"

export default function CurrentMonthly() {
    const [costs, setCosts] = useState<any[]>([]);

    const load = async () => {
        const res = await api.get("/monthly/current.php");
        setCosts(res.data.data);
    };

    const updateActual = async (id: number, value: number) => {
        try {
            await api.post("/monthly/update-actual.php",{
                id,
                actual_amount: value,
            });
            
            setCosts((prev) =>
                prev.map((c) =>
                    c.id === id ? {...c, actual_amount: value} : c
                )
            );
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        load();
    }, []);

  return (
    <div>
        <h1 className="text-2xl font-bold mb-4">今月の固定費</h1>

        <table className="table-auto w-full">
            <thead>
                <tr>
                    <th>項目</th>
                    <th>予定</th>
                    <th>実績</th>
                </tr>
            </thead>

            <tbody>
                {costs.map((c) => (
                    <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.amount}</td>
                        <td>
                            <input 
                            type="number" 
                            value={c.actual_amount ?? ""} 
                            onChange={(e) => updateActual(c.id, Number(e.target.value))} 
                            className="border px-2 py-1 w-24" 
                            />
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  )
}
