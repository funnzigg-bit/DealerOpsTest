import { motion } from "framer-motion";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SupportTickets() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-sm text-muted-foreground">Get help from the DealerOps team</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Contact Support</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-medium">Email Support</p>
              <p className="text-xs text-muted-foreground mt-1">support@dealerops.co.uk</p>
              <p className="text-xs text-muted-foreground">Response within 4 business hours</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-medium">Phone Support</p>
              <p className="text-xs text-muted-foreground mt-1">0800 123 4567</p>
              <p className="text-xs text-muted-foreground">Mon–Fri 9am–6pm</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-medium">Knowledge Base</p>
              <p className="text-xs text-muted-foreground mt-1">Browse guides, FAQs, and video tutorials</p>
              <Button size="sm" variant="outline" className="mt-2 text-xs">
                <ExternalLink className="h-3 w-3 mr-1.5" /> Open Knowledge Base
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Recent Tickets</h3>
          <div className="flex flex-col items-center justify-center h-32">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No support tickets</p>
            <p className="text-xs text-muted-foreground mt-1">Ticket system coming soon</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
