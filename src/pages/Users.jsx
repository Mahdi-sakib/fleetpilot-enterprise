import React, { useEffect, useState } from "react";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminRole, ROLE_OPTIONS, roleLabel } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";

const emptyForm = { email: "", password: "", role: "user", driver_id: "" };

export default function Users() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const isAdmin = isAdminRole(me?.role);

  const [rows, setRows] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // the user row being role-assigned, or null when creating
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [users, driverRows] = await Promise.all([api.auth.listUsers(), api.entities.Driver.list("full_name", 500)]);
    setRows(users);
    setDrivers(driverRows);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdmin) {
    return <div className="py-20 text-center text-muted-foreground">You don&apos;t have access to this page.</div>;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  };

  const openRoleEdit = (row) => {
    setEditing(row);
    setForm({ ...emptyForm, role: row.role === "admin" ? "admin_officer" : row.role, driver_id: row.driver_id || "" });
    setError("");
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editing) {
        const payload = { role: form.role, driver_id: form.role === "driver" ? form.driver_id || null : null };
        await api.auth.updateUserRole(editing.id, payload);
        toast({ title: "Role updated" });
      } else {
        if (form.password.length < 8) return setError("Password must be at least 8 characters");
        const payload = { email: form.email, password: form.password, role: form.role };
        if (form.role === "driver" && form.driver_id) payload.driver_id = form.driver_id;
        await api.auth.createUser(payload);
        toast({ title: "Account created" });
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete the account “${row.email}”? This can't be undone.`)) return;
    await api.auth.deleteUser(row.id);
    toast({ title: "Account deleted" });
    load();
  };

  if (!rows) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create accounts and assign roles.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add user
        </Button>
      </div>

      <Card className="card-glow border-border/60 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="border-border/40">
                <TableCell>{row.email}</TableCell>
                <TableCell><Badge variant={isAdminRole(row.role) ? "default" : "secondary"}>{roleLabel(row.role)}</Badge></TableCell>
                <TableCell>{row.email_verified ? "Yes" : "No"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.created_date ? new Date(row.created_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell>
                  {row.id !== me.id && (
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="Change role" onClick={() => openRoleEdit(row)} className="rounded-md p-1.5 transition-colors hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                      <button type="button" title="Delete" onClick={() => remove(row)} className="rounded-md p-1.5 transition-colors hover:bg-accent">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No users yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/60 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Change role" : "Add user"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {editing ? (
              <div className="space-y-1.5">
                <Label>Account</Label>
                <p className="rounded-md border border-border/60 bg-secondary/30 px-3 py-2 text-sm text-foreground">{editing.email}</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">At least 8 characters. Share this with the person directly.</p>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v, driver_id: v === "driver" ? f.driver_id : "" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.role === "admin_officer" && (
                <p className="text-xs text-muted-foreground">Admin Officer has full access, same as Admin.</p>
              )}
            </div>
            {form.role === "driver" && (
              <div className="space-y-1.5">
                <Label>Link to driver profile</Label>
                <Select value={form.driver_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, driver_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None yet" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="none">None yet</SelectItem>
                    {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Optional — they can also link their own profile from the Driver Portal.</p>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save role" : "Create account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
