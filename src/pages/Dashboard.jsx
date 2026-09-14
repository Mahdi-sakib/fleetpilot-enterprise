import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import KpiCard from "@/components/KpiCard";
import StatusRing from "@/components/StatusRing";
import StatusBadge from "@/components/StatusBadge";
import { serviceState, kmToService, isLicenseValid, formatCurrency, formatKm } from "@/lib/fleet";
import moment from "moment";
import {
Truck, Route, AlertTriangle, Wrench, Fuel, DollarSign, ChevronRight, Activity,
} from "lucide-react";
import {
ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
PieChart, Pie, Cell, Legend,
} from "recharts";

const tooltipStyle = {
contentStyle: { background: "hsl(217 27% 9%)", border: "1px solid hsl(217 20% 22%)", borderRadius: 8 },
labelStyle: { color: "hsl(180 20% 96%)" },
itemStyle: { color: "hsl(180 20% 96%)" },
};

export default function Dashboard() {
const [data, setData] = useState(null);

useEffect(() => {
(async () => {
const [vehicles, drivers, trips, fuelLogs, workOrders, defects] = await Promise.all([
api.entities.Vehicle.list("-created_date", 500),
api.entities.Driver.list("-created_date", 500),
api.entities.Trip.list("-created_date", 500),
api.entities.FuelLog.list("-created_date", 500),
api.entities.WorkOrder.list("-created_date", 500),
api.entities.DefectReport.list("-created_date", 500),
]);
setData({ vehicles, drivers, trips, fuelLogs, workOrders, defects });
})();
}, []);

if (!data) {
return (
<div className="flex h-[60vh] items-center justify-center">
<div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" />
</div>
);
}

const { vehicles, drivers, trips, fuelLogs, workOrders, defects } = data;

const activeVehicles = vehicles.filter((v) => v.status === "active");
const inProgress = trips.filter((t) => t.status === "in_progress");
const openDefects = defects.filter((d) => d.status !== "resolved");
const criticalDefects = openDefects.filter((d) => d.severity === "critical");
const overdue = vehicles.filter((v) => v.status !== "retired" && serviceState(v) === "overdue");
const activeDrivers = drivers.filter((d) => d.status === "active");
const validLicenses = activeDrivers.filter(isLicenseValid);

// Cost of ownership — fuel and maintenance this month + straight-line depreciation.
const monthStart = moment().startOf("month");
const fuelMTD = fuelLogs.filter((f) => moment(f.log_date).isAfter(monthStart)).reduce((s, f) => s + (f.cost || 0), 0);
const maintMTD = workOrders
.filter((w) => w.completed_date && moment(w.completed_date).isAfter(monthStart))
.reduce((s, w) => s + (w.cost || 0), 0);
const depreciationMTD = vehicles.reduce((s, v) => s + (v.purchase_cost || 0) / 60, 0);
const tcoMTD = fuelMTD + maintMTD + depreciationMTD;

// Distance per day, last 7 days.
const days = [...Array(7)].map((_, i) => moment().subtract(6 - i, "days"));
const distanceData = days.map((d) => {
const dayTrips = trips.filter((t) => t.end_time && moment(t.end_time).isSame(d, "day"));
return {
day: d.format("ddd"),
km: dayTrips.reduce((s, t) => s + (t.distance_km || 0), 0),
};
});

const costData = [
{ name: "Fuel", value: fuelMTD, color: "#45A29E" },
{ name: "Maintenance", value: maintMTD, color: "#38BDF8" },
{ name: "Depreciation", value: depreciationMTD, color: "#A78BFA" },
].filter((c) => c.value > 0);

const utilization = activeVehicles.length ? (inProgress.length / activeVehicles.length) * 100 : 0;
const readiness = vehicles.length ? ((activeVehicles.length + vehicles.filter((v) => v.status === "idle").length) / vehicles.length) * 100 : 0;
const serviceCompliance = vehicles.length - overdue.length ? ((vehicles.length - overdue.length) / vehicles.length) * 100 : 0;
const licenseCompliance = activeDrivers.length ? (validLicenses.length / activeDrivers.length) * 100 : 0;
const avgSafety = activeDrivers.length ? activeDrivers.reduce((s, d) => s + (d.safety_score || 100), 0) / activeDrivers.length : 100;

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight text-glow">Command Center</h1>
<p className="mt-1 text-sm text-muted-foreground">
Live fleet telemetry · {vehicles.length} vehicles under management
</p>
</div>
<div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary glow-teal">
<span className="relative flex h-2 w-2">
<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
<span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
</span>
Telemetry online
</div>
</div>

{/* KPI row */}
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
<KpiCard title="Fleet size" value={vehicles.length} sub={`${activeVehicles.length} active · ${vehicles.filter((v) => v.status === "maintenance").length} in maintenance`} icon={Truck} />
<KpiCard title="Trips in progress" value={inProgress.length} sub={`${trips.filter((t) => t.status === "assigned").length} awaiting dispatch`} icon={Route} accent="text-sky-300" />
<KpiCard title="Open defects" value={openDefects.length} sub={criticalDefects.length ? `${criticalDefects.length} critical` : "No critical defects"} icon={AlertTriangle} accent={criticalDefects.length ? "text-red-400" : "text-amber-300"} />
<KpiCard title="Cost of ownership (MTD)" value={formatCurrency(tcoMTD)} sub={`Fuel ${formatCurrency(fuelMTD)} · Maint ${formatCurrency(maintMTD)}`} icon={DollarSign} accent="text-violet-300" />
</div>

{/* Rings + charts */}
<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
<Card className="card-glow border-border/60 bg-card/60">
<CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Fleet status rings</CardTitle></CardHeader>
<CardContent>
<div className="grid grid-cols-2 gap-6 py-2">
<StatusRing value={utilization} label="Utilization" sublabel="on the road" />
<StatusRing value={readiness} label="Readiness" sublabel="roadworthy" color="#38BDF8" />
<StatusRing value={serviceCompliance} label="Service" sublabel="compliant" color={serviceCompliance < 90 ? "#FBBF24" : "#45A29E"} />
<StatusRing value={avgSafety} label="Driver safety" sublabel={`avg score`} color="#A78BFA" />
</div>
</CardContent>
</Card>

<Card className="card-glow border-border/60 bg-card/60 lg:col-span-2">
<CardHeader className="pb-2">
<CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
<Activity className="h-4 w-4 text-primary" /> Distance logged — last 7 days
</CardTitle>
</CardHeader>
<CardContent className="h-[280px]">
<ResponsiveContainer width="100%" height="100%">
<BarChart data={distanceData}>
<CartesianGrid strokeDasharray="3 3" stroke="hsl(217 27% 16%)" vertical={false} />
<XAxis dataKey="day" stroke="hsl(213 13% 64%)" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="hsl(213 13% 64%)" fontSize={12} tickLine={false} axisLine={false} unit=" km" width={70} />
<Tooltip {...tooltipStyle} cursor={{ fill: "hsl(217 27% 13%)" }} />
<Bar dataKey="km" fill="#45A29E" radius={[4, 4, 0, 0]} maxBarSize={40} />
</BarChart>
</ResponsiveContainer>
</CardContent>
</Card>
</div>

<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
{/* Cost breakdown */}
<Card className="card-glow border-border/60 bg-card/60">
<CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">MTD cost breakdown</CardTitle></CardHeader>
<CardContent className="h-[260px]">
{costData.length ? (
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie data={costData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={4} stroke="none">
{costData.map((c) => <Cell key={c.name} fill={c.color} />)}
</Pie>
<Tooltip {...tooltipStyle} formatter={(v) => formatCurrency(v)} />
<Legend wrapperStyle={{ fontSize: 12, color: "hsl(213 13% 64%)" }} />
</PieChart>
</ResponsiveContainer>
) : (
<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
<span className="flex items-center gap-2"><Fuel className="h-4 w-4" /> No costs recorded this month yet</span>
</div>
)}
</CardContent>
</Card>

{/* Service due list */}
<Card className="card-glow border-border/60 bg-card/60">
<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
<Wrench className="h-4 w-4 text-amber-300" /> Service due
</CardTitle>
<Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
<Link to="/maintenance">Maintenance <ChevronRight className="h-4 w-4" /></Link>
</Button>
</CardHeader>
<CardContent className="space-y-2">
{[...overdue, ...vehicles.filter((v) => v.status !== "retired" && serviceState(v) === "due_soon")].slice(0, 5).map((v) => (
<Link key={v.id} to={`/vehicles/${v.id}`} className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/40 px-3 py-2.5 transition-colors hover:border-primary/40">
<div>
<p className="font-mono text-sm font-semibold">{v.plate_number}</p>
<p className="text-xs text-muted-foreground">{v.make} {v.model}</p>
</div>
<div className="text-right">
<StatusBadge status={serviceState(v)} />
<p className="mt-1 text-[11px] text-muted-foreground">{Math.abs(kmToService(v)).toLocaleString()} km {kmToService(v) <= 0 ? "over" : "left"}</p>
</div>
</Link>
))}
{!overdue.length && !vehicles.some((v) => serviceState(v) === "due_soon") && (
<p className="py-8 text-center text-sm text-muted-foreground">All vehicles are service compliant ✓</p>
)}
</CardContent>
</Card>

{/* Compliance & defects */}
<Card className="card-glow border-border/60 bg-card/60">
<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
<CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Compliance watch</CardTitle>
<Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary">
<Link to="/defects">Defects <ChevronRight className="h-4 w-4" /></Link>
</Button>
</CardHeader>
<CardContent className="space-y-3">
<div className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/40 px-3 py-2.5">
<span className="text-sm">Driver licenses valid</span>
<span className={`font-semibold ${licenseCompliance === 100 ? "text-emerald-300" : "text-amber-300"}`}>
{validLicenses.length}/{activeDrivers.length}
</span>
</div>
{openDefects.slice(0, 4).map((d) => {
const v = vehicles.find((x) => x.id === d.vehicle_id);
return (
<div key={d.id} className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/40 px-3 py-2.5">
<div className="min-w-0">
<p className="truncate text-sm font-medium">{d.title}</p>
<p className="text-xs text-muted-foreground">{v?.plate_number || "Unassigned vehicle"}</p>
</div>
<StatusBadge status={d.severity} />
</div>
);
})}
{!openDefects.length && <p className="py-8 text-center text-sm text-muted-foreground">No open defects ✓</p>}
<p className="text-[11px] text-muted-foreground">Fleet odometer: {formatKm(vehicles.reduce((s, v) => s + (v.odometer || 0), 0))} total</p>
</CardContent>
</Card>
</div>
</div>
);
}
