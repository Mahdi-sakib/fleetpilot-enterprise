import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeTrip } from "@/lib/fleet";
import { useToast } from "@/components/ui/use-toast";

// Records the closing odometer for a trip, rolls the vehicle forward and
// triggers automatic preventive-maintenance scheduling.
export default function CompleteTripDialog({ open, onOpenChange, trip, onSaved }) {
const { toast } = useToast();
const [endOdometer, setEndOdometer] = useState("");
const [saving, setSaving] = useState(false);

const min = trip?.start_odometer || 0;

const submit = async (e) => {
e.preventDefault();
const value = parseInt(endOdometer);
if (isNaN(value) || value < min) return;
setSaving(true);
try {
const distance = await completeTrip(trip.id, value);
toast({
title: "Trip completed",
description: `${distance.toLocaleString()} km logged for ${trip.origin || "trip"} → ${trip.destination || "destination"}.`,
});
onOpenChange(false);
setEndOdometer("");
onSaved();
} finally {
setSaving(false);
}
};

return (
<Dialog open={open} onOpenChange={onOpenChange}>
<DialogContent className="border-border/60 bg-card sm:max-w-md">
<DialogHeader>
<DialogTitle className="font-heading">Complete trip</DialogTitle>
</DialogHeader>
<form onSubmit={submit} className="space-y-4">
<p className="text-sm text-muted-foreground">
{trip?.origin || "Origin"} → {trip?.destination || "Destination"} · started at{" "}
<span className="font-mono text-foreground">{min.toLocaleString()} km</span>
</p>
<div className="space-y-1.5">
<Label>Ending odometer (km) *</Label>
<Input
type="number"
required
min={min}
autoFocus
value={endOdometer}
onChange={(e) => setEndOdometer(e.target.value)}
placeholder={min.toLocaleString()}
/>
</div>
<DialogFooter>
<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
<Button type="submit" disabled={saving || endOdometer === ""}>{saving ? "Completing…" : "Complete trip"}</Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
);
}
