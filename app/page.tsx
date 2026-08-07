"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface Variant {
  _id: string;
  sku: string;
  productName: string;
  variantLabel: string;
  nameCanonical: string;
  unit: string;
  stockQty: number;
  reorderLevel: number;
  aliases: { raw: string; key: string }[];
}

const EMPTY_FORM = { productName: "", variantLabel: "", unit: "unit", stockQty: 0, reorderLevel: 0 };

export default function ProductsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Variant | null>(null);
  const [aliasTarget, setAliasTarget] = useState<Variant | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newAlias, setNewAlias] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function load() {
    setLoadError("");
    try {
      const res = await fetch("/api/variants");
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const fresh: Variant[] = await res.json();
      setVariants(fresh);
      return fresh;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load variants");
      return [] as Variant[];
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      let res: Response;
      if (editTarget) {
        res = await fetch(`/api/variants/${editTarget._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch("/api/variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error || "Save failed");
        return;
      }
      setShowAdd(false);
      setEditTarget(null);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string) {
    if (!confirm("Archive this variant?")) return;
    await fetch(`/api/variants/${id}`, { method: "DELETE" });
    load();
  }

  async function addAlias() {
    if (!newAlias.trim() || !aliasTarget) return;
    const targetId = aliasTarget._id;
    await fetch(`/api/variants/${targetId}/aliases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: newAlias.trim() }),
    });
    setNewAlias("");
    const fresh = await load();
    setAliasTarget(fresh?.find((v) => v._id === targetId) ?? null);
  }

  async function removeAlias(variantId: string, key: string) {
    await fetch(`/api/variants/${variantId}/aliases`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const fresh = await load();
    setAliasTarget(fresh?.find((v) => v._id === variantId) ?? null);
  }

  const filtered = variants.filter(
    (v) =>
      v.productName.toLowerCase().includes(search.toLowerCase()) ||
      v.variantLabel.toLowerCase().includes(search.toLowerCase()) ||
      v.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Button onClick={() => { setForm(EMPTY_FORM); setEditTarget(null); setSaveError(""); setShowAdd(true); }} size="sm">
            + Add Variant
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {loadError} — <button className="underline" onClick={() => { setLoading(true); load(); }}>retry</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead>Aliases</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => (
              <TableRow key={v._id} className={v.stockQty <= v.reorderLevel && v.reorderLevel > 0 ? "bg-red-50" : ""}>
                <TableCell className="text-xs text-gray-400">{v.sku}</TableCell>
                <TableCell className="font-medium">{v.productName}</TableCell>
                <TableCell>{v.variantLabel}</TableCell>
                <TableCell className="text-gray-500">{v.unit}</TableCell>
                <TableCell className="text-right font-mono">
                  <span className={v.stockQty < 0 ? "text-red-600 font-bold" : ""}>{v.stockQty}</span>
                </TableCell>
                <TableCell className="text-right text-gray-400">{v.reorderLevel}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="text-xs text-blue-600 h-6 px-2"
                    onClick={() => setAliasTarget(v)}>
                    {v.aliases?.length ?? 0} alias{(v.aliases?.length ?? 0) !== 1 ? "es" : ""}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                      onClick={() => {
                        setForm({ productName: v.productName, variantLabel: v.variantLabel, unit: v.unit, stockQty: v.stockQty, reorderLevel: v.reorderLevel });
                        setEditTarget(v);
                        setSaveError("");
                        setShowAdd(true);
                      }}>
                      Edit
                    </Button>
                    <Link href={`/ledger?variantId=${v._id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-600">
                        History
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500"
                      onClick={() => archive(v._id)}>
                      Archive
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No variants found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditTarget(null); setSaveError(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editTarget ? "Edit Variant" : "Add Variant"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            {(["productName", "variantLabel", "unit"] as const).map((f) => (
              <div key={f}>
                <Label className="capitalize text-xs mb-1">{f.replace(/([A-Z])/g, " $1")}</Label>
                <Input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {(["stockQty", "reorderLevel"] as const).map((f) => (
                <div key={f}>
                  <Label className="capitalize text-xs mb-1">{f.replace(/([A-Z])/g, " $1")}</Label>
                  <Input type="number" value={form[f]}
                    onChange={(e) => setForm({ ...form, [f]: parseFloat(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditTarget(null); setSaveError(""); }}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aliasTarget} onOpenChange={(o) => { if (!o) setAliasTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aliases — {aliasTarget?.nameCanonical}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input placeholder="Add alias spelling…" value={newAlias} onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAlias()} />
              <Button size="sm" onClick={addAlias}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {aliasTarget?.aliases?.map((a) => (
                <Badge key={a.key} variant="secondary" className="gap-1 cursor-pointer"
                  onClick={() => removeAlias(aliasTarget._id, a.key)}>
                  {a.raw} ✕
                </Badge>
              ))}
              {!aliasTarget?.aliases?.length && <p className="text-xs text-gray-400">No aliases yet.</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
