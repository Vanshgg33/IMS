"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, AlertTriangle, PackageX, Boxes, Search, MapPin } from "lucide-react";

const STORES = ["raipur", "bhilai", "rajnandgaon"] as const;
type Store = typeof STORES[number];
const STORE_LABEL: Record<Store, string> = { raipur: "Raipur", bhilai: "Bhilai", rajnandgaon: "Rajnandgaon" };

interface Variant {
  _id: string;
  sku: string;
  productName: string;
  variantLabel: string;
  nameCanonical: string;
  unit: string;
  stock: { raipur: number; bhilai: number; rajnandgaon: number };
  reorderLevel: number;
  aliases: { raw: string; key: string }[];
}

const EMPTY_FORM = {
  productName: "", variantLabel: "", unit: "unit",
  stock: { raipur: 0, bhilai: 0, rajnandgaon: 0 },
  reorderLevel: 0,
};

const TH: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 700,
  fontSize: "10.5px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--nl-text-3)",
  padding: "11px 16px",
};

function StockPill({ qty, reorderLevel }: { qty: number; reorderLevel: number }) {
  const isNeg = qty < 0;
  const isOut = qty === 0;
  const isLow = !isNeg && !isOut && reorderLevel > 0 && qty <= reorderLevel;
  return (
    <span
      className="stock-pill"
      style={
        isNeg || isOut
          ? { background: "#FEE2E2", color: "#B91C1C" }
          : isLow
          ? { background: "var(--nl-amber-light)", color: "var(--nl-amber-hover)" }
          : { background: "var(--nl-green-light)", color: "var(--nl-green)" }
      }
    >
      {(isNeg || isOut) && "▾ "}
      {isLow && "⚠ "}
      {qty}
    </span>
  );
}

function StatCard({
  icon, label, value, iconBg, iconColor, delay, accent, onClick, active,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  iconBg: string;
  iconColor: string;
  delay: string;
  accent?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className="fade-up"
      onClick={onClick}
      style={{
        animationDelay: delay,
        background: active ? iconColor + "0f" : "#fff",
        border: active
          ? `2px solid ${iconColor}`
          : `1px solid ${accent ? iconColor + "33" : "var(--nl-border)"}`,
        borderRadius: "14px",
        padding: active ? "17px 19px" : "18px 20px",
        boxShadow: accent
          ? `0 2px 12px ${iconColor}18, var(--shadow)`
          : "var(--shadow)",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border 0.15s, background 0.15s, box-shadow 0.15s",
      }}
    >
      {accent && !active && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: "80px", height: "80px",
          background: `radial-gradient(circle at top right, ${iconColor}12 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}
      <div style={{
        width: "40px", height: "40px", borderRadius: "10px",
        background: active ? iconColor + "22" : iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          fontFamily: "var(--font-display)",
          fontSize: "26px", fontWeight: 700, lineHeight: 1.1,
          color: "var(--nl-text)", margin: 0,
        }}>
          {value}
        </p>
        <p style={{
          fontSize: "10.5px", fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          color: "var(--nl-text-3)", marginTop: "5px",
        }}>
          {label}
        </p>
      </div>
      {active && (
        <span style={{
          position: "absolute", top: "8px", right: "10px",
          fontSize: "10px", fontWeight: 700, color: iconColor,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          Filtered ✕
        </span>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedStore, setSelectedStore] = useState<Store>("raipur");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Variant | null>(null);
  const [aliasTarget, setAliasTarget] = useState<Variant | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newAlias, setNewAlias] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
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

  const filtered = variants.filter((v) => {
    const q = v.stock?.[selectedStore] ?? 0;
    if (stockFilter === "out" && q > 0) return false;
    if (stockFilter === "low" && !(v.reorderLevel > 0 && q <= v.reorderLevel && q > 0)) return false;
    const s = search.toLowerCase();
    return !s || v.productName.toLowerCase().includes(s) || v.variantLabel.toLowerCase().includes(s) || v.sku.toLowerCase().includes(s);
  });

  const storeTotal = variants.reduce((sum, v) => sum + Math.max(0, v.stock?.[selectedStore] ?? 0), 0);
  const lowStockCount = variants.filter(v => v.reorderLevel > 0 && (v.stock?.[selectedStore] ?? 0) <= v.reorderLevel && (v.stock?.[selectedStore] ?? 0) > 0).length;
  const outOfStockCount = variants.filter(v => (v.stock?.[selectedStore] ?? 0) <= 0).length;

  return (
    <div style={{ maxWidth: "1200px" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <MapPin size={13} color="var(--nl-amber)" />
            <span style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--nl-amber)",
              fontFamily: "var(--font-body)",
            }}>
              {STORE_LABEL[selectedStore]} Store
            </span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700,
            color: "var(--nl-text)", margin: 0, letterSpacing: "-0.01em",
          }}>
            Inventory Dashboard
          </h1>
          <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginTop: "4px" }}>
            {loading ? "Loading…" : `${variants.length} SKU${variants.length !== 1 ? "s" : ""} tracked across all stores`}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Select value={selectedStore} onValueChange={(v) => setSelectedStore(v as Store)}>
            <SelectTrigger className="w-36" style={{ fontFamily: "var(--font-body)", fontSize: "13px" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="item-aligned">
              {STORES.map(s => <SelectItem key={s} value={s}>{STORE_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            onClick={() => { setForm(EMPTY_FORM); setEditTarget(null); setSaveError(""); setShowAdd(true); }}
            size="sm"
            style={{ background: "var(--nl-amber)", color: "#fff", fontFamily: "var(--font-body)", fontWeight: 700, gap: "4px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--nl-amber-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--nl-amber)")}
          >
            + Add Variant
          </Button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: "88px", borderRadius: "14px" }} />)
        ) : (
          <>
            <StatCard
              delay="0ms"
              icon={<Boxes size={19} color="var(--nl-green)" />}
              label="Total SKUs"
              value={variants.length}
              iconBg="var(--nl-green-light)"
              iconColor="var(--nl-green)"
            />
            <StatCard
              delay="50ms"
              icon={<Package size={19} color="#1D4ED8" />}
              label={`${STORE_LABEL[selectedStore]} Units`}
              value={storeTotal.toLocaleString("en-IN")}
              iconBg="#EFF6FF"
              iconColor="#1D4ED8"
            />
            <StatCard
              delay="100ms"
              icon={<AlertTriangle size={19} color="#92400E" />}
              label="Low Stock"
              value={lowStockCount}
              iconBg="#FEF3C7"
              iconColor="#B45309"
              accent={lowStockCount > 0}
              active={stockFilter === "low"}
              onClick={stockFilter === "low" || lowStockCount > 0 ? () => setStockFilter(f => f === "low" ? "all" : "low") : undefined}
            />
            <StatCard
              delay="150ms"
              icon={<PackageX size={19} color="#B91C1C" />}
              label="Out of Stock"
              value={outOfStockCount}
              iconBg="#FEE2E2"
              iconColor="#EF4444"
              accent={outOfStockCount > 0}
              active={stockFilter === "out"}
              onClick={stockFilter === "out" || outOfStockCount > 0 ? () => setStockFilter(f => f === "out" ? "all" : "out") : undefined}
            />
          </>
        )}
      </div>

      {/* ── Error banner ── */}
      {loadError && (
        <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#FEE2E2", border: "1px solid #FECACA", borderRadius: "10px", fontSize: "13px", color: "#B91C1C", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={14} />
          {loadError} —{" "}
          <button style={{ textDecoration: "underline", background: "none", border: "none", color: "inherit", cursor: "pointer" }}
            onClick={() => { setLoading(true); load(); }}>
            retry
          </button>
        </div>
      )}

      {/* ── Products table card ── */}
      <div style={{ background: "#fff", border: "1px solid var(--nl-border)", borderRadius: "16px", overflow: "hidden", boxShadow: "var(--shadow)" }}>

        {/* Toolbar */}
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--nl-border)",
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--nl-cream)",
        }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "300px" }}>
            <Search size={13} color="var(--nl-text-3)" style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <Input
              placeholder="Search SKU, product, variant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: "32px", fontFamily: "var(--font-body)",
                fontSize: "13px", border: "1px solid var(--nl-border)",
                background: "#fff", borderRadius: "8px",
              }}
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ fontSize: "12px", color: "var(--nl-text-3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear
            </button>
          )}
          {stockFilter !== "all" && (
            <button
              onClick={() => setStockFilter("all")}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer",
                borderRadius: "6px", padding: "3px 10px",
                background: stockFilter === "out" ? "#FEE2E2" : "var(--nl-amber-light)",
                color: stockFilter === "out" ? "#B91C1C" : "var(--nl-amber-hover)",
              }}
            >
              {stockFilter === "out" ? <PackageX size={11} /> : <AlertTriangle size={11} />}
              {stockFilter === "out" ? "Out of Stock" : "Low Stock"}
              <span style={{ opacity: 0.6 }}>✕</span>
            </button>
          )}
          <span style={{ fontSize: "12px", color: "var(--nl-text-3)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
            {loading ? "…" : `${filtered.length} / ${variants.length}`}
          </span>
        </div>

        {/* Table or skeleton */}
        {loading ? (
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: "46px" }} />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow style={{ background: "hsl(var(--muted))" }}>
                <TableHead style={TH}>SKU</TableHead>
                <TableHead style={TH}>Product</TableHead>
                <TableHead style={TH}>Variant</TableHead>
                <TableHead style={TH}>Unit</TableHead>
                <TableHead className="text-right" style={{ ...TH, color: "var(--nl-green)", fontWeight: 800 }}>
                  Stock · {STORE_LABEL[selectedStore]}
                </TableHead>
                <TableHead className="text-right" style={TH}>Reorder</TableHead>
                <TableHead style={TH}>Aliases</TableHead>
                <TableHead style={{ width: "1px" }}></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const storeQty = v.stock?.[selectedStore] ?? 0;
                const isOut  = storeQty <= 0;
                const isLow  = !isOut && v.reorderLevel > 0 && storeQty <= v.reorderLevel;
                return (
                  <TableRow
                    key={v._id}
                    style={{
                      borderLeft: isOut
                        ? "3px solid #EF4444"
                        : isLow
                        ? "3px solid var(--nl-amber)"
                        : "3px solid transparent",
                      background: isOut
                        ? "rgba(254,226,226,0.18)"
                        : isLow
                        ? "rgba(254,243,199,0.22)"
                        : undefined,
                    }}
                  >
                    <TableCell style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--nl-text-3)", padding: "13px 16px" }}>
                      {v.sku}
                    </TableCell>
                    <TableCell style={{ fontWeight: 600, color: "var(--nl-text)", fontSize: "13.5px", padding: "13px 16px" }}>
                      {v.productName}
                    </TableCell>
                    <TableCell style={{ color: "var(--nl-text-2)", fontSize: "13px", padding: "13px 16px" }}>
                      {v.variantLabel}
                    </TableCell>
                    <TableCell style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontSize: "11.5px", fontWeight: 600, color: "var(--nl-text-3)",
                        background: "hsl(var(--muted))", border: "1px solid var(--nl-border)",
                        borderRadius: "5px", padding: "2px 7px",
                      }}>
                        {v.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" style={{ padding: "13px 16px" }}>
                      <StockPill qty={storeQty} reorderLevel={v.reorderLevel} />
                    </TableCell>
                    <TableCell className="text-right" style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--nl-text-3)", padding: "13px 16px" }}>
                      {v.reorderLevel > 0 ? v.reorderLevel : <span style={{ color: "var(--nl-border)" }}>—</span>}
                    </TableCell>
                    <TableCell style={{ padding: "13px 16px" }}>
                      <button
                        style={{
                          fontSize: "12px", fontWeight: 600, color: "var(--nl-green)",
                          background: "none", border: "none", cursor: "pointer",
                          padding: "3px 8px", borderRadius: "5px", transition: "background 0.12s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--nl-green-light)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        onClick={() => setAliasTarget(v)}
                      >
                        {v.aliases?.length ?? 0} alias{(v.aliases?.length ?? 0) !== 1 ? "es" : ""}
                      </button>
                    </TableCell>
                    <TableCell style={{ padding: "13px 12px" }}>
                      <div style={{ display: "flex", gap: "2px" }}>
                        <Button
                          variant="ghost" size="sm"
                          style={{ height: "28px", padding: "0 10px", fontSize: "12px", color: "var(--nl-text-2)" }}
                          onClick={() => {
                            setForm({ productName: v.productName, variantLabel: v.variantLabel, unit: v.unit, stock: { raipur: v.stock?.raipur ?? 0, bhilai: v.stock?.bhilai ?? 0, rajnandgaon: v.stock?.rajnandgaon ?? 0 }, reorderLevel: v.reorderLevel });
                            setEditTarget(v); setSaveError(""); setShowAdd(true);
                          }}
                        >Edit</Button>
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

              {filtered.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <div style={{ textAlign: "center", padding: "64px 0", color: "var(--nl-text-3)" }}>
                      <div style={{
                        width: "56px", height: "56px", borderRadius: "16px",
                        background: "hsl(var(--muted))", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        margin: "0 auto 16px",
                      }}>
                        <Package size={26} style={{ opacity: 0.35 }} />
                      </div>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--nl-text-2)", marginBottom: "6px" }}>
                        {stockFilter !== "all" ? `No ${stockFilter === "out" ? "out-of-stock" : "low stock"} items` : search ? "No matches found" : "No products yet"}
                      </p>
                      <p style={{ fontSize: "13px", maxWidth: "260px", margin: "0 auto" }}>
                        {stockFilter !== "all"
                          ? `All ${STORE_LABEL[selectedStore]} products look healthy.`
                          : search
                          ? `No variants match "${search}"`
                          : "Add your first product variant to start tracking inventory."}
                      </p>
                      {!search && (
                        <Button
                          size="sm"
                          onClick={() => { setForm(EMPTY_FORM); setEditTarget(null); setSaveError(""); setShowAdd(true); }}
                          style={{ marginTop: "18px", background: "var(--nl-amber)", color: "#fff", fontWeight: 700 }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--nl-amber-hover)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "var(--nl-amber)")}
                        >
                          + Add First Variant
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {/* Footer row count */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--nl-border)",
            background: "var(--nl-cream)",
            fontSize: "12px",
            color: "var(--nl-text-3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>{filtered.length} variant{filtered.length !== 1 ? "s" : ""} shown</span>
            <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {lowStockCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--nl-amber-hover)", fontWeight: 600 }}>
                  <AlertTriangle size={11} />
                  {lowStockCount} low stock
                </span>
              )}
              {outOfStockCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#B91C1C", fontWeight: 600 }}>
                  <PackageX size={11} />
                  {outOfStockCount} out of stock
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* ── Add / Edit dialog ── */}
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
            <div>
              <Label className="text-xs mb-1">Stock per store</Label>
              <div className="grid grid-cols-3 gap-2">
                {STORES.map((s) => (
                  <div key={s}>
                    <Label className="text-xs text-gray-400 mb-0.5">{STORE_LABEL[s]}</Label>
                    <Input
                      type="number"
                      value={form.stock[s]}
                      onChange={(e) => setForm({ ...form, stock: { ...form.stock, [s]: parseFloat(e.target.value) || 0 } })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="capitalize text-xs mb-1">Reorder Level</Label>
              <Input type="number" value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: parseFloat(e.target.value) || 0 })} />
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

      {/* ── Alias dialog ── */}
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
