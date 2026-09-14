import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import VehicleFormDialog from "@/components/VehicleFormDialog";
import { serviceState, kmToService, formatKm } from "@/lib/fleet";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Search, ChevronRight, Pencil } from "lucide-react";

export default function Vehicles() {
const { user } = useAuth();
const isAdmin = user?.role === "admin";
const [vehicles, setVehicles] = useState(null);
const [drivers, setDrivers] = useState([]);
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [formOpen, setFormOpen] = useState(false);
const [editing, setEditing] = useState(null);

const load = async () => {
const [v, d] = await Promise.all([
api.entities.Vehicle.list("-created_date", 500),
api.entities.Driver.list("-created_date", 500),
]);
setVehicles(v);
setDrivers(d);
};

useEffect(() => { load(); }, []);

const filtered = useMemo(() => {
if (!vehicles) return [];
const q = search.toLowerCase();
return vehicles.filter((v) => {
const matchesQ = !q ||
v.plate_number?.toLowerCase().includes(q) ||
`${v.make || ""} ${v.model || ""}`.toLowerCase().includes(q) ||
v.vin?.toLowerCase().includes(q);
const matchesStatus = statusFilter === "all" || v.status === statusFilter;
return matchesQ && matchesStatus;
});
}, [vehicles, search, statusFilter]);

if (!vehicles) {
return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
}

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight">Vehicles</h1>
<p className="mt-1 text-sm text-muted-foreground">{vehicles.length} units · built for fleets up to 500</p>
</div>
{isAdmin && (
<Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
<Plus className="mr-2 h-4 w-4" /> Add vehicle
</Button>
)}
</div>

<div className="flex flex-col gap-3 sm:flex-row">
<div className="relative flex-1">
<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plate, model or VIN…" className="pl-9" />
</div>
<Select value={statusFilter} onValueChange={setStatusFilter}>
<SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{["all", "active", "idle", "maintenance", "retired"].map((s) => (
<SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
))}
</SelectContent>
</Select>
</div>

<Card className="card-glow border-border/60 bg-card/60">
<Table>
<TableHeader>
<TableRow className="border-border/60 hover:bg-transparent">
<TableHead>Vehicle</TableHead>
<TableHead className="hidden md:table-cell">Type</TableHead>
<TableHead>Status</TableHead>
<TableHead className="hidden sm:table-cell">Odometer</TableHead>
<TableHead className="hidden sm:table-cell">Driver</TableHead>
<TableHead>Service</TableHead>
<TableHead className="w-10" />
</TableRow>
</TableHeader>
<TableBody>
{filtered.map((v) => {
const driver = drivers.find((d) => d.id === v.assigned_driver_id);
return (
<TableRow key={v.id} className="border-border/40">
<TableCell>
<Link to={`/vehicles/${v.id}`} className="block">
<p className="font-mono font-semibold text-foreground hover:text-primary">{v.plate_number}</p>
<p className="text-xs text-muted-foreground">{v.make} {v.model}</p>
</Link>
</TableCell>
<TableCell className="hidden capitalize text-muted-foreground md:table-cell">{(v.type || "").replace(/_/g, " ")}</TableCell>
<TableCell><StatusBadge status={v.status} /></TableCell>
<TableCell className="hidden font-mono text-sm sm:table-cell">{formatKm(v.odometer)}</TableCell>
<TableCell className="hidden text-sm sm:table-cell">{driver?.full_name || <span className="text-muted-foreground">—</span>}</TableCell>
<TableCell><StatusBadge status={serviceState(v)} /></TableCell>
<TableCell>
<div className="flex items-center justify-end gap-1">
{isAdmin && (
<button
type="button"
title="Edit / assign driver"
onClick={() => { setEditing(v); setFormOpen(true); }}
className="rounded-md p-1.5 transition-colors hover:bg-accent"
>
<Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
</button>
)}
<Link to={`/vehicles/${v.id}`}>
<ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
</Link>
</div>
</TableCell>
</TableRow>
);
})}
{!filtered.length && (
<TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No vehicles match your search.</TableCell></TableRow>
)}
</TableBody>
</Table>
{filtered.length > 0 && (
<p className="border-t border-border/40 px-4 py-3 text-xs text-muted-foreground">
Showing {filtered.length} of {vehicles.length} · {kmToService ? "" : ""}{vehicles.filter((v) => serviceState(v) === "overdue").length} overdue for service
</p>
)}
</Card>

<VehicleFormDialog
open={formOpen}
onOpenChange={setFormOpen}
vehicle={editing}
drivers={drivers}
onSaved={load}
/>
</div>
);
}
