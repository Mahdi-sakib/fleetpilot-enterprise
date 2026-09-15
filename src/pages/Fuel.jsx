import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import FuelLogFormDialog from "@/components/FuelLogFormDialog";
import KpiCard from "@/components/KpiCard";
import { formatCurrency } from "@/lib/fleet";
import moment from "moment";
import { Fuel, TrendingDown, Droplets, Plus } from "lucide-react";

export default function FuelPage() {
const [logs, setLogs] = useState(null);
const [vehicles, setVehicles] = useState([]);
const [drivers, setDrivers] = useState([]);
const [formOpen, setFormOpen] = useState(false);

const load = async () => {
const [l, v, d] = await Promise.all([
api.entities.FuelLog.list("-log_date", 500),
api.entities.Vehicle.list("-created_date", 500),
api.entities.Driver.list("-created_date", 500),
]);
setLogs(l);
setVehicles(v);
setDrivers(d);
};
useEffect(() => { load(); }, []);

const stats = useMemo(() => {
if (!logs?.length) return { mtdCost: 0, totalLiters: 0, avgPrice: 0 };
const monthStart = moment().startOf("month");
const mtd = logs.filter((l) => moment(l.log_date).isAfter(monthStart));
const mtdCost = mtd.reduce((s, l) => s + (l.cost || 0), 0);
const totalLiters = mtd.reduce((s, l) => s + (l.liters || 0), 0);
return { mtdCost, totalLiters, avgPrice: totalLiters ? mtdCost / totalLiters : 0 };
}, [logs]);

if (!logs) {
return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
}

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight">Fuel Management</h1>
<p className="mt-1 text-sm text-muted-foreground">Receipts, consumption and spend across the fleet</p>
</div>
<Button onClick={() => setFormOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<Plus className="mr-2 h-4 w-4" /> Log fuel purchase
</Button>
</div>

<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
<KpiCard title="Fuel spend (MTD)" value={formatCurrency(stats.mtdCost)} icon={Fuel} />
<KpiCard title="Liters (MTD)" value={stats.totalLiters.toLocaleString()} sub="across all vehicles" icon={Droplets} accent="text-sky-300" />
<KpiCard title="Avg price / liter" value={formatCurrency(stats.avgPrice, 2)} sub="fleet-wide MTD" icon={TrendingDown} accent="text-violet-300" />
</div>

<Card className="card-glow border-border/60 bg-card/60">
<Table>
<TableHeader>
<TableRow className="border-border/60 hover:bg-transparent">
<TableHead>Date</TableHead>
<TableHead>Vehicle</TableHead>
<TableHead className="hidden sm:table-cell">Driver</TableHead>
<TableHead className="text-right">Liters</TableHead>
<TableHead className="text-right">Cost</TableHead>
<TableHead className="hidden md:table-cell">Odometer</TableHead>
<TableHead className="hidden lg:table-cell">Station</TableHead>
<TableHead>Receipt</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{logs.map((l) => {
const vehicle = vehicles.find((v) => v.id === l.vehicle_id);
return (
<TableRow key={l.id} className="border-border/40">
<TableCell className="text-sm">{moment(l.log_date).format("MMM D, YYYY")}</TableCell>
<TableCell><span className="font-mono text-sm font-semibold">{vehicle?.plate_number || "—"}</span></TableCell>
<TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{drivers.find((d) => d.id === l.driver_id)?.full_name || "—"}</TableCell>
<TableCell className="text-right font-mono text-sm">{l.liters}</TableCell>
<TableCell className="text-right font-mono text-sm">{formatCurrency(l.cost)}</TableCell>
<TableCell className="hidden font-mono text-sm text-muted-foreground md:table-cell">{l.odometer?.toLocaleString() || "—"}</TableCell>
<TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{l.station || "—"}</TableCell>
<TableCell>
{l.receipt_url ? <a href={api.files.resolveUrl(l.receipt_url)} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">View</a> : <span className="text-sm text-muted-foreground">—</span>}
</TableCell>
</TableRow>
);
})}
{!logs.length && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No fuel purchases logged yet.</TableCell></TableRow>}
</TableBody>
</Table>
</Card>

<FuelLogFormDialog open={formOpen} onOpenChange={setFormOpen} vehicles={vehicles} onSaved={load} />
</div>
);
}
