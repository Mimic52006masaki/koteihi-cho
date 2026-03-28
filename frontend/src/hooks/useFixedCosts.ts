import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { FixedCost } from "../types";
import { fetchFixedCosts, createFixedCost, updateFixedCost, toggleFixedCost } from "../api/fixedCosts";

export function useFixedCosts() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fixed-costs"] });

  const query = useQuery<FixedCost[]>({
    queryKey: ["fixed-costs"],
    queryFn: fetchFixedCosts,
  });

  const addMutation = useMutation({
    mutationFn: createFixedCost,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: updateFixedCost,
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleFixedCost,
    onSuccess: invalidate,
  });

  return {
    costs: query.data ?? [],
    isLoading: query.isLoading,
    addMutation,
    updateMutation,
    toggleMutation,
  };
}
