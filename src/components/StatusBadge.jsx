import React from "react";

const STYLES = {
active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
idle: "bg-slate-500/15 text-slate-300 border-slate-500/30",
maintenance: "bg-amber-500/15 text-amber-300 border-amber-500/30",
retired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
requested: "bg-purple-500/15 text-purple-300 border-purple-500/30",
assigned: "bg-sky-500/15 text-sky-300 border-sky-500/30",
in_progress: "bg-teal-500/15 text-teal-300 border-teal-500/30",
completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
open: "bg-red-500/15 text-red-300 border-red-500/30",
resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
low: "bg-slate-500/15 text-slate-300 border-slate-500/30",
medium: "bg-sky-500/15 text-sky-300 border-sky-500/30",
high: "bg-amber-500/15 text-amber-300 border-amber-500/30",
critical: "bg-red-500/15 text-red-300 border-red-500/30",
preventive: "bg-teal-500/15 text-teal-300 border-teal-500/30",
repair: "bg-amber-500/15 text-amber-300 border-amber-500/30",
inspection: "bg-sky-500/15 text-sky-300 border-sky-500/30",
ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
due_soon: "bg-amber-500/15 text-amber-300 border-amber-500/30",
overdue: "bg-red-500/15 text-red-300 border-red-500/30",
suspended: "bg-red-500/15 text-red-300 border-red-500/30",
inactive: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const LABELS = {
in_progress: "in progress",
due_soon: "due soon",
box_truck: "box truck",
semi_truck: "semi truck",
reefer_truck: "reefer truck",
};

export default function StatusBadge({ status }) {
const cls = STYLES[status] || "bg-secondary text-foreground border-border";
const label = LABELS[status] || (status || "").replace(/_/g, " ");
return (
<span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
{label}
</span>
);
}
