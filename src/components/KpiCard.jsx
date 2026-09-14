import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function KpiCard({ title, value, sub, icon: Icon, accent = "text-primary" }) {
return (
<Card className="card-glow border-border/60 bg-card/60">
<CardContent className="p-5">
<div className="flex items-start justify-between">
<div>
<p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
<p className="mt-2 font-heading text-3xl font-bold tracking-tight">{value}</p>
{sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
</div>
{Icon && (
<div className="rounded-lg bg-secondary/70 p-2.5">
<Icon className={`h-5 w-5 ${accent}`} />
</div>
)}
</div>
</CardContent>
</Card>
);
}
