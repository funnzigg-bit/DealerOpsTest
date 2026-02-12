import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, Car, AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";

interface DealerHealth {
  id: string;
  name: string;
  city: string | null;
  status: string;
  created_at: string;
  userCount: number;
  vehicleCount: number;
  openComplaints: number;
  recentLogins: number;
  churnRisk: "low" | "medium" | "high";
}

function useDealerHealth() {
  return useQuery({
    queryKey: ["admin-dealer-health"],
    queryFn: async () => {
      const { data: dealers, error } = await supabase
        .from("dealers")
        .select("id, name, city, status, created_at")
        .order("name");
      if (error) throw error;

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const healthData: DealerHealth[] = await Promise.all(
        (dealers || []).map(async (dealer) => {
          const [users, vehicles, complaints, logins] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id),
            supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("status", "in_stock"),
            supabase.from("complaints").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).in("status", ["open", "under_investigation"]),
            supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("dealer_id", dealer.id).eq("action_type", "login").gte("created_at", thirtyDaysAgo),
          ]);

          const userCount = users.count ?? 0;
          const recentLogins = logins.count ?? 0;
          const loginsPerUser = userCount > 0 ? recentLogins / userCount : 0;

          let churnRisk: "low" | "medium" | "high" = "low";
          if (loginsPerUser < 2) churnRisk = "high";
          else if (loginsPerUser < 5) churnRisk = "medium";

          return {
            ...dealer,
            userCount,
            vehicleCount: vehicles.count ?? 0,
            openComplaints: complaints.count ?? 0,
            recentLogins,
            churnRisk,
          };
        })
      );

      return healthData;
    },
  });
}

const riskBadge: Record<string, string> = {
  low: "bg-success/10 text-success border-success/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function SuperAdminHealth() {
  const { data: dealers, isLoading } = useDealerHealth();

  const totalDealers = dealers?.length ?? 0;
  const highRisk = dealers?.filter(d => d.churnRisk === "high").length ?? 0;
  const totalUsers = dealers?.reduce((sum, d) => sum + d.userCount, 0) ?? 0;
  const totalVehicles = dealers?.reduce((sum, d) => sum + d.vehicleCount, 0) ?? 0;

  const summaryCards = [
    { label: "Total Dealers", value: totalDealers, icon: Building2 },
    { label: "Total Users", value: totalUsers, icon: Users },
    { label: "Total Stock", value: totalVehicles, icon: Car },
    { label: "High Churn Risk", value: highRisk, icon: AlertTriangle },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dealer Health Dashboard</h1>
        <p className="text-sm text-muted-foreground">At-a-glance KPIs across all dealerships</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl border border-border/50 bg-card/50"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <card.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}</div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Dealer</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-3">Users</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-3">Stock</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Open Complaints</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Logins (30d)</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-3">Churn Risk</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {dealers?.map((d) => (
                <tr key={d.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <p className="text-sm font-medium">{d.name}</p>
                    {d.city && <p className="text-xs text-muted-foreground">{d.city}</p>}
                  </td>
                  <td className="p-3 text-center text-sm">{d.userCount}</td>
                  <td className="p-3 text-center text-sm">{d.vehicleCount}</td>
                  <td className="p-3 text-center text-sm hidden md:table-cell">
                    {d.openComplaints > 0 ? (
                      <span className="text-destructive font-medium">{d.openComplaints}</span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                    )}
                  </td>
                  <td className="p-3 text-center text-sm hidden md:table-cell">
                    {d.recentLogins}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${riskBadge[d.churnRisk]}`}>
                      {d.churnRisk}
                    </span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      d.status === "active" ? "bg-success/10 text-success border-success/20" :
                      d.status === "suspended" ? "bg-destructive/10 text-destructive border-destructive/20" :
                      "bg-warning/10 text-warning border-warning/20"
                    }`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
