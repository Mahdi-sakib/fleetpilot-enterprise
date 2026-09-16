import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import CompleteTripDialog from "@/components/CompleteTripDialog";
import { startTrip, formatKm } from "@/lib/fleet";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { Plus, Play, CheckCircle2, Truck, X } from "lucide-react";

const emptyAssignForm = { vehicle_id: "", driver_id: "", origin: "", destination: "", cost_center: "" };
const emptyRequestForm = { origin: "", destination: "", notes: "" };

export default function Trips() {
const { user } = useAuth();
const canAssign = isAdminRole(user?.role);
const { toast } = useToast();
const [trips, setTrips] = useState(null);
const [vehicles, setVehicles] = useState([]);
const [drivers, setDrivers] = useState([]);
const [vehicleTypes, setVehicleTypes] = useState([]);
const [filter, setFilter] = useState("all");

const [assignOpen, setAssignOpen] = useState(false);
const [assigningTrip, setAssigningTrip] = useState(null); // the requested trip being fulfilled, or null when creating a fresh trip
const [form, setForm] = useState(emptyAssignForm);
const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
const [saving, setSaving] = useState(false);

const [requestOpen, setRequestOpen] = useState(false);
const [requestForm, setRequestForm] = useState(emptyRequestForm);
const [requesting, setRequesting] = useState(false);

const [completing, setCompleting] = useState(null);
const [costCenters, setCostCenters] = useState([]);

const load = async () => {
const [t, v, d, cc, vt] = await Promise.all([
api.entities.Trip.list("-created_date", 500),
api.entities.Vehicle.list("-created_date", 500),
api.entities.Driver.list("-created_date", 500),
api.entities.CostCenter.list("name", 200),
api.entities.VehicleType.list("name", 100),
]);
setTrips(t);
setVehicles(v);
setDrivers(d);
setCostCenters(cc);
setVehicleTypes(vt);
};
useEffect(() => { load(); }, []);

const filtered = useMemo(() => (trips || []).filter((t) => filter === "all" || t.status === filter), [trips, filter]);

const availableVehicles = vehicles.filter(
(v) => v.status === "active" && (vehicleTypeFilter === "all" || v.type === vehicleTypeFilter)
);

const openAssign = (trip = null) => {
setAssigningTrip(trip);
setForm(trip ? { vehicle_id: "", driver_id: "", origin: trip.origin || "", destination: trip.destination || "", cost_center: trip.cost_center || "" } : emptyAssignForm);
setVehicleTypeFilter("all");
setAssignOpen(true);
};

const assign = async (e) => {
e.preventDefault();
if (!form.vehicle_id || !form.driver_id) return;
setSaving(true);
try {
const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
if (assigningTrip) {
await api.entities.Trip.update(assigningTrip.id, {
...form,
status: "assigned",
start_odometer: vehicle?.odometer || 0,
});
toast({ title: "Trip assigned", description: "Vehicle and driver dispatched to the driver portal." });
} else {
await api.entities.Trip.create({
...form,
status: "assigned",
start_odometer: vehicle?.odometer || 0,
});
toast({ title: "Trip assigned", description: `${form.origin || "Trip"} → ${form.destination || "destination"} dispatched to the driver portal.` });
}
setAssignOpen(false);
setAssigningTrip(null);
setForm(emptyAssignForm);
load();
} finally {
setSaving(false);
}
};

const requestTrip = async (e) => {
e.preventDefault();
setRequesting(true);
try {
await api.entities.Trip.create({ ...requestForm, status: "requested", requested_by: user.id });
toast({ title: "Trip requested", description: "An admin will assign a vehicle and driver soon." });
setRequestOpen(false);
setRequestForm(emptyRequestForm);
load();
} finally {
setRequesting(false);
}
};

const cancelRequest = async (trip) => {
if (!window.confirm("Cancel this trip request?")) return;
await api.entities.Trip.update(trip.id, { status: "cancelled" });
toast({ title: "Request cancelled" });
load();
};

const start = async (trip) => {
await startTrip(trip.id);
toast({ title: "Trip started", description: "Telemetry is now tracking this run." });
load();
};

if (!trips) {
return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
}

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight">Trips & Dispatch</h1>
<p className="mt-1 text-sm text-muted-foreground">
{trips.filter((t) => t.status === "in_progress").length} on the road · {trips.filter((t) => t.status === "assigned").length} awaiting start
{trips.filter((t) => t.status === "requested").length > 0 && ` · ${trips.filter((t) => t.status === "requested").length} awaiting assignment`}
</p>
</div>
{canAssign ? (
<Button onClick={() => openAssign()} className="bg-primary text-primary-foreground hover:bg-primary/90">
<Plus className="mr-2 h-4 w-4" /> Assign trip
</Button>
) : (
<Button onClick={() => setRequestOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<Plus className="mr-2 h-4 w-4" /> Request a trip
</Button>
)}
</div>

<div className="flex flex-wrap gap-2">
{["all", "requested", "assigned", "in_progress", "completed"].map((s) => (
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
<TableHead>Route</TableHead>
<TableHead className="hidden md:table-cell">Vehicle</TableHead>
<TableHead className="hidden sm:table-cell">Driver</TableHead>
<TableHead>Status</TableHead>
<TableHead className="hidden lg:table-cell">When</TableHead>
<TableHead className="text-right">Distance</TableHead>
<TableHead className="text-right">Action</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{filtered.map((t) => {
const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
const driver = drivers.find((d) => d.id === t.driver_id);
return (
<TableRow key={t.id} className="border-border/40">
<TableCell>
<p className="text-sm font-medium">{t.origin || "—"} <span className="text-muted-foreground">→</span> {t.destination || "—"}</p>
{t.cost_center && <p className="text-xs text-muted-foreground">{t.cost_center}</p>}
<p className="text-xs text-muted-foreground sm:hidden">{vehicle?.plate_number}</p>
</TableCell>
<TableCell className="hidden font-mono text-sm md:table-cell">{vehicle?.plate_number || "—"}</TableCell>
<TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{driver?.full_name || "—"}</TableCell>
<TableCell><StatusBadge status={t.status} /></TableCell>
<TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
{t.start_time ? moment(t.start_time).format("MMM D, HH:mm") : "Not started"}
</TableCell>
<TableCell className="text-right font-mono text-sm">{t.status === "completed" ? formatKm(t.distance_km) : "—"}</TableCell>
<TableCell className="text-right">
<div className="flex items-center justify-end gap-1.5">
{t.status === "requested" && canAssign && (
<>
<Button size="sm" variant="outline" onClick={() => openAssign(t)}><Truck className="mr-1.5 h-3.5 w-3.5" /> Assign</Button>
<button type="button" title="Cancel request" onClick={() => cancelRequest(t)} className="rounded-md p-1.5 transition-colors hover:bg-accent">
<X className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
</button>
</>
)}
{t.status === "assigned" && (
<Button size="sm" variant="outline" onClick={() => start(t)}><Play className="mr-1.5 h-3.5 w-3.5" /> Start</Button>
)}
{t.status === "in_progress" && (
<Button size="sm" onClick={() => setCompleting(t)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Finish
</Button>
)}
</div>
</TableCell>
</TableRow>
);
})}
{!filtered.length && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No trips in this view.</TableCell></TableRow>}
</TableBody>
</Table>
</Card>

<Dialog open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (!o) setAssigningTrip(null); }}>
<DialogContent className="border-border/60 bg-card sm:max-w-lg">
<DialogHeader><DialogTitle className="font-heading">{assigningTrip ? "Assign vehicle & driver" : "Assign a trip"}</DialogTitle></DialogHeader>
<form onSubmit={assign} className="space-y-4">
<div className="space-y-1.5">
<Label>Vehicle type</Label>
<Select value={vehicleTypeFilter} onValueChange={(v) => { setVehicleTypeFilter(v); setForm((f) => ({ ...f, vehicle_id: "" })); }}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
<SelectItem value="all">All types</SelectItem>
{vehicleTypes.map((vt) => <SelectItem key={vt.id} value={vt.code}>{vt.name}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Vehicle *</Label>
<Select value={form.vehicle_id} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))} required>
<SelectTrigger><SelectValue placeholder="Select active vehicle" /></SelectTrigger>
<SelectContent className="bg-popover">
{availableVehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Driver *</Label>
<Select value={form.driver_id} onValueChange={(v) => setForm((f) => ({ ...f, driver_id: v }))} required>
<SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
<SelectContent className="bg-popover">
{drivers.filter((d) => d.status === "active").map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1.5">
<Label>Origin</Label>
<Input value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} placeholder="Dhaka Hub" />
</div>
<div className="space-y-1.5">
<Label>Destination</Label>
<Input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} placeholder="Chattogram" />
</div>
</div>
<div className="space-y-1.5">
<Label>Cost center</Label>
<Select value={form.cost_center || "none"} onValueChange={(v) => setForm((f) => ({ ...f, cost_center: v === "none" ? "" : v }))}>
<SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
<SelectContent className="bg-popover">
<SelectItem value="none">None</SelectItem>
{costCenters.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
</SelectContent>
</Select>
</div>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
<Button type="submit" disabled={saving}>{saving ? "Dispatching…" : "Assign trip"}</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>

<Dialog open={requestOpen} onOpenChange={setRequestOpen}>
<DialogContent className="border-border/60 bg-card sm:max-w-lg">
<DialogHeader><DialogTitle className="font-heading">Request a trip</DialogTitle></DialogHeader>
<form onSubmit={requestTrip} className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1.5">
<Label>Origin</Label>
<Input value={requestForm.origin} onChange={(e) => setRequestForm((f) => ({ ...f, origin: e.target.value }))} placeholder="Dhaka Hub" />
</div>
<div className="space-y-1.5">
<Label>Destination</Label>
<Input value={requestForm.destination} onChange={(e) => setRequestForm((f) => ({ ...f, destination: e.target.value }))} placeholder="Chattogram" />
</div>
</div>
<div className="space-y-1.5">
<Label>Notes</Label>
<Textarea rows={3} value={requestForm.notes} onChange={(e) => setRequestForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Purpose of the trip, preferred time, etc." />
</div>
<p className="text-xs text-muted-foreground">An admin will review your request and assign a vehicle and driver.</p>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
<Button type="submit" disabled={requesting}>{requesting ? "Requesting…" : "Submit request"}</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>

<CompleteTripDialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)} trip={completing} onSaved={load} />
</div>
);
}
