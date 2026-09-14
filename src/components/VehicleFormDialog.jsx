import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VEHICLE_STATUSES, VEHICLE_TYPES, FUEL_TYPES, DEFAULT_SERVICE_INTERVAL_KM } from "@/lib/fleet";
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

useEffect(() => {
if (open) setForm(vehicle ? { ...empty, ...vehicle } : empty);
}, [open, vehicle]);

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
<Input value={form.location} onChange={(e) => set("location")(e.target.value)} placeholder="Depot — Dhaka Hub" />
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
{VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
</SelectContent>
</Select>
</div>
<div className="space-y-1.5">
<Label>Fuel type</Label>
<Select value={form.fuel_type} onValueChange={set("fuel_type")}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
