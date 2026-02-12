import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Phone, Mail, MapPin, MessageSquare, Plus, Clock, Car, FileText, Shield, AlertTriangle, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCustomer, useUpdateCustomer, useUserDealerId } from "@/hooks/useCustomers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

/* ── Linked records sub-components ── */

function LinkedVehicles({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-vehicles", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("id, vrm, make, model, year, status").eq("customer_id", customerId).eq("is_deleted", false).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data?.length) return <EmptyState icon={Car} label="No vehicles linked" />;
  return (
    <div className="space-y-2">
      {data.map((v) => (
        <div key={v.id} onClick={() => navigate(`/app/vehicles/${v.id}`)} className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between">
          <div>
            <span className="text-sm font-mono font-medium text-primary">{v.vrm || "—"}</span>
            <span className="text-sm text-muted-foreground ml-2">{[v.make, v.model].filter(Boolean).join(" ")}</span>
          </div>
          <StatusBadge status={v.status} />
        </div>
      ))}
    </div>
  );
}

function LinkedInvoices({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("id, invoice_number, total, status, created_at").eq("customer_id", customerId).order("created_at", { ascending: false });
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

function LinkedWarranties({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-warranties", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("warranties").select("id, warranty_number, warranty_type, status, start_date, end_date, vehicles(vrm)").eq("customer_id", customerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="h-20 rounded-lg bg-muted/30 animate-pulse" />;
  if (!data?.length) return <EmptyState icon={Shield} label="No warranties" />;
  return (
    <div className="space-y-2">
      {data.map((w: any) => (
        <div key={w.id} onClick={() => navigate(`/app/warranties/${w.id}`)} className="p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{w.warranty_number || "—"}</span>
            <span className="text-xs text-muted-foreground ml-2">{w.warranty_type || "basic"}</span>
            {w.vehicles?.vrm && <span className="text-xs text-muted-foreground ml-2">({w.vehicles.vrm})</span>}
          </div>
          <StatusBadge status={w.status} />
        </div>
      ))}
    </div>
  );
}

function LinkedAftersales({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-aftersales", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("aftersales_cases").select("id, case_number, summary, status, priority, created_at").eq("customer_id", customerId).order("created_at", { ascending: false });
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

function LinkedTasks({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["customer-tasks", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("id, title, status, priority, due_date").eq("related_customer_id", customerId).order("due_date", { ascending: true, nullsFirst: false });
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

/* ── Shared UI helpers ── */

const statusColorMap: Record<string, string> = {
  in_stock: "bg-success/10 text-success", reserved: "bg-warning/10 text-warning", sold: "bg-primary/10 text-primary", in_repair: "bg-destructive/10 text-destructive", returned: "bg-muted text-muted-foreground",
  active: "bg-success/10 text-success", expired: "bg-destructive/10 text-destructive", cancelled: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground", issued: "bg-primary/10 text-primary", paid: "bg-success/10 text-success", overdue: "bg-destructive/10 text-destructive",
  new: "bg-primary/10 text-primary", open: "bg-warning/10 text-warning", investigating: "bg-warning/10 text-warning", resolved: "bg-success/10 text-success", closed: "bg-muted text-muted-foreground",
  todo: "bg-muted text-muted-foreground", in_progress: "bg-warning/10 text-warning", done: "bg-success/10 text-success",
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

/* ── Communication Timeline ── */

function CustomerTimeline({ customerId, dealerId }: { customerId: string; dealerId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [logForm, setLogForm] = useState({ log_type: "note", subject: "", content: "" });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["comm-logs", customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("communication_logs").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("communication_logs").insert({
        dealer_id: dealerId, customer_id: customerId, log_type: logForm.log_type,
        subject: logForm.subject || null, content: logForm.content || null, created_by_user_id: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comm-logs", customerId] });
      toast.success("Log added"); setOpen(false);
      setLogForm({ log_type: "note", subject: "", content: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const typeLabels: Record<string, string> = { note: "Note", call: "Phone Call", email: "Email", sms: "SMS", meeting: "Meeting", other: "Other" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Communication Timeline</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Log</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Communication Log</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={logForm.log_type} onValueChange={(v) => setLogForm({ ...logForm, log_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Subject</Label><Input value={logForm.subject} onChange={(e) => setLogForm({ ...logForm, subject: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Content</Label><Textarea value={logForm.content} onChange={(e) => setLogForm({ ...logForm, content: e.target.value })} className="mt-1" rows={3} /></div>
              <Button onClick={() => addLog.mutate()} disabled={addLog.isPending} className="w-full">{addLog.isPending ? "Saving..." : "Add Log"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}</div>
      ) : !logs?.length ? (
        <EmptyState icon={MessageSquare} label="No communication logs yet" />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{typeLabels[log.log_type] || log.log_type}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(log.created_at), "d MMM yyyy HH:mm")}</span>
              </div>
              {log.subject && <p className="text-sm font-medium mt-2">{log.subject}</p>}
              {log.content && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{log.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Profile ── */

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: dealerId } = useUserDealerId();
  const update = useUpdateCustomer();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const startEdit = () => { if (customer) { setForm({ ...customer }); setEditing(true); } };

  const handleSave = async () => {
    if (!id) return;
    try {
      const { id: _, dealer_id, created_at, updated_at, is_deleted, deleted_at, ...updates } = form;
      if (updates.consent_marketing && !customer?.consent_marketing) {
        updates.consent_marketing_at = new Date().toISOString();
      }
      await update.mutateAsync({ id, ...updates });
      toast.success("Customer updated"); setEditing(false);
    } catch (err: any) { toast.error(err.message || "Failed to update"); }
  };

  if (isLoading) return <div className="h-40 rounded-xl bg-muted/30 animate-pulse" />;
  if (!customer) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Customer not found</p>
      <Button variant="outline" onClick={() => navigate("/app/customers")} className="mt-4">Back</Button>
    </div>
  );

  const c = editing ? form : customer;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app/customers")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h1>
            <p className="text-xs text-muted-foreground">Added {format(new Date(customer.created_at), "d MMM yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={update.isPending}><Save className="h-4 w-4 mr-1" /> Save</Button>
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
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="warranties">Warranties</TabsTrigger>
          <TabsTrigger value="aftersales">Aftersales</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Contact card */}
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-3">
              <h3 className="text-sm font-semibold">Contact</h3>
              {editing ? (
                <div className="space-y-3">
                  <div><Label className="text-xs">First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
                  <div>
                    <Label className="text-xs">Preferred Contact</Label>
                    <Select value={form.preferred_contact_method || "phone"} onValueChange={(v) => setForm({ ...form, preferred_contact_method: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {c.phone && <p className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {c.phone}</p>}
                  {c.email && <p className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {c.email}</p>}
                  {(c.city || c.postcode) && <p className="flex items-center gap-2 text-sm"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {[c.city, c.postcode].filter(Boolean).join(", ")}</p>}
                  <p className="text-xs text-muted-foreground mt-2">Preferred: {c.preferred_contact_method || "Phone"}</p>
                </div>
              )}
            </div>

            {/* Address card */}
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-3">
              <h3 className="text-sm font-semibold">Address</h3>
              {editing ? (
                <div className="space-y-3">
                  <div><Label className="text-xs">Line 1</Label><Input value={form.address_line1 || ""} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Line 2</Label><Input value={form.address_line2 || ""} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Postcode</Label><Input value={form.postcode || ""} onChange={(e) => setForm({ ...form, postcode: e.target.value })} className="mt-1" /></div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  {c.address_line1 && <p>{c.address_line1}</p>}
                  {c.address_line2 && <p>{c.address_line2}</p>}
                  {c.city && <p>{c.city}</p>}
                  {c.postcode && <p>{c.postcode}</p>}
                  {!c.address_line1 && !c.city && <p className="text-muted-foreground">No address on file</p>}
                </div>
              )}
            </div>

            {/* Consent & Notes */}
            <div className="p-5 rounded-xl border border-border/50 bg-card/50 space-y-3">
              <h3 className="text-sm font-semibold">Consent & Notes</h3>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={form.consent_marketing} onCheckedChange={(v) => setForm({ ...form, consent_marketing: !!v })} />
                    <Label className="text-xs">Marketing consent</Label>
                  </div>
                  <div><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" rows={4} /></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className={`text-xs px-2 py-1 rounded-full inline-block ${c.consent_marketing ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {c.consent_marketing ? "Marketing: Opted in" : "Marketing: No consent"}
                  </p>
                  {c.consent_marketing_at && <p className="text-xs text-muted-foreground">Consented {format(new Date(c.consent_marketing_at), "d MMM yyyy")}</p>}
                  {c.notes ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.notes}</p> : <p className="text-xs text-muted-foreground">No notes</p>}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vehicles"><LinkedVehicles customerId={id!} /></TabsContent>
        <TabsContent value="invoices"><LinkedInvoices customerId={id!} /></TabsContent>
        <TabsContent value="warranties"><LinkedWarranties customerId={id!} /></TabsContent>
        <TabsContent value="aftersales"><LinkedAftersales customerId={id!} /></TabsContent>
        <TabsContent value="tasks"><LinkedTasks customerId={id!} /></TabsContent>
        <TabsContent value="timeline"><CustomerTimeline customerId={id!} dealerId={customer.dealer_id} /></TabsContent>
      </Tabs>
    </motion.div>
  );
}
