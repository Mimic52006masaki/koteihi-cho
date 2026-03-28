import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchPaydayStatus, executeSalary } from "../api/salary";
import { executeTransfer } from "../api/transfer";

type StepStatus = "done" | "pending" | "disabled";

function StepCard({
  number,
  title,
  status,
  children,
}: {
  number: number;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-xl shadow p-6 border-l-4 ${
        status === "done"
          ? "border-green-500"
          : status === "pending"
          ? "border-blue-500"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            status === "done"
              ? "bg-green-500 text-white"
              : status === "pending"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-400"
          }`}
        >
          {status === "done" ? "✓" : number}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {status === "done" && (
          <span className="ml-auto text-sm text-green-600 font-semibold">完了</span>
        )}
        {status === "pending" && (
          <span className="ml-auto text-sm text-blue-600 font-semibold">未実行</span>
        )}
        {status === "disabled" && (
          <span className="ml-auto text-sm text-gray-400">前のステップを完了してください</span>
        )}
      </div>
      <div className={status === "disabled" ? "opacity-40 pointer-events-none" : ""}>{children}</div>
    </div>
  );
}

export default function PaydayFlow() {
  const queryClient = useQueryClient();
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));

  const { data: status, isLoading } = useQuery({
    queryKey: ["payday-status"],
    queryFn: fetchPaydayStatus,
  });

  const salaryMutation = useMutation({
    mutationFn: executeSalary,
    onSuccess: () => {
      toast.success("給与受取を記録しました");
      queryClient.invalidateQueries({ queryKey: ["payday-status"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "給与受取に失敗しました"),
  });

  const transferMutation = useMutation({
    mutationFn: executeTransfer,
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`振替完了: ¥${res.data?.total_transfer.toLocaleString()}`);
        queryClient.invalidateQueries({ queryKey: ["payday-status"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      } else {
        toast.error(res.error ?? "振替に失敗しました");
      }
    },
    onError: () => toast.error("振替に失敗しました"),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;

  if (!status) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">給料日フロー</h1>
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          <p className="mb-4">進行中の月次がありません</p>
          <Link to="/dashboard" className="text-blue-500 hover:underline text-sm">
            Dashboard で月次を開始してください
          </Link>
        </div>
      </div>
    );
  }

  const step1Status: StepStatus = status.salary_received ? "done" : "pending";
  const step2Status: StepStatus = status.transfer_done
    ? "done"
    : !status.salary_received
    ? "disabled"
    : "pending";
  const step3Status: StepStatus =
    status.paid_count === status.total_count && status.total_count > 0
      ? "done"
      : !status.transfer_done
      ? "disabled"
      : "pending";

  const allDone =
    status.salary_received &&
    status.transfer_done &&
    status.paid_count === status.total_count &&
    status.total_count > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">給料日フロー</h1>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {status.cycle_date}
        </span>
      </div>

      {allDone && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl font-semibold text-center">
          今月の給料日フローが全て完了しました！
        </div>
      )}

      {/* Step 1: 給与受取 */}
      <StepCard number={1} title="給与受取" status={step1Status}>
        {status.salary_received ? (
          <div className="text-gray-500 text-sm">
            <span className="font-semibold text-gray-800">
              ¥{status.salary.toLocaleString()}
            </span>{" "}
            を{status.salary_account_name ?? "口座"}で受取済み
          </div>
        ) : (
          <div className="space-y-3">
            {status.salary === 0 || !status.salary_account_id ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                給与額・振込口座が未設定です。
                <Link to="/dashboard" className="ml-1 underline">
                  Dashboardで設定してください
                </Link>
              </div>
            ) : (
              <>
                <div className="text-sm text-gray-500">
                  金額:{" "}
                  <span className="font-semibold text-gray-800">
                    ¥{status.salary.toLocaleString()}
                  </span>{" "}
                  → {status.salary_account_name}
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">受取日</label>
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="border rounded px-3 py-1.5 text-sm"
                  />
                </div>
                <button
                  onClick={() =>
                    salaryMutation.mutate({
                      monthly_cycle_id: status.cycle_id,
                      amount: status.salary,
                      received_at: receivedAt,
                    })
                  }
                  disabled={salaryMutation.isPending}
                  className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {salaryMutation.isPending ? "処理中..." : "給与受取を実行"}
                </button>
              </>
            )}
          </div>
        )}
      </StepCard>

      {/* Step 2: 振替実行 */}
      <StepCard number={2} title="振替実行" status={step2Status}>
        {status.transfer_done ? (
          <div className="text-gray-500 text-sm">各支払口座への振替が完了しています</div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              給与口座から各支払口座へ固定費分を振替します。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => transferMutation.mutate()}
                disabled={transferMutation.isPending || step2Status === "disabled"}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                {transferMutation.isPending ? "処理中..." : "振替を実行"}
              </button>
              <Link
                to="/transfer"
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-50"
              >
                振替プランを確認
              </Link>
            </div>
          </div>
        )}
      </StepCard>

      {/* Step 3: 固定費支払い */}
      <StepCard number={3} title="固定費支払い" status={step3Status}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width:
                    status.total_count > 0
                      ? `${Math.round((status.paid_count / status.total_count) * 100)}%`
                      : "0%",
                }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              {status.paid_count} / {status.total_count} 件
            </span>
          </div>
          {status.paid_count < status.total_count && (
            <Link
              to="/monthly/current"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded text-sm"
            >
              支払い管理へ
            </Link>
          )}
        </div>
      </StepCard>
    </div>
  );
}
