import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserDealerId } from "./useCustomers";

export function useReviewRequests(statusFilter?: string) {
  const { data: dealerId } = useUserDealerId();
  return useQuery({
    queryKey: ["review-requests", dealerId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("review_requests")
        .select("*, customers(first_name, last_name, email, phone), vehicles(vrm, make, model)")
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!dealerId,
  });
}

export function useCreateReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: Record<string, unknown>) => {
      const { data, error } = await supabase.from("review_requests").insert(d as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-requests"] }),
  });
}

export function useUpdateReviewRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: unknown }) => {
      const { data, error } = await supabase.from("review_requests").update(u as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-requests"] }),
  });
}
