import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { getMasterConfig } from "@/lib/masterData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

const emptyForm = (config) => {
  const form = {};
  for (const field of config.fields) form[field.key] = field.default ?? "";
  return form;
};

export default function MasterData() {
  const { type } = useParams();
  const config = getMasterConfig(type);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!config) return;
    setRows(await api.entities[config.entity].list("name", 500));
  };

  useEffect(() => {
    setRows(null);
    setSearch("");
    if (config) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => Object.values(row).some((v) => typeof v === "string" && v.toLowerCase().includes(q)));
  }, [rows, search]);

  if (!config) {
    return <div className="py-20 text-center text-muted-foreground">Unknown master data type “{type}”.</div>;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(config));
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...emptyForm(config), ...row });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = config.fields.find((f) => f.required && !String(form[f.key] || "").trim());
    if (missing) return;
    setSaving(true);
    try {
      const payload = {};
      for (const field of config.fields) payload[field.key] = form[field.key] || null;
      if (editing) {
        await api.entities[config.entity].update(editing.id, payload);
        toast({ title: `${config.singular} updated` });
      } else {
        await api.entities[config.entity].create(payload);
        toast({ title: `${config.singular} added` });
      }
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete “${row.name}”? This can't be undone.`)) return;
    await api.entities[config.entity].delete(row.id);
    toast({ title: `${config.singular} deleted` });
    load();
  };

  if (!rows) {
    return <div className="flex h-[60vh] items-center justify-center"><div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" /></div>;
  }

  const colSpan = config.columns.length + (isAdmin ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">{config.label}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Add {config.singular.toLowerCase()}
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${config.label.toLowerCase()}…`} className="pl-9" />
      </div>

      <Card className="card-glow border-border/60 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              {config.columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
              {isAdmin && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id} className="border-border/40">
                {config.columns.map((c) => (
                  <TableCell key={c.key} className={c.mono ? "font-mono text-sm" : ""}>
                    {(c.format ? c.format(row[c.key]) : row[c.key]) || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                ))}
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="Edit" onClick={() => openEdit(row)} className="rounded-md p-1.5 transition-colors hover:bg-accent">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                      </button>
                      <button type="button" title="Delete" onClick={() => remove(row)} className="rounded-md p-1.5 transition-colors hover:bg-accent">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow><TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">No {config.label.toLowerCase()} yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border/60 bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editing ? `Edit ${config.singular.toLowerCase()}` : `Add ${config.singular.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}{field.required ? " *" : ""}</Label>
                {field.type === "select" ? (
                  <Select value={form[field.key] || field.default} onValueChange={(v) => setForm((f) => ({ ...f, [field.key]: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {field.options.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea
                    rows={3}
                    value={form[field.key] || ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <Input
                    required={field.required}
                    value={form[field.key] || ""}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                )}
                {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : `Add ${config.singular.toLowerCase()}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
