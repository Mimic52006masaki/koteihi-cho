import React, { useState } from "react";
import AmountInput from "../components/AmountInput";
import toast from "react-hot-toast";
import type { Account } from "../types";
import ConfirmModal from "../components/ConfirmModal";
import { useAccounts } from "../hooks/useAccounts";

export const Accounts: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formName, setFormName] = useState("");
  const [formBalance, setFormBalance] = useState<number>(0);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { accounts, isLoading, saveMutation, deleteMutation } = useAccounts();

  const wrappedSave = {
    ...saveMutation,
    mutate: (payload: Parameters<typeof saveMutation.mutate>[0]) =>
      saveMutation.mutate(payload, {
        onSuccess: () => { toast.success("保存しました"); setModalOpen(false); },
        onError: () => toast.error("保存に失敗しました"),
      }),
  };

  const wrappedDelete = {
    ...deleteMutation,
    mutate: (id: number) =>
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("削除しました"),
        onError: (e: Error) => toast.error(e.message ?? "削除に失敗しました"),
      }),
  };

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormName(account.name);
      setFormBalance(account.balance);
    } else {
      setEditingAccount(null);
      setFormName("");
      setFormBalance(0);
    }
    setModalOpen(true);
  };

  const handleSave = () => {
    const payload = { name: formName, type: "asset" as const, balance: formBalance };
    if (editingAccount) {
      wrappedSave.mutate({ ...payload, id: editingAccount.id });
    } else {
      wrappedSave.mutate(payload);
    }
  };

  const handleDeleteConfirm = () => {
    if (confirmId !== null) {
      wrappedDelete.mutate(confirmId);
      setConfirmId(null);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">口座管理</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
        >
          + 新規口座
        </button>
      </div>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-4 text-left">口座名</th>
              <th className="p-4 text-right">残高</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400 text-sm">
                  口座が登録されていません
                </td>
              </tr>
            )}
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-t">
                <td className="p-4 font-medium">{acc.name}</td>
                <td className="p-4 text-right font-semibold">
                  ¥{acc.balance.toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => openModal(acc)}
                      className="text-gray-500 text-sm hover:text-gray-700"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setConfirmId(acc.id)}
                      className="text-red-400 text-sm hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-lg">
              {editingAccount ? "口座編集" : "新規口座作成"}
            </h2>

            <div>
              <label className="text-sm font-medium">口座名</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border px-3 py-2 rounded w-full mt-1"
                placeholder="例：生活費口座"
              />
            </div>

            <div>
              <label className="text-sm font-medium">残高</label>
              <AmountInput
                value={formBalance}
                onChange={setFormBalance}
                className="border px-3 py-2 rounded w-full mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded border text-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={wrappedSave.isPending}
                className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmId !== null}
        message="この口座を削除しますか？取引履歴がある場合は削除できません。"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
};
