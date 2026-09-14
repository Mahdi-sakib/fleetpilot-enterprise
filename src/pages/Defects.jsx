import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import DefectFormDialog from "@/components/DefectFormDialog";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { Plus, Wrench, CheckCircle2 } from "lucide-react";

export default function Defects() {
const { toast } = useToast();
const [defects, setDefects] = useState(null);
const [vehicles, setVehicles] = useState([]);
const [drivers, setDrivers] = useState([]);
const [filter, setFilter] = useState("open");
const [formOpen, setFormOpen] = useState(false);
const [busy, setBusy] = useState(null);

const load = async () => {
const [d, v, dr] = await Promise.all([
api.entities.DefectReport.list("-report_date", 500),
api.entities.Vehicle.list("-created_date", 500),
api.entities.Driver.list("-created_date", 500),
]);
setDefects(d);
setVehicles(v);
setDrivers(dr);
};
useEffect(() => { load(); }, []);

const filtered = useMemo(() => (defects || []).filter((d) => filter === "all" || d.status === filter), [defects, filter]);

const advance = async (d) => {
setBusy(d.id);
try {
if (d.status === "open") {
await api.entities.DefectReport.update(d.id, { status: "in_progress" });
toast({ title: "Work started", description: `"${d.title}" moved to in-progress.` });
} else {
await api.entities.DefectReport.update(d.id, { status: "resolved" });
const vehicle = vehicles.find((v) => v.id === d.vehicle_id);
if (vehicle?.status === "maintenance") {
const stillOpen = defects.some((x) => x.vehicle_id === d.vehicle_id && x.id !== d.id && x.status !== "resolved");
if (!stillOpen) await api.entities.Vehicle.update(vehicle.id, { status: "active" });
}
toast({ title: "Defect resolved", description: `"${d.title}" closed out.` });
}
load();
} finally {
setBusy(null);
}
};

if (!defects) {
return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
}

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight">Defect Reports</h1>
<p className="mt-1 text-sm text-muted-foreground">
{defects.filter((d) => d.status === "open").length} open · {defects.filter((d) => d.severity === "critical" && d.status !== "resolved").length} critical
</p>
</div>
<Button onClick={() => setFormOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<Plus className="mr-2 h-4 w-4" /> Report defect
</Button>
</div>

<div className="flex gap-2">
{["open", "in_progress", "resolved", "all"].map((s) => (
<button
key={s}
onClick={() => setFilter(s)}
className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
filter === s ? "border-primary/50 bg-primary/15 text-primary glow-teal" : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
}`}
>
{s.replace(/_/g, " ")}
</button>
))}
</div>

<Card className="card-glow border-border/60 bg-card/60">
<Table>
<TableHeader>
<TableRow className="border-border/60 hover:bg-transparent">
<TableHead>Report</TableHead>
<TableHead>Vehicle</TableHead>
<TableHead className="hidden md:table-cell">Driver</TableHead>
<TableHead>Severity</TableHead>
<TableHead>Status</TableHead>
<TableHead className="hidden sm:table-cell">Date</TableHead>
<TableHead className="text-right">Action</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{filtered.map((d) => {
const vehicle = vehicles.find((v) => v.id === d.vehicle_id);
const driver = drivers.find((x) => x.id === d.driver_id);
return (
<TableRow key={d.id} className="border-border/40">
<TableCell>
<p className="text-sm font-medium">{d.title}</p>
<p className="max-w-sm truncate text-xs text-muted-foreground">{d.description || ""}</p>
</TableCell>
<TableCell><span className="font-mono text-sm">{vehicle?.plate_number || "—"}</span></TableCell>
<TableCell className="hidden text-sm text-muted-foreground md:table-cell">{driver?.full_name || "—"}</TableCell>
<TableCell><StatusBadge status={d.severity} /></TableCell>
<TableCell><StatusBadge status={d.status} /></TableCell>
<TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{moment(d.report_date).format("MMM D")}</TableCell>
<TableCell className="text-right">
{d.status !== "resolved" && (
<Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => advance(d)}>
{d.status === "open" ? <><Wrench className="mr-1.5 h-3.5 w-3.5" /> Start work</> : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Resolve</>}
</Button>
)}
</TableCell>
</TableRow>
);
})}
{!filtered.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nothing in this view.</TableCell></TableRow>}
</TableBody>
</Table>
</Card>

<DefectFormDialog open={formOpen} onOpenChange={setFormOpen} vehicles={vehicles} onSaved={load} />
</div>
);
}
