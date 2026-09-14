import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import KpiCard from "@/components/KpiCard";
import { runFleetServiceScan, completeWorkOrder, serviceState, formatCurrency, WORK_ORDER_TYPES, WORK_ORDER_PRIORITIES } from "@/lib/fleet";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { Wrench, ClipboardCheck, Plus, Radar, CircleDot, CheckCircle2 } from "lucide-react";

export default function Maintenance() {
const { toast } = useToast();
const [workOrders, setWorkOrders] = useState(null);
const [vehicles, setVehicles] = useState([]);
const [filter, setFilter] = useState("open");
const [scanning, setScanning] = useState(false);
const [busy, setBusy] = useState(null);
const [createOpen, setCreateOpen] = useState(false);
const [completing, setCompleting] = useState(null);
const [completeCost, setCompleteCost] = useState("");
const [form, setForm] = useState({ vehicle_id: "", title: "", type: "repair", priority: "medium", notes: "" });

const load = async () => {
const [w, v] = await Promise.all([
api.entities.WorkOrder.list("-created_date", 500),
api.entities.Vehicle.list("-created_date", 500),
]);
setWorkOrders(w);
setVehicles(v);
};
useEffect(() => { load(); }, []);

const filtered = useMemo(() => (workOrders || []).filter((w) => filter === "all" || w.status === filter), [workOrders, filter]);
const overdueVehicles = (vehicles || []).filter((v) => v.status !== "retired" && serviceState(v) === "overdue");

const scan = async () => {
setScanning(true);
try {
const created = await runFleetServiceScan(vehicles);
toast({
title: "Fleet service scan complete",
description: created ? `${created} preventive work order${created > 1 ? "s" : ""} auto-scheduled.` : "No new service work needed.",
});
load();
} finally {
setScanning(false);
}
};

const advance = async (wo) => {
if (wo.status === "in_progress") {
setCompleting(wo);
setCompleteCost("");
return;
}
setBusy(wo.id);
try {
await api.entities.WorkOrder.update(wo.id, { status: "in_progress" });
toast({ title: "Work started", description: wo.title });
load();
} finally {
setBusy(null);
}
};

const finishWorkOrder = async (e) => {
e.preventDefault();
await completeWorkOrder(completing, parseFloat(completeCost) || 0);
toast({ title: "Work order completed", description: `${completing.title} closed${completeCost ? ` at ${formatCurrency(parseFloat(completeCost))}` : ""}.` });
setCompleting(null);
load();
};

const create = async (e) => {
e.preventDefault();
if (!form.vehicle_id || !form.title) return;
await api.entities.WorkOrder.create({
...form,
status: "open",
due_date: moment().add(5, "days").format("YYYY-MM-DD"),
});
toast({ title: "Work order created", description: form.title });
setCreateOpen(false);
setForm({ vehicle_id: "", title: "", type: "repair", priority: "medium", notes: "" });
load();
};

if (!workOrders) {
return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
}

const maintMTD = workOrders
.filter((w) => w.completed_date && moment(w.completed_date).isAfter(moment().startOf("month")))
.reduce((s, w) => s + (w.cost || 0), 0);

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight">Maintenance Console</h1>
<p className="mt-1 text-sm text-muted-foreground">Preventive scheduling, repairs and inspections</p>
</div>
<div className="flex gap-2">
<Button variant="outline" onClick={scan} disabled={scanning}>
<Radar className="mr-2 h-4 w-4" /> {scanning ? "Scanning…" : "Run service scan"}
</Button>
<Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<Plus className="mr-2 h-4 w-4" /> New work order
</Button>
</div>
</div>

<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
<KpiCard title="Open work orders" value={workOrders.filter((w) => w.status !== "completed").length} icon={Wrench} />
<KpiCard title="Vehicles overdue for service" value={overdueVehicles.length} sub={overdueVehicles.length ? "Run a service scan to schedule" : "All compliant"} icon={ClipboardCheck} accent={overdueVehicles.length ? "text-red-400" : "text-emerald-300"} />
<KpiCard title="Maintenance spend (MTD)" value={formatCurrency(maintMTD)} icon={CircleDot} accent="text-violet-300" />
</div>

<div className="flex gap-2">
{["open", "in_progress", "completed", "all"].map((s) => (
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
<TableHead>Work order</TableHead>
<TableHead>Vehicle</TableHead>
<TableHead className="hidden sm:table-cell">Type</TableHead>
<TableHead>Priority</TableHead>
<TableHead>Status</TableHead>
<TableHead className="hidden md:table-cell">Due</TableHead>
<TableHead className="text-right">Action</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{filtered.map((w) => {
const vehicle = vehicles.find((v) => v.id === w.vehicle_id);
return (
<TableRow key={w.id} className="border-border/40">
<TableCell>
<p className="text-sm font-medium">{w.title}</p>
<p className="max-w-xs truncate text-xs text-muted-foreground">{w.notes || ""}</p>
</TableCell>
<TableCell><span className="font-mono text-sm">{vehicle?.plate_number || "—"}</span></TableCell>
<TableCell className="hidden sm:table-cell"><StatusBadge status={w.type} /></TableCell>
<TableCell><StatusBadge status={w.priority} /></TableCell>
<TableCell><StatusBadge status={w.status} /></TableCell>
<TableCell className="hidden text-sm text-muted-foreground md:table-cell">{w.due_date || "—"}</TableCell>
<TableCell className="text-right">
{w.status !== "completed" && (
<Button size="sm" variant="outline" disabled={busy === w.id} onClick={() => advance(w)}>
{w.status === "open" ? <><Wrench className="mr-1.5 h-3.5 w-3.5" /> Start</> : <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete</>}
</Button>
)}
{w.status === "completed" && <span className="font-mono text-sm">{w.cost ? formatCurrency(w.cost) : "—"}</span>}
</TableCell>
</TableRow>
);
})}
{!filtered.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Nothing in this view.</TableCell></TableRow>}
</TableBody>
</Table>
</Card>

{/* Complete dialog */}
<Dialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)}>
<DialogContent className="border-border/60 bg-card sm:max-w-md">
<DialogHeader><DialogTitle className="font-heading">Complete work order</DialogTitle></DialogHeader>
<form onSubmit={finishWorkOrder} className="space-y-4">
<p className="text-sm text-muted-foreground">{completing?.title}</p>
<div className="space-y-1.5">
<Label>Total cost (BDT)</Label>
<Input type="number" min="0" step="0.01" value={completeCost} onChange={(e) => setCompleteCost(e.target.value)} placeholder="0" />
</div>
<p className="text-xs text-muted-foreground">
Preventive orders reset the vehicle service baseline and return it to active duty.
</p>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => setCompleting(null)}>Cancel</Button>
<Button type="submit">Mark completed</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>

{/* Create dialog */}
<Dialog open={createOpen} onOpenChange={setCreateOpen}>
<DialogContent className="border-border/60 bg-card sm:max-w-lg">
<DialogHeader><DialogTitle className="font-heading">New work order</DialogTitle></DialogHeader>
<form onSubmit={create} className="space-y-4">
<div className="space-y-1.5">
<Label>Vehicle *</Label>
<Select value={form.vehicle_id} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))} required>
<SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
<SelectContent className="bg-popover">
{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Title *</Label>
<Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Replace brake pads" />
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1.5">
<Label>Type</Label>
<Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{WORK_ORDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Priority</Label>
<Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{WORK_ORDER_PRIORITIES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
</SelectContent>
</Select>
</div>
</div>
<div className="space-y-1.5">
<Label>Notes</Label>
<Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
</div>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
<Button type="submit">Create work order</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
</div>
);
}
