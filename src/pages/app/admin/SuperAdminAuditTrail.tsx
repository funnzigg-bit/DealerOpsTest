import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";

export default function SuperAdminAuditTrail() {
  const [search, setSearch] = useState("");
  const [dealerFilter, setDealerFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: dealers } = useQuery({
    queryKey: ["admin-audit-dealers"],
    queryFn: async () => {
      const { data } = await supabase.from("dealers").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", dealerFilter, actionFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*, dealers:dealer_id(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (dealerFilter !== "all") {
        query = query.eq("dealer_id", dealerFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }
      if (search) {
        query = query.or(`action_type.ilike.%${search}%,entity_type.ilike.%${search}%,summary.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: actionTypes } = useQuery({
    queryKey: ["admin-audit-action-types"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_logs").select("action_type").limit(500);
      const unique = [...new Set(data?.map(d => d.action_type))].sort();
      return unique;
    },
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cross-Dealer Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Search audit logs across all dealerships</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={dealerFilter} onValueChange={setDealerFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Dealers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dealers</SelectItem>
            {dealers?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes?.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />)}</div>
      ) : !logs?.length ? (
        <div className="text-center py-20 rounded-xl border border-border/50 bg-card/50">
          <ScrollText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No audit logs found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Time</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Dealer</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Action</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Entity</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "d MMM HH:mm")}
                  </td>
                  <td className="p-3 text-sm">
                    {(log as any).dealers?.name || "—"}
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-medium text-primary">{log.action_type}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                    {log.entity_type || "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell max-w-xs truncate">
                    {log.summary || "—"}
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
