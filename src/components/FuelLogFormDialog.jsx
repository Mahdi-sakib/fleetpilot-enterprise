import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/use-toast";

export default function FuelLogFormDialog({ open, onOpenChange, vehicles, fixedDriverId, onSaved }) {
const { toast } = useToast();
const [form, setForm] = useState({ vehicle_id: "", liters: "", cost: "", odometer: "", station: "", receipt_url: "" });
const [uploading, setUploading] = useState(false);
const [saving, setSaving] = useState(false);

useEffect(() => {
if (open) setForm({ vehicle_id: "", liters: "", cost: "", odometer: "", station: "", receipt_url: "" });
}, [open]);

const uploadReceipt = async (file) => {
if (!file) return;
setUploading(true);
try {
const { file_url } = await api.files.uploadPublicFile({ file });
setForm((f) => ({ ...f, receipt_url: file_url }));
toast({ title: "Receipt uploaded" });
} finally {
setUploading(false);
}
};

const submit = async (e) => {
e.preventDefault();
if (!form.vehicle_id || !form.liters || !form.cost) return;
setSaving(true);
try {
const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
await api.entities.FuelLog.create({
vehicle_id: form.vehicle_id,
driver_id: fixedDriverId || vehicle?.assigned_driver_id || null,
log_date: new Date().toISOString(),
liters: parseFloat(form.liters),
cost: parseFloat(form.cost),
odometer: parseInt(form.odometer) || vehicle?.odometer || 0,
station: form.station || null,
receipt_url: form.receipt_url || null,
});
toast({ title: "Fuel logged", description: "Receipt added to fleet fuel records." });
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
<DialogTitle className="font-heading">Log fuel purchase</DialogTitle>
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
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1.5">
<Label>Liters *</Label>
<Input type="number" required min="0" step="0.01" value={form.liters} onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} />
</div>
<div className="space-y-1.5">
<Label>Cost (BDT) *</Label>
<Input type="number" required min="0" step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1.5">
<Label>Odometer (km)</Label>
<Input type="number" min="0" value={form.odometer} onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))} />
</div>
<div className="space-y-1.5">
<Label>Station</Label>
<Input value={form.station} onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))} placeholder="Shell — Tejgaon" />
</div>
</div>
<div className="space-y-1.5">
<Label>Fuel receipt</Label>
<Input type="file" accept="image/*,application/pdf" onChange={(e) => uploadReceipt(e.target.files?.[0])} />
{form.receipt_url && <p className="text-xs text-primary">Receipt attached ✓</p>}
</div>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
<Button type="submit" disabled={saving || uploading}>{uploading ? "Uploading…" : saving ? "Saving…" : "Log fuel"}</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
);
}
