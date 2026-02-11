import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserDealerId } from "@/hooks/useCustomers";

export default function BillingPage() {
  const { data: dealerId } = useUserDealerId();

  const { data: dealer } = useQuery({
    queryKey: ["dealer-billing", dealerId],
    queryFn: async () => {
      if (!dealerId) return null;
      const { data, error } = await supabase.from("dealers").select("name, status, plan_id").eq("id", dealerId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!dealerId,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing & Plan</h1>
        <p className="text-sm text-muted-foreground">Manage your subscription and payments</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Current Plan */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Current Plan</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {dealer?.status === "active" ? "Active" : dealer?.status || "—"}
            </span>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">{dealer?.plan_id || "Professional"}</p>
              <p className="text-xs text-muted-foreground">{dealer?.name}</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Plan Features</h3>
          <div className="space-y-2">
            {[
              "Unlimited customers & vehicles",
              "Lead pipeline & CRM",
              "Invoice generation",
              "Warranty tracking",
              "Aftersales management",
              "Courtesy car tracking",
              "DVLA & MOT vehicle checks",
              "Reports & KPIs",
              "Audit logging",
              "Document storage",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Payment Method</h3>
          <div className="flex flex-col items-center justify-center h-24">
            <CreditCard className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Payment integration coming soon</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
