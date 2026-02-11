import { motion } from "framer-motion";
import { Star, Send, Clock, CheckCircle2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReviewBooster() {
  const stats = [
    { label: "Requests Sent", value: "—", icon: Send },
    { label: "Reviews Received", value: "—", icon: Star },
    { label: "Avg Rating", value: "—", icon: BarChart3 },
    { label: "Pending", value: "—", icon: Clock },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Booster</h1>
        <p className="text-sm text-muted-foreground">Automated review request campaigns</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-border/50 bg-card/50">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: "1", title: "Customer completes a purchase", desc: "After a vehicle sale or service is completed" },
              { step: "2", title: "Automatic review request", desc: "An email or SMS is sent to the customer after a configurable delay" },
              { step: "3", title: "Customer leaves a review", desc: "Directed to Google, Trustpilot, or your preferred platform" },
              { step: "4", title: "Track results", desc: "Monitor your review performance and conversion rates" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-border/50 bg-card/50">
          <h3 className="text-sm font-semibold mb-4">Campaign Settings</h3>
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Star className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Campaign automation coming soon</p>
            <p className="text-xs text-muted-foreground">Configure review platforms, delay timing, and templates</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
