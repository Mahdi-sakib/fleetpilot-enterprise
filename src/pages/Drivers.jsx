import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/StatusBadge";
import { isLicenseValid } from "@/lib/fleet";
import moment from "moment";
import { Plus, Search, Pencil } from "lucide-react";

const emptyDriver = { full_name: "", email: "", phone: "", license_number: "", license_expiry: "", status: "active", safety_score: 100 };

export default function Drivers() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [drivers, setDrivers] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDriver);
  const [saving, setSaving] = useState(false);

  const load = async () => setDrivers(await api.entities.Driver.list("-created_date", 500));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!drivers) return [];
    const q = search.toLowerCase();
    return drivers.filter((d) => !q || d.full_name?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q) || d.license_number?.toLowerCase().includes(q));
  }, [drivers, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyDriver);
    setOpen(true);
  };

  const openEdit = (driver) => {
    setEditing(driver);
    setForm({ ...emptyDriver, ...driver });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return;
    setSaving(true);
    try {
      const payload = { ...form, safety_score: parseFloat(form.safety_score) || 100 };
      if (editing) {
        await api.entities.Driver.update(editing.id, payload);
      } else {
        await api.entities.Driver.create(payload);
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyDriver);
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!drivers) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
  }

  const avgSafety = drivers.length ? drivers.reduce((s, d) => s + (d.safety_score || 100), 0) / drivers.length : 0;
  const expiring = drivers.filter((d) => d.license_expiry && moment(d.license_expiry).isBefore(moment().add(60, "days")) && moment(d.license_expiry).isAfter(moment()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Drivers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {drivers.length} drivers · avg safety score {avgSafety.toFixed(0)}
            {expiring.length ? ` · ${expiring.length} license(s) expiring soon` : ""}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Add driver
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers…" className="pl-9" />
      </div>

      <Card className="card-glow border-border/60 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead>Driver</TableHead>
              <TableHead className="hidden md:table-cell">License</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Trips</TableHead>
              <TableHead>Safety score</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => {
              const valid = isLicenseValid(d);
              return (
                <TableRow key={d.id} className="border-border/40">
                  <TableCell>
                    <p className="font-semibold text-foreground">{d.full_name}</p>
                    <p className="text-xs text-muted-foreground">{d.email}{d.phone ? ` · ${d.phone}` : ""}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="font-mono text-xs">{d.license_number || "—"}</p>
                    <p className={`text-xs ${valid ? "text-muted-foreground" : "text-red-300"}`}>
                      {d.license_expiry ? `Exp ${moment(d.license_expiry).format("MMM D, YYYY")}` : "No expiry set"}
                      {!valid && d.license_expiry ? " · EXPIRED" : ""}
                    </p>
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell className="hidden font-mono text-sm lg:table-cell">{d.total_trips || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(100, d.safety_score || 100)}%`, background: (d.safety_score || 100) >= 85 ? "#34D399" : (d.safety_score || 100) >= 70 ? "#FBBF24" : "#F87171" }}
                        />
                      </div>
                      <span className="font-mono text-sm font-semibold">{Math.round(d.safety_score || 100)}</span>
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <button type="button" title="Edit" onClick={() => openEdit(d)} className="rounded-md p-1.5 transition-colors hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!filtered.length && <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="py-10 text-center text-muted-foreground">No drivers match your search.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/60 bg-card sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit driver" : "Add driver"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>License number</Label>
                <Input value={form.license_number} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>License expiry</Label>
                <Input type="date" value={form.license_expiry} onChange={(e) => setForm((f) => ({ ...f, license_expiry: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {["active", "suspended", "inactive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add driver"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
