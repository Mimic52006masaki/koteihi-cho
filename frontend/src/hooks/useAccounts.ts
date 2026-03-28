import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Account } from "../types";
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from "../api/accounts";

export function useAccounts() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });

  const query = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Omit<Account, "id"> & { id?: number }) =>
      payload.id ? updateAccount(payload as Account) : createAccount(payload as Omit<Account, "id">),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: invalidate,
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    saveMutation,
    deleteMutation,
  };
}
