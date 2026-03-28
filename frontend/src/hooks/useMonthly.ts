import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCurrentMonthly,
  generateMonthly,
  closeMonthly,
  updateCycle,
  payFixedCost,
  unpayFixedCost,
} from "../api/monthly";

export function useMonthly() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["current-monthly"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
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

  const updateCycleMutation = useMutation({
    mutationFn: updateCycle,
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

  return {
    monthly: query.data,
    isSuccess: query.isSuccess,
    generateMutation,
    closeMutation,
    updateCycleMutation,
    payMutation,
    unpayMutation,
  };
}
