import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Car, FileText, Shield, AlertTriangle, CheckSquare, Search as SearchIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVehicle, useUpdateVehicle } from "@/hooks/useVehicles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

/* ── Shared UI helpers ── */

const statusColorMap: Record<string, string> = {
  in_stock: "bg-success/10 text-success", reserved: "bg-warning/10 text-warning", sold: "bg-primary/10 text-primary", in_repair: "bg-destructive/10 text-destructive", returned: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success", expired: "bg-destructive/10 text-destructive", cancelled: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground", issued: "bg-primary/10 text-primary", paid: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive",
  new: "bg-primary/10 text-primary", open: "bg-warning/10 text-warning", investigating: "bg-warning/10 text-warning", resolved: "bg-success/10 text-success", closed: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground", in_progress: "bg-warning/10 text-warning", done: "bg-success/10 text-success",
  success: "bg-success/10 text-success", partial: "bg-warning/10 text-warning", failed: "bg-destructive/10 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full ${statusColorMap[status] || "bg-muted text-muted-foreground"}`}>{status.replace(/_/g, " ")}</span>;
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="p-6 rounded-xl border border-border/50 bg-card/50 text-center">
      <Icon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/* ── Linked records ── */

function LinkedOwnership({ vehicleId, customerId }: { vehicleId: string; customerId: string | null }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-customer", customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase.from("customers").select("id, first_name, last_name, phone, email").eq("id", customerId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
  if (!customerId) return <EmptyState icon={User} label="No customer linked" />;
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data) return <EmptyState icon={User} label="Customer not found" />;
  return (
    <div onClick={() => navigate(`/app/customers/${data.id}`)} className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors">
      <p className="text-sm font-medium">{data.first_name} {data.last_name}</p>
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        {data.phone && <p>{data.phone}</p>}
        {data.email && <p>{data.email}</p>}
      </div>
    </div>
  );
}

function LinkedInvoices({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-invoices", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("id, invoice_number, total, status, created_at").eq("vehicle_id", vehicleId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data?.length) return <EmptyState icon={FileText} label="No invoices" />;
  return (
    <div className="space-y-2">
      {data.map((inv) => (
        <div key={inv.id} onClick={() => navigate(`/app/invoices/${inv.id}`)} className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{inv.invoice_number}</span>
            <span className="text-xs text-muted-foreground ml-2">{format(new Date(inv.created_at), "d MMM yyyy")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">£{Number(inv.total).toLocaleString()}</span>
            <StatusBadge status={inv.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkedWarranties({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-warranties", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("warranties").select("id, warranty_number, warranty_type, status, start_date, end_date").eq("vehicle_id", vehicleId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data?.length) return <EmptyState icon={Shield} label="No warranties" />;
  return (
    <div className="space-y-2">
      {data.map((w) => (
        <div key={w.id} onClick={() => navigate(`/app/warranties/${w.id}`)} className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{w.warranty_number || "—"}</span>
            <span className="text-xs text-muted-foreground ml-2">{w.warranty_type || "basic"}</span>
          </div>
          <StatusBadge status={w.status} />
        </div>
      ))}
    </div>
  );
}

function LinkedAftersales({ vehicleId }: { vehicleId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-aftersales", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("aftersales_cases").select("id, case_number, summary, status, priority, created_at").eq("vehicle_id", vehicleId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data?.length) return <EmptyState icon={AlertTriangle} label="No aftersales cases" />;
  return (
    <div className="space-y-2">
      {data.map((c) => (
        <div key={c.id} onClick={() => navigate(`/app/aftersales/${c.id}`)} className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{c.case_number}</span>
            <span className="text-xs text-muted-foreground ml-2 truncate max-w-[200px] inline-block align-bottom">{c.summary}</span>
          </div>
          <StatusBadge status={c.status} />
        </div>
      ))}
    </div>
  );
}

function LinkedTasks({ vehicleId }: { vehicleId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-tasks", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("id, title, status, priority, due_date").eq("related_vehicle_id", vehicleId).order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data?.length) return <EmptyState icon={CheckSquare} label="No tasks" />;
  return (
    <div className="space-y-2">
      {data.map((t) => (
        <div key={t.id} className="p-3 rounded-lg border border-border/50 bg-card/50 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{t.title}</span>
            {t.due_date && <span className="text-xs text-muted-foreground ml-2">Due {format(new Date(t.due_date), "d MMM yyyy")}</span>}
          </div>
          <StatusBadge status={t.status} />
        </div>
      ))}
    </div>
  );
}

function LinkedChecks({ vrm }: { vrm: string | null }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-checks-by-vrm", vrm],
    queryFn: async () => {
      if (!vrm) return [];
      const { data, error } = await supabase.from("vehicle_checks").select("id, vrm, status, summary_data, created_at").eq("vrm", vrm.replace(/\s/g, "").toUpperCase()).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!vrm,
  });
  if (!vrm) return <EmptyState icon={SearchIcon} label="No VRM set — cannot look up checks" />;
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Vehicle Checks</h3>
        <Button size="sm" variant="outline" onClick={() => navigate("/app/checks")}><SearchIcon className="h-3.5 w-3.5 mr-1.5" /> Run New Check</Button>
      </div>
      {!data?.length ? (
        <EmptyState icon={SearchIcon} label="No checks run for this VRM yet" />
      ) : (
        <div className="space-y-2">
          {data.map((chk: any) => (
            <div key={chk.id} onClick={() => navigate(`/app/checks/${chk.id}`)} className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between">
              <div>
                <span className="text-sm font-mono font-medium text-primary">{chk.vrm}</span>
                <span className="text-xs text-muted-foreground ml-2">{format(new Date(chk.created_at), "d MMM yyyy HH:mm")}</span>
              </div>
              <StatusBadge status={chk.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Profile ── */

export default function VehicleProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: vehicle, isLoading } = useVehicle(id);
  const updateMutation = useUpdateVehicle();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const startEdit = () => { if (vehicle) { setForm({ ...vehicle }); setEditing(true); } };

  const handleSave = async () => {
    if (!id) return;
    try {
      const { id: _, dealer_id, created_at, updated_at, is_deleted, deleted_at, customers, ...updates } = form;
      await updateMutation.mutateAsync({ id, ...updates });
      toast.success("Vehicle updated"); setEditing(false);
    } catch (err: any) { toast.error(err.message || "Failed to update"); }
  };

  if (isLoading) return <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />;
  if (!vehicle) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Vehicle not found</p>
      <Button variant="outline" onClick={() => navigate("/app/vehicles")} className="mt-4">Back</Button>
    </div>
  );

  const v = editing ? form : vehicle;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/vehicles")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{vehicle.vrm || "No VRM"}</h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <p className="text-sm text-muted-foreground">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="warranties">Warranties</TabsTrigger>
          <TabsTrigger value="aftersales">Aftersales</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="checks">Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Identity */}
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-3">
              <h3 className="text-sm font-semibold">Identity</h3>
              {editing ? (
                <div className="space-y-3">
                  {["vrm", "vin", "make", "model", "derivative"].map((field) => (
                    <div key={field}>
                      <Label className="text-xs capitalize">{field.replace("_", " ")}</Label>
                      <Input value={form[field] || ""} onChange={(e) => setForm({ ...form, [field]: field === "vrm" ? e.target.value.toUpperCase() : e.target.value })} className="mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-muted-foreground">VRM:</span> <span className="font-mono font-medium text-primary">{v.vrm || "—"}</span></p>
                  <p><span className="text-muted-foreground">VIN:</span> <span className="font-mono">{v.vin || "—"}</span></p>
                  <p><span className="text-muted-foreground">Make:</span> {v.make || "—"}</p>
                  <p><span className="text-muted-foreground">Model:</span> {v.model || "—"}</p>
                  <p><span className="text-muted-foreground">Derivative:</span> {v.derivative || "—"}</p>
                </div>
              )}
            </div>

            {/* Specs */}
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-3">
              <h3 className="text-sm font-semibold">Specs</h3>
              {editing ? (
                <div className="space-y-3">
                  <div><Label className="text-xs">Year</Label><Input type="number" value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value ? parseInt(e.target.value) : null })} className="mt-1" /></div>
                  <div><Label className="text-xs">Mileage</Label><Input type="number" value={form.mileage || ""} onChange={(e) => setForm({ ...form, mileage: e.target.value ? parseInt(e.target.value) : null })} className="mt-1" /></div>
                  <div><Label className="text-xs">Colour</Label><Input value={form.colour || ""} onChange={(e) => setForm({ ...form, colour: e.target.value })} className="mt-1" /></div>
                  <div>
                    <Label className="text-xs">Fuel</Label>
                    <Select value={form.fuel_type || "petrol"} onValueChange={(v) => setForm({ ...form, fuel_type: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["petrol","diesel","electric","hybrid","plug_in_hybrid","other"].map(f => (<SelectItem key={f} value={f}>{f.replace("_"," ")}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Transmission</Label>
                    <Select value={form.transmission || "manual"} onValueChange={(v) => setForm({ ...form, transmission: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["manual","automatic","other"].map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-muted-foreground">Year:</span> {v.year || "—"}</p>
                  <p><span className="text-muted-foreground">Mileage:</span> {v.mileage ? v.mileage.toLocaleString() : "—"}</p>
                  <p><span className="text-muted-foreground">Colour:</span> {v.colour || "—"}</p>
                  <p><span className="text-muted-foreground">Fuel:</span> {v.fuel_type?.replace("_"," ") || "—"}</p>
                  <p><span className="text-muted-foreground">Transmission:</span> {v.transmission || "—"}</p>
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-3">
              <h3 className="text-sm font-semibold">Pricing & Status</h3>
              {editing ? (
                <div className="space-y-3">
                  <div><Label className="text-xs">Purchase Price (£)</Label><Input type="number" step="0.01" value={form.purchase_price || ""} onChange={(e) => setForm({ ...form, purchase_price: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" /></div>
                  <div><Label className="text-xs">Advertised Price (£)</Label><Input type="number" step="0.01" value={form.advertised_price || ""} onChange={(e) => setForm({ ...form, advertised_price: e.target.value ? parseFloat(e.target.value) : null })} className="mt-1" /></div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["in_stock","reserved","sold","in_repair","returned"].map(s => (<SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Select value={form.location || "on_site"} onValueChange={(v) => setForm({ ...form, location: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["on_site","garage","customer","other"].map(l => (<SelectItem key={l} value={l}>{l.replace("_"," ")}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={3} /></div>
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-muted-foreground">Purchase:</span> {v.purchase_price ? `£${Number(v.purchase_price).toLocaleString()}` : "—"}</p>
                  <p><span className="text-muted-foreground">Advertised:</span> {v.advertised_price ? `£${Number(v.advertised_price).toLocaleString()}` : "—"}</p>
                  {v.purchase_price && v.advertised_price && (
                    <p><span className="text-muted-foreground">Margin:</span> <span className="text-success">£{(Number(v.advertised_price) - Number(v.purchase_price)).toLocaleString()}</span></p>
                  )}
                  <p><span className="text-muted-foreground">Location:</span> {(v.location || "on_site").replace("_", " ")}</p>
                  {v.notes && <p className="text-muted-foreground text-xs mt-2 whitespace-pre-wrap">{v.notes}</p>}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ownership"><LinkedOwnership vehicleId={id!} customerId={vehicle.customer_id} /></TabsContent>
        <TabsContent value="invoices"><LinkedInvoices vehicleId={id!} /></TabsContent>
        <TabsContent value="warranties"><LinkedWarranties vehicleId={id!} /></TabsContent>
        <TabsContent value="aftersales"><LinkedAftersales vehicleId={id!} /></TabsContent>
        <TabsContent value="tasks"><LinkedTasks vehicleId={id!} /></TabsContent>
        <TabsContent value="checks"><LinkedChecks vrm={vehicle.vrm} /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
