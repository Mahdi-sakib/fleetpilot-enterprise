import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFECT_SEVERITIES } from "@/lib/fleet";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";

export default function DefectFormDialog({ open, onOpenChange, vehicles, fixedDriverId, onSaved }) {
const { toast } = useToast();
const [form, setForm] = useState({ vehicle_id: "", severity: "low", title: "", description: "" });
const [saving, setSaving] = useState(false);

useEffect(() => {
if (open) setForm({ vehicle_id: "", severity: "low", title: "", description: "" });
}, [open]);

const submit = async (e) => {
e.preventDefault();
if (!form.vehicle_id || !form.title) return;
setSaving(true);
try {
const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
await api.entities.DefectReport.create({
vehicle_id: form.vehicle_id,
driver_id: fixedDriverId || vehicle?.assigned_driver_id || null,
report_date: new Date().toISOString(),
severity: form.severity,
title: form.title,
description: form.description || null,
status: "open",
});
// Critical defects pull the vehicle off the road immediately.
if (form.severity === "critical" && vehicle) {
await api.entities.Vehicle.update(vehicle.id, { status: "maintenance" });
}
toast({
title: "Defect report submitted",
description: form.severity === "critical" ? "Vehicle flagged for maintenance — pulled from service." : "Report sent to the maintenance team.",
variant: form.severity === "critical" ? "destructive" : undefined,
});
onOpenChange(false);
onSaved();
} finally {
setSaving(false);
}
};

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="border-border/60 bg-card sm:max-w-lg">
<DialogHeader>
<DialogTitle className="font-heading">Report a defect</DialogTitle>
</DialogHeader>
<form onSubmit={submit} className="space-y-4">
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
<Label>Severity *</Label>
<Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}>
<SelectTrigger><SelectValue /></SelectTrigger>
<SelectContent className="bg-popover">
{DEFECT_SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
</SelectContent>
</Select>
{form.severity === "critical" && (
<p className="text-xs text-red-300">Critical reports immediately pull the vehicle off the road.</p>
)}
</div>
<div className="space-y-1.5">
<Label>Title *</Label>
<Input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Brake pedal feels spongy" />
</div>
<div className="space-y-1.5">
<Label>Description</Label>
<Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="When did it start? What were the conditions?" />
</div>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
<Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit report"}</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
);
}
