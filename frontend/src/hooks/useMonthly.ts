import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentMonthly,
  generateMonthly,
  closeMonthly,
  payFixedCost,
  unpayFixedCost,
  deleteMonthly,
} from "../api/monthly";

export function useMonthly() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["current-monthly"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  const query = useQuery({
    queryKey: ["current-monthly"],
    queryFn: fetchCurrentMonthly,
  });

  const generateMutation = useMutation({
    mutationFn: generateMonthly,
    onSuccess: invalidateAll,
  });

  const closeMutation = useMutation({
    mutationFn: closeMonthly,
    onSuccess: invalidateAll,
  });

  const payMutation = useMutation({
    mutationFn: payFixedCost,
    onSuccess: invalidateAll,
  });

  const unpayMutation = useMutation({
    mutationFn: unpayFixedCost,
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: deleteMonthly,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-history"] });
    },
  });

  return {
    monthly: query.data,
    isSuccess: query.isSuccess,
    generateMutation,
    closeMutation,
    payMutation,
    unpayMutation,
    deleteMutation,
  };
}
