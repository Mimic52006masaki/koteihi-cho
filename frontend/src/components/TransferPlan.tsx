import { useState, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchTransferPlan, executeTransfer } from "../api/transfer";
import type { TransferPlanData } from "../api/transfer";

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "振替確認",
  2: "振替実行",
  3: "完了",
};

const TransferPlan: React.FC = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [totalTransferred, setTotalTransferred] = useState<number>(0);

  const { data: plan, isLoading: planLoading } = useQuery<TransferPlanData>({
    queryKey: ["transfer-plan"],
    queryFn: fetchTransferPlan,
  });

  const transferMutation = useMutation({
    mutationFn: executeTransfer,
    onSuccess: (data) => {
      const total = data?.data?.total_transfer ?? 0;
      setTotalTransferred(total);
      queryClient.invalidateQueries({ queryKey: ["transfer-plan"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["payday-status"] });
      setStep(3);
    },
    onError: (e: Error) => toast.error(e.message ?? "振替エラー"),
  });

  const handleTransferExecute = useCallback(() => {
    transferMutation.mutate();
    setStep(2);
  }, [transferMutation]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">振替プラン</h1>

      {/* ステップインジケーター */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step === s
                  ? "bg-blue-500 text-white"
                  : step > s
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
                }`}
            >
              {step > s ? "✓" : s}
            </div>
            <span
              className={`text-sm ${
                step === s ? "font-semibold text-blue-600" : "text-gray-400"
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {s < 3 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: 振替計画確認 */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <h2 className="font-bold text-lg">振替計画</h2>
          <p className="text-sm text-gray-500">
            給与口座から各支払口座に振り分けます
          </p>

          {planLoading ? (
            <div className="text-gray-400">計算中...</div>
          ) : plan ? (
            <>
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-3 space-y-1">
                <div className="flex justify-between">
                  <span>給与口座残高</span>
                  <span>¥{plan.salary_balance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>振替合計</span>
                  <span>¥{plan.total_transfer.toLocaleString()}</span>
                </div>
                <div
                  className={`flex justify-between font-bold ${
                    plan.balance_after_transfer < 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  <span>振替後残高</span>
                  <span>¥{plan.balance_after_transfer.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                {plan.items.map((item) => (
                  <div
                    key={item.account_id}
                    className="flex justify-between items-center p-3 border rounded"
                  >
                    <div>
                      <div className="font-semibold">{item.account_name}</div>
                      <div className="text-xs text-gray-400">
                        現在残高: ¥{item.current_balance.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        +¥{item.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {plan.balance_after_transfer < 0 && (
                <div className="bg-red-50 border border-red-300 text-red-600 p-3 rounded text-sm">
                  ⚠️ 振替後の給与口座残高が不足しています
                </div>
              )}

              <button
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                onClick={() => setStep(2)}
                disabled={plan.items.length === 0}
              >
                この内容で振替を実行する →
              </button>
            </>
          ) : (
            <p className="text-gray-400">振替対象がありません</p>
          )}
        </div>
      )}

      {/* Step 2: 振替実行 */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <h2 className="font-bold text-lg">振替実行中</h2>

          {transferMutation.isPending ? (
            <div className="text-center py-8 text-gray-500">振替処理中...</div>
          ) : (
            <>
              <p className="text-gray-600">
                合計 ¥{plan?.total_transfer.toLocaleString() ?? 0} を振替します。
              </p>
              <div className="flex gap-3">
                <button
                  className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
                  onClick={() => setStep(1)}
                >
                  戻る
                </button>
                <button
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
                  onClick={handleTransferExecute}
                  disabled={transferMutation.isPending}
                >
                  振替実行
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: 完了 */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-xl shadow space-y-4 text-center">
          <div className="text-4xl">✅</div>
          <h2 className="font-bold text-lg">振替完了</h2>
          <p className="text-gray-600">
            ¥{totalTransferred.toLocaleString()} を各口座に分配しました
          </p>
          <button
            className="text-blue-500 text-sm hover:underline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["transfer-plan"] });
              setStep(1);
            }}
          >
            振替プランを再確認する
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(TransferPlan);
