import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserDealerId } from "@/hooks/useCustomers";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { format, subMonths, subWeeks, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfYear, endOfYear, subYears, eachMonthOfInterval, eachWeekOfInterval, eachDayOfInterval } from "date-fns";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type RangeKey = "7d" | "30d" | "3m" | "6m" | "12m" | "ytd";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "3m", label: "Last 3 Months" },
  { key: "6m", label: "Last 6 Months" },
  { key: "12m", label: "Last 12 Months" },
  { key: "ytd", label: "Year to Date" },
];

function getRangeDates(key: RangeKey): { start: Date; end: Date; buckets: { start: string; end: string; label: string }[]; granularity: "day" | "week" | "month" } {
  const now = new Date();
  let start: Date, end: Date = now, granularity: "day" | "week" | "month" = "month";

  switch (key) {
    case "7d":
      start = subDays(now, 6);
      granularity = "day";
      break;
    case "30d":
      start = subDays(now, 29);
      granularity = "day";
      break;
    case "3m":
      start = subMonths(now, 3);
      granularity = "week";
      break;
    case "6m":
      start = subMonths(now, 6);
      granularity = "month";
      break;
    case "ytd":
      start = startOfYear(now);
      granularity = "month";
      break;
    case "12m":
    default:
      start = subMonths(now, 11);
      granularity = "month";
      break;
  }

  let buckets: { start: string; end: string; label: string }[] = [];

  if (granularity === "month") {
    const months = eachMonthOfInterval({ start, end });
    buckets = months.map(d => ({
      start: startOfMonth(d).toISOString(),
      end: endOfMonth(d).toISOString(),
      label: format(d, "MMM yy"),
    }));
  } else if (granularity === "week") {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    buckets = weeks.map(d => ({
      start: startOfWeek(d, { weekStartsOn: 1 }).toISOString(),
      end: endOfWeek(d, { weekStartsOn: 1 }).toISOString(),
      label: format(d, "d MMM"),
    }));
  } else {
    const days = eachDayOfInterval({ start, end });
    buckets = days.map(d => ({
      start: startOfDay(d).toISOString(),
      end: endOfDay(d).toISOString(),
      label: format(d, "d MMM"),
    }));
  }

  return { start, end, buckets, granularity };
}

function useReportsData(rangeKey: RangeKey) {
  const { data: dealerId } = useUserDealerId();
  const { start, end, buckets } = getRangeDates(rangeKey);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  return useQuery({
    queryKey: ["reports-data", dealerId, rangeKey],
    queryFn: async () => {
      // Vehicle status breakdown
      const { data: vehicles } = await supabase.from("vehicles").select("status").eq("is_deleted", false);
      const statusCounts: Record<string, number> = {};
      vehicles?.forEach((v) => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });
      const vehicleStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

      // Lead sources
      const { data: leads } = await supabase.from("leads").select("source").gte("created_at", startIso).lte("created_at", endIso);
      const sourceCounts: Record<string, number> = {};
      leads?.forEach((l) => { sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1; });
      const leadSourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

      // Lead funnel
      const { data: allLeads } = await supabase.from("leads").select("status").gte("created_at", startIso).lte("created_at", endIso);
      const funnelCounts: Record<string, number> = {};
      allLeads?.forEach((l) => { funnelCounts[l.status] = (funnelCounts[l.status] || 0) + 1; });
      const funnelOrder = ["new", "contacted", "viewing", "negotiating", "won", "lost"];
      const leadFunnelData = funnelOrder.map((s) => ({ name: s, count: funnelCounts[s] || 0 }));

      // Monthly/bucketed sales (vehicles sold)
      const bucketedSales = await Promise.all(
        buckets.map(async (m) => {
          const { count } = await supabase
            .from("vehicles").select("id", { count: "exact", head: true })
            .eq("status", "sold").gte("updated_at", m.start).lte("updated_at", m.end);
          return { month: m.label, sold: count ?? 0 };
        })
      );

      // Monthly revenue
      const bucketedRevenue = await Promise.all(
        buckets.map(async (m) => {
          const { data: invoices } = await supabase
            .from("invoices").select("total").gte("created_at", m.start).lte("created_at", m.end);
          const total = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) ?? 0;
          return { month: m.label, revenue: Math.round(total) };
        })
      );

      // Complaints count in range
      const { count: complaintsCount } = await supabase
        .from("complaints").select("id", { count: "exact", head: true })
        .gte("created_at", startIso).lte("created_at", endIso);

      // Aftersales cases count in range
      const { count: aftersalesCount } = await supabase
        .from("aftersales_cases").select("id", { count: "exact", head: true })
        .gte("created_at", startIso).lte("created_at", endIso);

      // Courtesy car loans in range
      const { count: courtesyCount } = await supabase
        .from("courtesy_loans").select("id", { count: "exact", head: true })
        .gte("created_at", startIso).lte("created_at", endIso);

      // CRA cases in range
      const { count: craCount } = await supabase
        .from("cra_cases").select("id", { count: "exact", head: true })
        .gte("created_at", startIso).lte("created_at", endIso);

      // Total invoices in range
      const { data: rangeInvoices } = await supabase
        .from("invoices").select("total").gte("created_at", startIso).lte("created_at", endIso);
      const totalRevenue = rangeInvoices?.reduce((s, i) => s + (i.total || 0), 0) ?? 0;

      const summaryStats = [
        { label: "Revenue", value: `£${Math.round(totalRevenue).toLocaleString()}` },
        { label: "Vehicles Sold", value: String(bucketedSales.reduce((s, b) => s + b.sold, 0)) },
        { label: "New Leads", value: String(leads?.length ?? 0) },
        { label: "Aftersales Cases", value: String(aftersalesCount ?? 0) },
        { label: "Complaints", value: String(complaintsCount ?? 0) },
        { label: "Courtesy Loans", value: String(courtesyCount ?? 0) },
        { label: "CRA Cases", value: String(craCount ?? 0) },
      ];

      return { vehicleStatusData, leadSourceData, leadFunnelData, bucketedSales, bucketedRevenue, summaryStats };
    },
    enabled: !!dealerId,
  });
}

export default function ReportsPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>("6m");
  const { data, isLoading } = useReportsData(rangeKey);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance metrics across your dealership</p>
        </div>
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-muted/30 animate-pulse" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance metrics across your dealership</p>
        </div>
        {/* Date range selector */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border/40">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`text-xs px-3 py-1.5 rounded-md transition-all font-medium ${
                rangeKey === r.key
                  ? "bg-card shadow-sm text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {data?.summaryStats.map(stat => (
          <div key={stat.label} className="p-4 rounded-xl border border-border/50 bg-card/50 text-center">
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Vehicle Sales</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.bucketedSales}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Invoice Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data?.bucketedRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`£${value.toLocaleString()}`, "Revenue"]}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Status Breakdown */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Stock Status Breakdown</h3>
          {data?.vehicleStatusData?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.vehicleStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                  {data.vehicleStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">No vehicle data</div>
          )}
        </div>

        {/* Lead Funnel */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Lead Pipeline</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.leadFunnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="p-6 rounded-xl border border-border/50 bg-card/50 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">Lead Sources</h3>
          {data?.leadSourceData?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.leadSourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-muted-foreground">No lead data</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
