"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Package, AlertTriangle, TrendingDown } from "lucide-react";

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

function StockPill({ qty, reorderLevel }: { qty: number; reorderLevel: number }) {
  const isNeg = qty < 0;
  const isLow = !isNeg && reorderLevel > 0 && qty <= reorderLevel;
  return (
    <span
      className="stock-pill"
      style={
        isNeg
          ? { background: "#FEE2E2", color: "#B91C1C" }
          : isLow
          ? { background: "var(--nl-amber-light)", color: "var(--nl-amber-hover)" }
          : { background: "var(--nl-green-light)", color: "var(--nl-green)" }
      }
    >
      {isNeg && "▾ "}
      {isLow && "⚠ "}
      {qty}
    </span>
  );
}

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

  const lowStockCount = variants.filter(v => v.reorderLevel > 0 && v.stockQty <= v.reorderLevel).length;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--nl-text)", margin: 0, letterSpacing: "-0.01em" }}>
            Products
          </h1>
          <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginTop: "3px" }}>
            {loading ? "Loading…" : `${variants.length} variant${variants.length !== 1 ? "s" : ""}`}
            {!loading && lowStockCount > 0 && (
              <span style={{ marginLeft: "10px", color: "var(--nl-amber-hover)", fontWeight: 600 }}>
                <AlertTriangle size={12} style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }} />
                {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-44"
            style={{ fontFamily: "var(--font-body)" }}
          />
          <Button
            onClick={() => { setForm(EMPTY_FORM); setEditTarget(null); setSaveError(""); setShowAdd(true); }}
            size="sm"
            style={{ background: "var(--nl-amber)", color: "#fff", fontFamily: "var(--font-body)", fontWeight: 700 }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--nl-amber-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--nl-amber)")}
          >
            + Add Variant
          </Button>
        </div>
      </div>

      {loadError && (
        <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "8px", fontSize: "13px", color: "#B91C1C" }}>
          {loadError} —{" "}
          <button style={{ textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer" }}
            onClick={() => { setLoading(true); load(); }}>
            retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: "48px" }} />)}
        </div>
      ) : (
        <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: "hsl(var(--muted))" }}>
                <TableHead style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>SKU</TableHead>
                <TableHead style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>Product</TableHead>
                <TableHead style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>Variant</TableHead>
                <TableHead style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>Unit</TableHead>
                <TableHead className="text-right" style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>Stock</TableHead>
                <TableHead className="text-right" style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>Reorder</TableHead>
                <TableHead style={{ fontFamily: "var(--font-body)", fontWeight: 700, fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--nl-text-3)" }}>Aliases</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const isLow = v.reorderLevel > 0 && v.stockQty <= v.reorderLevel;
                return (
                  <TableRow
                    key={v._id}
                    style={{ background: isLow && v.stockQty >= 0 ? "rgba(254,243,199,0.35)" : undefined }}
                  >
                    <TableCell style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "var(--nl-text-3)" }}>{v.sku}</TableCell>
                    <TableCell style={{ fontWeight: 600, color: "var(--nl-text)", fontSize: "13.5px" }}>{v.productName}</TableCell>
                    <TableCell style={{ color: "var(--nl-text-2)", fontSize: "13px" }}>{v.variantLabel}</TableCell>
                    <TableCell style={{ color: "var(--nl-text-3)", fontSize: "13px" }}>{v.unit}</TableCell>
                    <TableCell className="text-right">
                      <StockPill qty={v.stockQty} reorderLevel={v.reorderLevel} />
                    </TableCell>
                    <TableCell className="text-right" style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--nl-text-3)" }}>
                      {v.reorderLevel > 0 ? v.reorderLevel : <span style={{ color: "var(--nl-border)" }}>—</span>}
                    </TableCell>
                    <TableCell>
                      <button
                        style={{
                          fontSize: "12px", fontWeight: 600,
                          color: "var(--nl-green)", background: "none", border: "none",
                          cursor: "pointer", padding: "3px 8px", borderRadius: "5px",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--nl-green-light)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        onClick={() => setAliasTarget(v)}
                      >
                        {v.aliases?.length ?? 0} alias{(v.aliases?.length ?? 0) !== 1 ? "es" : ""}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <Button
                          variant="ghost" size="sm"
                          style={{ height: "28px", padding: "0 10px", fontSize: "12px", color: "var(--nl-text-2)" }}
                          onClick={() => {
                            setForm({ productName: v.productName, variantLabel: v.variantLabel, unit: v.unit, stockQty: v.stockQty, reorderLevel: v.reorderLevel });
                            setEditTarget(v); setSaveError(""); setShowAdd(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Link href={`/ledger?variantId=${v._id}`}>
                          <Button variant="ghost" size="sm" style={{ height: "28px", padding: "0 10px", fontSize: "12px", color: "var(--nl-green)" }}>
                            History
                          </Button>
                        </Link>
                        <Button
                          variant="ghost" size="sm"
                          style={{ height: "28px", padding: "0 10px", fontSize: "12px", color: "#B91C1C" }}
                          onClick={() => archive(v._id)}
                        >
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--nl-text-3)" }}>
                      <Package size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--nl-text-2)", marginBottom: "4px" }}>
                        {search ? "No matches found" : "No products yet"}
                      </p>
                      <p style={{ fontSize: "13px" }}>
                        {search ? `No variants match "${search}"` : "Add your first product variant to get started."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditTarget(null); setSaveError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              {editTarget ? "Edit Variant" : "Add Variant"}
            </DialogTitle>
          </DialogHeader>
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
            <Button
              onClick={save}
              disabled={saving}
              style={{ background: "var(--nl-amber)", color: "#fff" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--nl-amber-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--nl-amber)")}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alias dialog */}
      <Dialog open={!!aliasTarget} onOpenChange={(o) => { if (!o) setAliasTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "var(--font-display)" }}>
              Aliases — {aliasTarget?.nameCanonical}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add alias spelling…"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAlias()}
              />
              <Button size="sm" onClick={addAlias} style={{ background: "var(--nl-amber)", color: "#fff" }}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {aliasTarget?.aliases?.map((a) => (
                <span
                  key={a.key}
                  onClick={() => removeAlias(aliasTarget._id, a.key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))",
                    color: "var(--nl-text-2)", fontSize: "12px", fontWeight: 600,
                    padding: "3px 10px", borderRadius: "999px", cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FEE2E2")}
                  onMouseLeave={e => (e.currentTarget.style.background = "hsl(var(--muted))")}
                >
                  {a.raw} <span style={{ opacity: 0.5 }}>✕</span>
                </span>
              ))}
              {!aliasTarget?.aliases?.length && (
                <p style={{ fontSize: "13px", color: "var(--nl-text-3)" }}>No aliases yet.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
