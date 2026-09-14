import { api } from "@/api/client";
import moment from "moment";

export const SERVICE_SOON_THRESHOLD_KM = 1500;
export const DEFAULT_SERVICE_INTERVAL_KM = 10000;

export const VEHICLE_STATUSES = ["active", "idle", "maintenance", "retired"];
export const VEHICLE_TYPES = ["van", "box_truck", "semi_truck", "reefer_truck", "sedan", "suv"];
export const FUEL_TYPES = ["diesel", "gasoline", "electric", "hybrid"];
export const DEFECT_SEVERITIES = ["low", "medium", "high", "critical"];
export const WORK_ORDER_TYPES = ["preventive", "repair", "inspection"];
export const WORK_ORDER_PRIORITIES = ["low", "medium", "high", "critical"];

export const formatCurrency = (n, decimals = 0) =>
new Intl.NumberFormat("en-US", { style: "currency", currency: "BDT", currencyDisplay: "narrowSymbol", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n || 0);

export const formatKm = (n) => `${(n || 0).toLocaleString()} km`;

export const kmSinceService = (v) => Math.max(0, (v.odometer || 0) - (v.last_service_odometer || 0));

export const kmToService = (v) =>
(v.service_interval_km || DEFAULT_SERVICE_INTERVAL_KM) - kmSinceService(v);

// "ok" | "due_soon" | "overdue"
export const serviceState = (v) => {
const remaining = kmToService(v);
if (remaining <= 0) return "overdue";
if (remaining <= SERVICE_SOON_THRESHOLD_KM) return "due_soon";
return "ok";
};

export const tripDistance = (t) =>
Math.max(0, (t.end_odometer ?? t.start_odometer ?? 0) - (t.start_odometer || 0));

export const isLicenseValid = (d) => d.license_expiry && moment(d.license_expiry).isAfter(moment());

// Start an assigned trip: marks in_progress, stamps time + odometer.
export async function startTrip(tripId) {
const trip = await api.entities.Trip.get(tripId);
const vehicle = await api.entities.Vehicle.get(trip.vehicle_id);
await api.entities.Trip.update(tripId, {
status: "in_progress",
start_time: new Date().toISOString(),
start_odometer: trip.start_odometer ?? vehicle.odometer ?? 0,
});
if (vehicle.status === "idle") {
await api.entities.Vehicle.update(vehicle.id, { status: "active" });
}
}

// Complete a trip: records distance, rolls vehicle odometer forward,
// and auto-schedules preventive maintenance when the service interval is hit.
export async function completeTrip(tripId, endOdometer) {
const trip = await api.entities.Trip.get(tripId);
const vehicle = await api.entities.Vehicle.get(trip.vehicle_id);
const start = trip.start_odometer ?? vehicle.odometer ?? 0;
const end = Math.max(start, endOdometer || 0);
const distance = end - start;

await api.entities.Trip.update(tripId, {
status: "completed",
end_time: new Date().toISOString(),
end_odometer: end,
distance_km: distance,
});
await api.entities.Vehicle.update(vehicle.id, { odometer: end });

const driver = await api.entities.Driver.get(trip.driver_id);
if (driver) {
await api.entities.Driver.update(driver.id, { total_trips: (driver.total_trips || 0) + 1 });
}

await maybeScheduleService(vehicle, end);
return distance;
}

// Creates a preventive work order if the vehicle crossed its service interval.
// Returns the created work order or null.
export async function maybeScheduleService(vehicle, odometer) {
const interval = vehicle.service_interval_km || DEFAULT_SERVICE_INTERVAL_KM;
const since = (odometer ?? vehicle.odometer ?? 0) - (vehicle.last_service_odometer || 0);
if (since < interval) return null;

const openWOs = await api.entities.WorkOrder.filter({ vehicle_id: vehicle.id, type: "preventive" });
if (openWOs.some((w) => ["open", "in_progress"].includes(w.status))) return null;

return await api.entities.WorkOrder.create({
vehicle_id: vehicle.id,
title: `Preventive service due — ${vehicle.plate_number}`,
type: "preventive",
status: "open",
priority: since >= interval * 1.5 ? "high" : "medium",
odometer_due: odometer ?? vehicle.odometer,
due_date: moment().add(3, "days").format("YYYY-MM-DD"),
notes: `Auto-scheduled at ${formatKm(odometer ?? vehicle.odometer)} — ${formatKm(since)} since last service.`,
});
}

// Fleet-wide scan used by the maintenance console: schedules work for every overdue vehicle.
export async function runFleetServiceScan(vehicles) {
let created = 0;
for (const v of vehicles) {
if (v.status === "retired") continue;
const wo = await maybeScheduleService(v, v.odometer);
if (wo) created += 1;
}
return created;
}

// Complete a work order; for preventive service, resets the vehicle's service baseline.
export async function completeWorkOrder(wo, cost) {
const updates = {
status: "completed",
completed_date: new Date().toISOString(),
cost: cost || 0,
};
await api.entities.WorkOrder.update(wo.id, updates);
const vehicle = await api.entities.Vehicle.get(wo.vehicle_id);
if (vehicle) {
if (wo.type === "preventive") {
await api.entities.Vehicle.update(vehicle.id, {
last_service_odometer: vehicle.odometer || 0,
status: vehicle.status === "maintenance" ? "active" : vehicle.status,
});
} else {
await api.entities.Vehicle.update(vehicle.id, {
status: vehicle.status === "maintenance" ? "active" : vehicle.status,
});
}
}
}
