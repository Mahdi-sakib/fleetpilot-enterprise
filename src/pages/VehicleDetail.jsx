import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import StatusRing from "@/components/StatusRing";
import VehicleFormDialog from "@/components/VehicleFormDialog";
import FuelLogFormDialog from "@/components/FuelLogFormDialog";
import DefectFormDialog from "@/components/DefectFormDialog";
import {
  serviceState, kmSinceService, kmToService, formatCurrency, formatKm, tripDistance,
} from "@/lib/fleet";
import moment from "moment";
import { ArrowLeft, Pencil, Fuel, AlertTriangle, Plus } from "lucide-react";

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [vehicle, setVehicle] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [defects, setDefects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [defectOpen, setDefectOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = async () => {
    try {
      const v = await api.entities.Vehicle.get(id);
      setVehicle(v);
      const [d, t, f, df, w] = await Promise.all([
        api.entities.Driver.list("-created_date", 500),
        api.entities.Trip.filter({ vehicle_id: id }),
        api.entities.FuelLog.filter({ vehicle_id: id }),
        api.entities.DefectReport.filter({ vehicle_id: id }),
        api.entities.WorkOrder.filter({ vehicle_id: id }),
      ]);
      setDrivers(d);
      setTrips(t.reverse());
      setFuelLogs(f.reverse());
      setDefects(df.reverse());
      setWorkOrders(w.reverse());
    } catch {
      setNotFound(true);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (notFound) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-muted-foreground">Vehicle not found.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/vehicles"><ArrowLeft className="mr-2 h-4 w-4" /> Back to vehicles</Link></Button>
      </div>
    );
  }
  if (!vehicle) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
  }

  const driver = drivers.find((d) => d.id === vehicle.assigned_driver_id);
  const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.cost || 0), 0);
  const totalMaintCost = workOrders.reduce((s, w) => s + (w.cost || 0), 0);
  const totalKm = vehicle.odometer || 0;
  const costPerKm = totalKm ? (totalFuelCost + totalMaintCost) / totalKm : 0;
  const fuelEfficiency = (() => {
    const liters = fuelLogs.reduce((s, f) => s + (f.liters || 0), 0);
    const km = trips.reduce((s, t) => s + (t.distance_km || 0), 0);
    return liters && km ? km / liters : 0;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/vehicles" className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Vehicles
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight font-mono">{vehicle.plate_number}</h1>
            <StatusBadge status={vehicle.status} />
            <StatusBadge status={serviceState(vehicle)} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle.year} {vehicle.make} {vehicle.model} · {(vehicle.type || "").replace(/_/g, " ")} · {vehicle.fuel_type}
            {vehicle.location ? ` · ${vehicle.location}` : ""}
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit / assign
          </Button>
        )}
      </div>

      {/* Telemetry + TCO */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="card-glow border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Live telemetry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <StatusRing value={vehicle.fuel_level ?? 0} label="Fuel" sublabel="%" size={92} color="#45A29E" />
              <StatusRing value={vehicle.engine_temp ?? 0} max={130} label="Engine" sublabel="°C" size={92} color={(vehicle.engine_temp ?? 0) > 105 ? "#F87171" : "#38BDF8"} />
              <StatusRing value={vehicle.current_speed ?? 0} max={120} label="Speed" sublabel="km/h" size={92} color="#A78BFA" />
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Last ping {vehicle.last_ping ? moment(vehicle.last_ping).fromNow() : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="card-glow border-border/60 bg-card/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Service tracker</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Since last service</span>
                <span>{formatKm(kmSinceService(vehicle))} / {formatKm(vehicle.service_interval_km)}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (kmSinceService(vehicle) / (vehicle.service_interval_km || 10000)) * 100)}%`,
                    background: serviceState(vehicle) === "overdue" ? "#F87171" : serviceState(vehicle) === "due_soon" ? "#FBBF24" : "#45A29E",
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-secondary/50 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Odometer</p>
                <p className="font-mono text-lg font-semibold">{formatKm(vehicle.odometer)}</p>
              </div>
              <div className="rounded-md bg-secondary/50 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Km to service</p>
                <p className="font-mono text-lg font-semibold">{formatKm(Math.max(0, kmToService(vehicle)))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glow border-border/60 bg-card/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Total cost of ownership</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 pt-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Purchase price</span><span className="font-semibold">{formatCurrency(vehicle.purchase_cost)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lifetime fuel</span><span className="font-semibold">{formatCurrency(totalFuelCost)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lifetime maintenance</span><span className="font-semibold">{formatCurrency(totalMaintCost)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Operating cost / km</span><span className="font-semibold text-primary">{formatCurrency(costPerKm, 2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Efficiency</span><span className="font-semibold">{fuelEfficiency ? `${fuelEfficiency.toFixed(1)} km/L` : "—"}</span></div>
            <div className="flex justify-between border-t border-border/40 pt-2.5 text-sm">
              <span className="text-muted-foreground">Assigned driver</span>
              <span className="font-semibold">{driver?.full_name || "Unassigned"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History tabs */}
      <Card className="card-glow border-border/60 bg-card/60">
        <CardContent className="pt-6">
          <Tabs defaultValue="trips">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList className="bg-secondary/70">
                <TabsTrigger value="trips">Trips ({trips.length})</TabsTrigger>
                <TabsTrigger value="fuel">Fuel ({fuelLogs.length})</TabsTrigger>
                <TabsTrigger value="maintenance">Work orders ({workOrders.length})</TabsTrigger>
                <TabsTrigger value="defects">Defects ({defects.length})</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setFuelOpen(true)}><Fuel className="mr-1.5 h-4 w-4" /> Log fuel</Button>
                <Button size="sm" variant="outline" onClick={() => setDefectOpen(true)}><AlertTriangle className="mr-1.5 h-4 w-4" /> Report defect</Button>
              </div>
            </div>

            <TabsContent value="trips">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Route</TableHead><TableHead className="hidden sm:table-cell">Driver</TableHead><TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">When</TableHead><TableHead className="text-right">Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t) => (
                    <TableRow key={t.id} className="border-border/40">
                      <TableCell><span className="text-sm">{t.origin || "—"} <span className="text-muted-foreground">→</span> {t.destination || "—"}</span></TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{drivers.find((d) => d.id === t.driver_id)?.full_name || "—"}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{t.start_time ? moment(t.start_time).format("MMM D, HH:mm") : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{t.status === "completed" ? formatKm(tripDistance(t)) : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!trips.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No trips recorded yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="fuel">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Date</TableHead><TableHead className="text-right">Liters</TableHead><TableHead className="text-right">Cost</TableHead>
                    <TableHead className="hidden md:table-cell">Odometer</TableHead><TableHead className="hidden sm:table-cell">Station</TableHead><TableHead>Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelLogs.map((f) => (
                    <TableRow key={f.id} className="border-border/40">
                      <TableCell className="text-sm">{moment(f.log_date).format("MMM D, YYYY")}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{f.liters}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(f.cost)}</TableCell>
                      <TableCell className="hidden font-mono text-sm text-muted-foreground md:table-cell">{f.odometer?.toLocaleString() || "—"}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{f.station || "—"}</TableCell>
                      <TableCell>{f.receipt_url ? <a href={f.receipt_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))}
                  {!fuelLogs.length && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No fuel logs yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="maintenance">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Work order</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Due</TableHead><TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workOrders.map((w) => (
                    <TableRow key={w.id} className="border-border/40">
                      <TableCell><span className="text-sm font-medium">{w.title}</span></TableCell>
                      <TableCell><StatusBadge status={w.type} /></TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{w.due_date || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{w.cost ? formatCurrency(w.cost) : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!workOrders.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No work orders yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="defects">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Report</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead><TableHead className="hidden sm:table-cell">Driver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defects.map((d) => (
                    <TableRow key={d.id} className="border-border/40">
                      <TableCell>
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className="max-w-md truncate text-xs text-muted-foreground">{d.description || ""}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={d.severity} /></TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{moment(d.report_date).format("MMM D")}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{drivers.find((x) => x.id === d.driver_id)?.full_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!defects.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No defects reported. <Plus className="inline h-3 w-3" /> Nice.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <VehicleFormDialog open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} drivers={drivers} onSaved={load} />
      <FuelLogFormDialog open={fuelOpen} onOpenChange={setFuelOpen} vehicles={[vehicle]} onSaved={load} />
      <DefectFormDialog open={defectOpen} onOpenChange={setDefectOpen} vehicles={[vehicle]} onSaved={load} />
    </div>
  );
}
