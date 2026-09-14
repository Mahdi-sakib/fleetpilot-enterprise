import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import FuelLogFormDialog from "@/components/FuelLogFormDialog";
import DefectFormDialog from "@/components/DefectFormDialog";
import CompleteTripDialog from "@/components/CompleteTripDialog";
import { startTrip, isLicenseValid } from "@/lib/fleet";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";
import { Fuel, AlertTriangle, Play, CheckCircle2, ClipboardList, Link2 } from "lucide-react";

export default function DriverPortal() {
const { toast } = useToast();
const [drivers, setDrivers] = useState(null);
const [me, setMe] = useState(null);
const [trips, setTrips] = useState([]);
const [vehicles, setVehicles] = useState([]);
const [linking, setLinking] = useState(false);
const [fuelOpen, setFuelOpen] = useState(false);
const [defectOpen, setDefectOpen] = useState(false);
const [completing, setCompleting] = useState(null);

const load = async () => {
const [meRes, driversRes] = await Promise.all([
api.auth.me().catch(() => null),
api.entities.Driver.list("-created_date", 500),
]);
setMe(meRes);
setDrivers(driversRes);
if (meRes) {
const driver =
driversRes.find((d) => d.id === meRes.driver_id) ||
driversRes.find((d) => d.email?.toLowerCase() === meRes.email?.toLowerCase());
if (driver) {
const [t, v] = await Promise.all([
api.entities.Trip.filter({ driver_id: driver.id }),
api.entities.Vehicle.list("-created_date", 500),
]);
setTrips(t);
setVehicles(v);
setDriver(driver);
}
}
};

const [driver, setDriver] = useState(null);

useEffect(() => { load(); }, []);

const linkProfile = async (driverId) => {
setLinking(true);
try {
await api.auth.updateMe({ driver_id: driverId });
toast({ title: "Profile linked", description: "Your driver portal is ready." });
await load();
} finally {
setLinking(false);
}
};

const start = async (trip) => {
await startTrip(trip.id);
toast({ title: "Trip started", description: "Drive safe — telemetry is live." });
load();
};

if (drivers === null) {
return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
}

// No linked driver profile yet — link-up screen.
if (me && !driver) {
return (
<div className="space-y-6">
<h1 className="font-heading text-3xl font-bold tracking-tight">Driver Portal</h1>
<Card className="card-glow border-border/60 bg-card/60">
<CardHeader>
<CardTitle className="flex items-center gap-2 font-heading">
<Link2 className="h-5 w-5 text-primary" /> Link your driver profile
</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<p className="text-sm text-muted-foreground">
Signed in as <span className="text-foreground">{me.email}</span>. Pick your driver profile below to activate the portal —
you&apos;ll see assignments, log trips, fuel and defects here.
</p>
{drivers.length ? (
<div className="grid gap-2 sm:grid-cols-2">
{drivers.map((d) => (
<button
key={d.id}
onClick={() => linkProfile(d.id)}
disabled={linking}
className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/40 px-4 py-3 text-left transition-colors hover:border-primary/40 disabled:opacity-50"
>
<div>
<p className="font-semibold">{d.full_name}</p>
<p className="text-xs text-muted-foreground">{d.email}</p>
</div>
<span className="text-xs text-primary">Link →</span>
</button>
))}
</div>
) : (
<p className="text-sm text-muted-foreground">No driver profiles exist yet — ask a fleet manager to add you under Drivers.</p>
)}
</CardContent>
</Card>
</div>
);
}

if (!me) {
return <div className="py-20 text-center text-muted-foreground">Sign in to use the driver portal.</div>;
}

const activeTrips = trips.filter((t) => t.status !== "completed");
const completedTrips = trips.filter((t) => t.status === "completed");
const myVehicleIds = [...new Set(trips.map((t) => t.vehicle_id))];
const portalVehicles = vehicles.filter((v) => myVehicleIds.includes(v.id) || v.assigned_driver_id === driver.id);

return (
<div className="space-y-6">
<div className="flex flex-wrap items-end justify-between gap-4">
<div>
<h1 className="font-heading text-3xl font-bold tracking-tight">Driver Portal</h1>
<p className="mt-1 text-sm text-muted-foreground">
Welcome back, {driver.full_name} · safety score {Math.round(driver.safety_score || 100)}
{!isLicenseValid(driver) && driver.license_expiry && <span className="text-red-300"> · license expired</span>}
</p>
</div>
<div className="flex gap-2">
<Button variant="outline" onClick={() => setFuelOpen(true)}><Fuel className="mr-2 h-4 w-4" /> Log fuel</Button>
<Button onClick={() => setDefectOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<AlertTriangle className="mr-2 h-4 w-4" /> Report defect
</Button>
</div>
</div>

<Card className="card-glow border-border/60 bg-card/60">
<CardHeader className="pb-2">
<CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
<ClipboardList className="h-4 w-4 text-primary" /> My assignments
</CardTitle>
</CardHeader>
<CardContent className="space-y-3">
{activeTrips.map((t) => {
const vehicle = vehicles.find((v) => v.id === t.vehicle_id);
return (
<div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/50 bg-secondary/40 px-4 py-3.5">
<div>
<p className="font-medium">
{t.origin || "Depot"} <span className="text-muted-foreground">→</span> {t.destination || "Destination"}
</p>
<p className="text-xs text-muted-foreground">
{vehicle ? `${vehicle.plate_number} · ${vehicle.make} ${vehicle.model}` : ""}
{t.start_time ? ` · started ${moment(t.start_time).format("HH:mm")}` : ""}
</p>
</div>
<div className="flex items-center gap-3">
<StatusBadge status={t.status} />
{t.status === "assigned" && (
<Button size="sm" variant="outline" onClick={() => start(t)}><Play className="mr-1.5 h-3.5 w-3.5" /> Start trip</Button>
)}
{t.status === "in_progress" && (
<Button size="sm" onClick={() => setCompleting(t)} className="bg-primary text-primary-foreground hover:bg-primary/90">
<CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> End trip
</Button>
)}
</div>
</div>
);
})}
{!activeTrips.length && (
<p className="py-6 text-center text-sm text-muted-foreground">
No active assignments. New dispatches appear here instantly.
</p>
)}
</CardContent>
</Card>

<Card className="card-glow border-border/60 bg-card/60">
<CardHeader className="pb-2">
<CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Recent completed trips</CardTitle>
</CardHeader>
<CardContent className="space-y-2">
{completedTrips.slice(0, 5).map((t) => (
<div key={t.id} className="flex items-center justify-between rounded-md border border-border/40 px-4 py-2.5 text-sm">
<span>{t.origin || "—"} <span className="text-muted-foreground">→</span> {t.destination || "—"}</span>
<span className="text-muted-foreground">
{t.end_time ? moment(t.end_time).format("MMM D") : ""} · {Math.round(t.distance_km || 0).toLocaleString()} km
</span>
</div>
))}
{!completedTrips.length && <p className="py-4 text-center text-sm text-muted-foreground">No completed trips yet.</p>}
</CardContent>
</Card>

<FuelLogFormDialog open={fuelOpen} onOpenChange={setFuelOpen} vehicles={portalVehicles.length ? portalVehicles : vehicles} fixedDriverId={driver.id} onSaved={load} />
<DefectFormDialog open={defectOpen} onOpenChange={setDefectOpen} vehicles={portalVehicles.length ? portalVehicles : vehicles} fixedDriverId={driver.id} onSaved={load} />
<CompleteTripDialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)} trip={completing} onSaved={load} />
</div>
);
}
