import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export default function SuperAdminAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [targetAll, setTargetAll] = useState(true);
  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: dealers } = useQuery({
    queryKey: ["admin-dealers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("dealers").select("id, name").eq("status", "active").order("name");
      return data || [];
    },
  });

  const createAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("dealer_announcements").insert({
        title,
        message,
        priority,
        target_all_dealers: targetAll,
        target_dealer_ids: targetAll ? null : selectedDealers,
        created_by_user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Announcement published");
      setOpen(false);
      setTitle("");
      setMessage("");
      setPriority("normal");
      setTargetAll(true);
      setSelectedDealers([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dealer_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      toast.success("Announcement deleted");
    },
  });

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground border-border",
    normal: "bg-primary/10 text-primary border-primary/20",
    high: "bg-warning/10 text-warning border-warning/20",
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const toggleDealer = (id: string) => {
    setSelectedDealers(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Broadcast messages to dealers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Announcement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Message *</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} className="mt-1" rows={4} />
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={targetAll} onCheckedChange={(v) => setTargetAll(!!v)} />
                <Label className="text-sm">Send to all dealers</Label>
              </div>
              {!targetAll && (
                <div className="max-h-40 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/30">
                  {dealers?.map(d => (
                    <div key={d.id} className="flex items-center gap-2">
                      <Checkbox checked={selectedDealers.includes(d.id)} onCheckedChange={() => toggleDealer(d.id)} />
                      <span className="text-sm">{d.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button
                onClick={() => createAnnouncement.mutate()}
                disabled={!title || !message || createAnnouncement.isPending}
                className="w-full"
              >
                {createAnnouncement.isPending ? "Publishing..." : "Publish Announcement"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />)}</div>
      ) : !announcements?.length ? (
        <div className="text-center py-20 rounded-xl border border-border/50 bg-card/50">
          <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map(a => (
            <div key={a.id} className="p-4 rounded-xl border border-border/50 bg-card/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[a.priority]}`}>
                      {a.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a.target_all_dealers ? "All dealers" : `${(a.target_dealer_ids as string[])?.length || 0} dealers`}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(a.created_at), "d MMM yyyy HH:mm")}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteAnnouncement.mutate(a.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
