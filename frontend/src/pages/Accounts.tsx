import React, { useState } from "react";
import AmountInput from "../components/AmountInput";
import toast from "react-hot-toast";
import type { Account } from "../types";
import ConfirmModal from "../components/ConfirmModal";
import { useAccounts } from "../hooks/useAccounts";

type AccountType = "asset" | "payment";

export const Accounts: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AccountType>("asset");
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
      setFormType(account.type);
      setFormBalance(account.balance);
    } else {
      setEditingAccount(null);
      setFormName("");
      setFormType("asset");
      setFormBalance(0);
    }
    setModalOpen(true);
  };

  const handleSave = () => {
    const payload = { name: formName, type: formType, balance: formBalance };
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

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">口座管理</h1>

      <button
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={() => openModal()}
      >
        新規口座作成
      </button>

      {isLoading ? (
        <p>読み込み中...</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">口座名</th>
              <th className="border px-2 py-1">タイプ</th>
              <th className="border px-2 py-1">残高</th>
              <th className="border px-2 py-1">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td className="border px-2 py-1">{acc.id}</td>
                <td className="border px-2 py-1">{acc.name}</td>
                <td className="border px-2 py-1">{acc.type}</td>
                <td className="border px-2 py-1">¥{acc.balance.toLocaleString()}</td>
                <td className="border px-2 py-1">
                  <button
                    className="text-blue-500 mr-2"
                    onClick={() => openModal(acc)}
                  >
                    編集
                  </button>
                  <button
                    className="text-red-500"
                    onClick={() => setConfirmId(acc.id)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-96">
            <h2 className="text-lg font-bold mb-2">
              {editingAccount ? "口座編集" : "新規口座作成"}
            </h2>
            <div className="mb-2">
              <label className="block mb-1">口座名</label>
              <input
                type="text"
                className="border w-full px-2 py-1"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="mb-2">
              <label className="block mb-1">タイプ</label>
              <select
                className="border w-full px-2 py-1"
                value={formType}
                onChange={(e) => setFormType(e.target.value as AccountType)}
              >
                <option value="asset">資産口座</option>
                <option value="payment">支払口座</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1">残高</label>
              <AmountInput
                value={formBalance}
                onChange={setFormBalance}
                className="border w-full px-2 py-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setModalOpen(false)}
              >
                キャンセル
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                onClick={handleSave}
                disabled={wrappedSave.isPending}
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
