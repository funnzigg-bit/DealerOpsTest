import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ToggleLeft, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

const AVAILABLE_FEATURES = [
  { key: "cra_shield", label: "CRA Shield", description: "Consumer Rights Act assessment tool" },
  { key: "review_booster", label: "Review Booster", description: "Automated review request emails" },
  { key: "compliance_centre", label: "Compliance Centre", description: "GDPR and compliance management" },
  { key: "vehicle_checks", label: "Vehicle Checks", description: "HPI / MOT history lookups" },
  { key: "courtesy_cars", label: "Courtesy Cars", description: "Courtesy car fleet management" },
  { key: "warranties", label: "Warranties", description: "Warranty tracking module" },
  { key: "handovers", label: "Handovers", description: "Digital handover packs" },
  { key: "invoices", label: "Invoices", description: "Sales invoice generation" },
  { key: "staff_kpis", label: "Staff KPIs", description: "Performance tracking dashboards" },
];

export default function SuperAdminFeatureFlags() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDealer, setSelectedDealer] = useState<string>("");

  const { data: dealers } = useQuery({
    queryKey: ["admin-dealers-for-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("dealers").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: flags } = useQuery({
    queryKey: ["admin-feature-flags", selectedDealer],
    queryFn: async () => {
      if (!selectedDealer) return [];
      const { data, error } = await supabase
        .from("dealer_feature_flags")
        .select("*")
        .eq("dealer_id", selectedDealer);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDealer,
  });

  const toggleFlag = useMutation({
    mutationFn: async ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
      const existing = flags?.find(f => f.feature_key === featureKey);
      if (existing) {
        const { error } = await supabase
          .from("dealer_feature_flags")
          .update({ enabled, updated_at: new Date().toISOString(), updated_by_user_id: user?.id })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dealer_feature_flags")
          .insert({
            dealer_id: selectedDealer,
            feature_key: featureKey,
            enabled,
            updated_by_user_id: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags", selectedDealer] });
      toast.success("Feature flag updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getFlagState = (key: string) => {
    const flag = flags?.find(f => f.feature_key === key);
    return flag ? flag.enabled : true; // Default to enabled
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">Toggle modules per dealer</p>
      </div>

      <div className="mb-6 max-w-sm">
        <Select value={selectedDealer} onValueChange={setSelectedDealer}>
          <SelectTrigger>
            <SelectValue placeholder="Select a dealer..." />
          </SelectTrigger>
          <SelectContent>
            {dealers?.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedDealer ? (
        <div className="text-center py-20 rounded-xl border border-border/50 bg-card/50">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select a dealer to manage features</p>
        </div>
      ) : (
        <div className="space-y-3">
          {AVAILABLE_FEATURES.map(feature => {
            const enabled = getFlagState(feature.key);
            return (
              <div key={feature.key} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/10" : "bg-muted"}`}>
                    <ToggleLeft className={`h-4 w-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => toggleFlag.mutate({ featureKey: feature.key, enabled: checked })}
                />
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
