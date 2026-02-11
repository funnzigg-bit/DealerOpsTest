import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FolderOpen, Trash2, Download, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserDealerId } from "@/hooks/useCustomers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = ["general", "invoice", "contract", "insurance", "mot", "other"];

const iconForMime = (mime: string | null) => {
  if (!mime) return File;
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("pdf")) return FileText;
  return File;
};

export default function DocumentList() {
  const { data: dealerId } = useUserDealerId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents", dealerId, category, search],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (category !== "all") query = query.eq("category", category);
      if (search) query = query.ilike("name", `%${search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!dealerId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      if (!dealerId) throw new Error("No dealer");
      const filePath = `${dealerId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("dealer-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        dealer_id: dealerId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id || null,
      });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("File uploaded");
    },
    onError: (err: any) => toast.error(err.message || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from("dealer-documents").remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("File deleted");
    },
    onError: (err: any) => toast.error(err.message || "Delete failed"),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((f) => uploadMutation.mutate(f));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("dealer-documents").download(filePath);
    if (error) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">{docs?.length ?? 0} file{docs?.length !== 1 ? "s" : ""}</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
            <Upload className="h-4 w-4 mr-2" /> {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative max-w-xs flex-1">
          <Input placeholder="Search files..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}
        </div>
      ) : !docs?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-border/50 bg-card/50">
          <FolderOpen className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No documents yet</p>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Upload your first file
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Size</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Uploaded</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => {
                const Icon = iconForMime(doc.mime_type);
                return (
                  <tr key={doc.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden sm:table-cell">{formatSize(doc.file_size)}</td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{doc.category}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                      {format(new Date(doc.created_at), "d MMM yyyy")}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(doc.file_path, doc.name)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: doc.id, file_path: doc.file_path })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
