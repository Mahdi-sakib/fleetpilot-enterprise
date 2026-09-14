import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEHICLE_STATUSES, DEFAULT_SERVICE_INTERVAL_KM } from "@/lib/fleet";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";

const empty = {
plate_number: "", make: "", model: "", year: new Date().getFullYear(), type: "van",
fuel_type: "diesel", status: "active", odometer: 0, last_service_odometer: 0,
service_interval_km: DEFAULT_SERVICE_INTERVAL_KM, purchase_date: "", purchase_cost: "",
assigned_driver_id: "", location: "",
};

export default function VehicleFormDialog({ open, onOpenChange, vehicle, drivers, onSaved }) {
const { toast } = useToast();
const [form, setForm] = useState(empty);
const [saving, setSaving] = useState(false);
const [vehicleTypes, setVehicleTypes] = useState([]);
const [fuelTypes, setFuelTypes] = useState([]);
const [locations, setLocations] = useState([]);

useEffect(() => {
if (open) {
setForm(vehicle ? { ...empty, ...vehicle } : empty);
// Master data (types/locations) is admin-managed and rarely changes —
// refetching each time the dialog opens keeps it current without needing
// a shared cache.
Promise.all([
api.entities.VehicleType.list("name", 100),
api.entities.FuelType.list("name", 100),
api.entities.Location.list("name", 200),
]).then(([types, fuels, locs]) => {
setVehicleTypes(types);
setFuelTypes(fuels);
setLocations(locs);
});
}
}, [open, vehicle]);

// A vehicle's stored type/fuel_type/location may not match a master entry
// (legacy data, or the row was deleted from Master Data) — keep it in the
// dropdown as its own option instead of silently discarding it. Also dedupes
// by value: Master Data doesn't enforce unique names/codes, but the Select
// itself needs unique values, and two rows with the same name are already
// indistinguishable once stored (it's a name, not an id, on the vehicle).
const withCurrentValue = (list, current, toOption) => {
const seen = new Set();
const options = list.map(toOption).filter((o) => (seen.has(o.value) ? false : seen.add(o.value)));
if (current && !options.some((o) => o.value === current)) {
options.unshift({ value: current, label: `${current} (not in Master Data)` });
}
return options;
};
const typeOptions = withCurrentValue(vehicleTypes, form.type, (t) => ({ value: t.code, label: t.name }));
const fuelOptions = withCurrentValue(fuelTypes, form.fuel_type, (t) => ({ value: t.code, label: t.name }));
const locationOptions = withCurrentValue(locations, form.location, (l) => ({ value: l.name, label: l.name }));

const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v === "" || v === undefined ? "" : v }));

const submit = async (e) => {
e.preventDefault();
if (!form.plate_number || !form.make || !form.model) return;
setSaving(true);
try {
const payload = {
...form,
year: parseInt(form.year) || null,
odometer: parseInt(form.odometer) || 0,
last_service_odometer: parseInt(form.last_service_odometer) || 0,
service_interval_km: parseInt(form.service_interval_km) || DEFAULT_SERVICE_INTERVAL_KM,
purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null,
assigned_driver_id: form.assigned_driver_id || null,
};
delete payload.id;
if (vehicle) {
await api.entities.Vehicle.update(vehicle.id, payload);
toast({ title: "Vehicle updated", description: `${payload.plate_number} saved.` });
} else {
await api.entities.Vehicle.create({ ...payload, fuel_level: 100, current_speed: 0, engine_temp: 0, last_ping: new Date().toISOString() });
toast({ title: "Vehicle added", description: `${payload.plate_number} joined the fleet.` });
}
onOpenChange(false);
onSaved();
} finally {
setSaving(false);
}
};

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="max-h-[90vh] overflow-y-auto border-border/60 bg-card sm:max-w-2xl">
<DialogHeader>
<DialogTitle className="font-heading">{vehicle ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
</DialogHeader>
<form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
<div className="space-y-1.5">
<Label>Plate number *</Label>
<Input required value={form.plate_number} onChange={(e) => set("plate_number")(e.target.value)} placeholder="DHK-11-5021" />
</div>
<div className="space-y-1.5">
<Label>Location</Label>
<Select value={form.location || "none"} onValueChange={(v) => set("location")(v === "none" ? "" : v)}>
<SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
<SelectContent className="bg-popover">
<SelectItem value="none">Unassigned</SelectItem>
{locationOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
</SelectContent>
</Select>
{!locations.length && (
<p className="text-xs text-muted-foreground">No locations yet — add one under Master Data → Locations.</p>
)}
</div>
<div className="space-y-1.5">
<Label>Make *</Label>
<Input required value={form.make} onChange={(e) => set("make")(e.target.value)} placeholder="Mercedes-Benz" />
</div>
<div className="space-y-1.5">
<Label>Model *</Label>
<Input required value={form.model} onChange={(e) => set("model")(e.target.value)} placeholder="Sprinter 2500" />
</div>
<div className="space-y-1.5">
<Label>Year</Label>
<Input type="number" value={form.year} onChange={(e) => set("year")(e.target.value)} />
</div>
<div className="space-y-1.5">
<Label>Type</Label>
<Select value={form.type} onValueChange={set("type")}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{typeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Fuel type</Label>
<Select value={form.fuel_type} onValueChange={set("fuel_type")}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{fuelOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Status</Label>
<Select value={form.status} onValueChange={set("status")}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{VEHICLE_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Odometer (km)</Label>
<Input type="number" value={form.odometer} onChange={(e) => set("odometer")(e.target.value)} />
</div>
<div className="space-y-1.5">
<Label>Assigned driver</Label>
<Select value={form.assigned_driver_id || "none"} onValueChange={(v) => set("assigned_driver_id")(v === "none" ? "" : v)}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
<SelectItem value="none">Unassigned</SelectItem>
{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Last service at (km)</Label>
<Input type="number" value={form.last_service_odometer} onChange={(e) => set("last_service_odometer")(e.target.value)} />
</div>
<div className="space-y-1.5">
<Label>Service interval (km)</Label>
<Input type="number" value={form.service_interval_km} onChange={(e) => set("service_interval_km")(e.target.value)} />
</div>
<div className="space-y-1.5">
<Label>Purchase date</Label>
<Input type="date" value={form.purchase_date || ""} onChange={(e) => set("purchase_date")(e.target.value)} />
</div>
<div className="space-y-1.5">
<Label>Purchase cost (BDT)</Label>
<Input type="number" value={form.purchase_cost || ""} onChange={(e) => set("purchase_cost")(e.target.value)} placeholder="45000" />
</div>
<DialogFooter className="col-span-full pt-2">
<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
<Button type="submit" disabled={saving}>{saving ? "Saving…" : vehicle ? "Save changes" : "Add vehicle"}</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
);
}
