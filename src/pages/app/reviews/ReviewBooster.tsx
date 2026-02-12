import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, Clock, CheckCircle2, BarChart3, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useReviewRequests, useCreateReviewRequest, useUpdateReviewRequest } from "@/hooks/useReviewRequests";
import { useCustomers, useUserDealerId } from "@/hooks/useCustomers";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

const PLATFORMS = ["google", "trustpilot", "autotrader", "facebook", "other"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  clicked: "Clicked",
  reviewed: "Reviewed",
  declined: "Declined",
};
const statusStyles: Record<string, string> = {
  pending: "text-muted-foreground bg-muted/30 border-border/50",
  sent: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  clicked: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  reviewed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  declined: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function ReviewBooster() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const { data: requests, isLoading } = useReviewRequests(statusFilter);
  const { data: customers } = useCustomers();
  const { data: vehicles } = useVehicles();
  const { data: dealerId } = useUserDealerId();
  const { user } = useAuth();
  const createRequest = useCreateReviewRequest();
  const updateRequest = useUpdateReviewRequest();

  const [form, setForm] = useState({
    customer_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    vehicle_id: "",
    platform: "google",
    notes: "",
  });

  const totalSent = requests?.length ?? 0;
  const reviewed = requests?.filter((r: any) => r.status === "reviewed").length ?? 0;
  const pending = requests?.filter((r: any) => r.status === "pending" || r.status === "sent").length ?? 0;
  const avgRating = requests?.filter((r: any) => r.review_rating)
    .reduce((acc: { sum: number; count: number }, r: any) => ({
      sum: acc.sum + r.review_rating,
      count: acc.count + 1,
    }), { sum: 0, count: 0 });
  const avgRatingDisplay = avgRating && avgRating.count > 0
    ? (avgRating.sum / avgRating.count).toFixed(1)
    : "—";

  const handleCreate = async () => {
    if (!dealerId || !user) return;
    const custName = form.customer_id
      ? (() => {
          const c = customers?.find((c: any) => c.id === form.customer_id);
          return c ? `${c.first_name} ${c.last_name}` : form.customer_name;
        })()
      : form.customer_name;

    if (!custName) { toast.error("Customer name is required"); return; }

    const vehicle = form.vehicle_id ? vehicles?.find((v: any) => v.id === form.vehicle_id) : null;

    try {
      await createRequest.mutateAsync({
        dealer_id: dealerId,
        customer_id: form.customer_id || null,
        customer_name: custName,
        customer_email: form.customer_email || null,
        customer_phone: form.customer_phone || null,
        vehicle_id: form.vehicle_id || null,
        vehicle_info: vehicle ? `${vehicle.make || ""} ${vehicle.model || ""} ${vehicle.vrm || ""}`.trim() : null,
        platform: form.platform,
        notes: form.notes || null,
      });
      toast.success("Review request created");
      setOpen(false);
      setForm({ customer_id: "", customer_name: "", customer_email: "", customer_phone: "", vehicle_id: "", platform: "google", notes: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleMarkSent = async (id: string) => {
    await updateRequest.mutateAsync({ id, status: "sent", sent_at: new Date().toISOString() });
    toast.success("Marked as sent");
  };

  const handleMarkReviewed = async (id: string, rating: number) => {
    await updateRequest.mutateAsync({ id, status: "reviewed", reviewed_at: new Date().toISOString(), review_rating: rating });
    toast.success("Review recorded");
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find((c: any) => c.id === customerId);
    if (customer) {
      setForm(p => ({
        ...p,
        customer_id: customerId,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        customer_email: customer.email || p.customer_email,
        customer_phone: customer.phone || p.customer_phone,
      }));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Booster</h1>
        <p className="text-sm text-muted-foreground">Send review requests and track customer feedback</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Requests Sent", value: totalSent, icon: Send },
          { label: "Reviews Received", value: reviewed, icon: Star },
          { label: "Avg Rating", value: avgRatingDisplay, icon: BarChart3 },
          { label: "Pending", value: pending, icon: Clock },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-border/50 bg-card/50">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow"><Plus className="h-4 w-4 mr-1" /> New Review Request</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Review Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Customer</Label>
                <Select value={form.customer_id} onValueChange={handleCustomerSelect}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!form.customer_id && (
                <div><Label>Customer Name *</Label><Input value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.customer_email} onChange={e => setForm(p => ({ ...p, customer_email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Vehicle (optional)</Label>
                <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.vrm} — {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button onClick={handleCreate} disabled={createRequest.isPending} className="w-full">Create Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      ) : !requests?.length ? (
        <div className="text-center py-16">
          <Star className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No review requests yet</p>
          <p className="text-xs text-muted-foreground">Click "New Review Request" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <Card key={req.id} className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium">{req.customer_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusStyles[req.status] || statusStyles.pending}`}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize">{req.platform}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {req.customer_email && <span>{req.customer_email}</span>}
                      {req.vehicle_info && <span>{req.vehicle_info}</span>}
                      <span>{format(new Date(req.created_at), "d MMM yyyy")}</span>
                    </div>
                    {req.review_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < req.review_rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {req.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkSent(req.id)}>
                        <Send className="h-3 w-3 mr-1" /> Mark Sent
                      </Button>
                    )}
                    {(req.status === "sent" || req.status === "clicked") && (
                      <Select onValueChange={v => handleMarkReviewed(req.id, parseInt(v))}>
                        <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Record Review" /></SelectTrigger>
                        <SelectContent>
                          {[5, 4, 3, 2, 1].map(r => (
                            <SelectItem key={r} value={String(r)}>{"★".repeat(r)}{"☆".repeat(5 - r)} ({r})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
