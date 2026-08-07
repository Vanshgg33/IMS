"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Row {
  rowIndex: number;
  rawName: string;
  qty: number;
  status: "matched" | "unmatched" | "skipped";
  matchedVariant?: string;
  matchType?: string;
  suggestions?: { variantId: string; nameCanonical: string; score: number }[];
}

interface Variant {
  _id: string;
  nameCanonical: string;
  sku: string;
  stockQty: number;
}

interface Batch {
  _id: string;
  fileName: string;
  type: "sale" | "purchase";
  status: string;
  source: string;
  saleDate?: string;
  rows: Row[];
  totals: { rows: number; matched: number; unmatched: number };
}

export default function BatchPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [variantMap, setVariantMap] = useState<Record<string, Variant>>({});
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [rerunning, setRerunning] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [batchRes, varRes] = await Promise.all([
        fetch(`/api/batches/${id}`),
        fetch("/api/variants"),
      ]);
      if (!batchRes.ok) {
        const err = await batchRes.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load batch (${batchRes.status})`);
      }
      const { batch: b, variantMap: vm } = await batchRes.json();
      const variants = await varRes.json();
      setBatch(b);
      setVariantMap(vm ?? {});
      setAllVariants(Array.isArray(variants) ? variants : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load batch");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function resolveRow(rowIndex: number, variantId: string, saveAlias = true) {
    const res = await fetch(`/api/batches/${id}/rows`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowIndex, variantId, saveAlias }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to resolve row");
      return;
    }
    load();
  }

  async function rerunMatching() {
    setRerunning(true);
    try {
      await fetch(`/api/batches/${id}/rows`, { method: "POST" });
      load();
    } finally {
      setRerunning(false);
    }
  }

  async function applyBatch() {
    setApplying(true);
    setApplyError("");
    try {
      const res = await fetch(`/api/batches/${id}/apply`, { method: "POST" });
      if (res.ok) {
        router.push("/batches");
      } else {
        const err = await res.json().catch(() => ({}));
        setApplyError(err.error || "Apply failed — check the console");
      }
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-600">
        {loadError} —{" "}
        <button className="underline" onClick={() => { setLoading(true); load(); }}>
          retry
        </button>
      </div>
    );
  }

  if (!batch) return <p className="text-red-500">Batch not found.</p>;

  const isSale = batch.type === "sale";
  const delta = (qty: number) => (isSale ? -qty : qty);

  const aggregated = new Map<string, number>();
  for (const r of batch.rows) {
    if (r.status === "matched" && r.matchedVariant) {
      aggregated.set(r.matchedVariant, (aggregated.get(r.matchedVariant) || 0) + r.qty);
    }
  }

  const isApplied = batch.status === "applied" || batch.status === "reversed";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{batch.fileName}</h1>
          <p className="text-sm text-gray-500">
            {batch.source} ·{" "}
            <Badge variant={isSale ? "destructive" : "default"} className="text-xs">
              {batch.type}
            </Badge>
            {" · "}
            <span className="capitalize">{batch.status}</span>
            {batch.saleDate && (
              <> · {isSale ? "Sale" : "Purchase"} date: <span className="font-medium text-gray-700">{new Date(batch.saleDate).toLocaleDateString()}</span></>
            )}
          </p>
        </div>
        {!isApplied && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              {batch.totals.unmatched > 0 && (
                <Button
                  variant="outline"
                  onClick={rerunMatching}
                  disabled={rerunning}
                  className="text-sm"
                >
                  {rerunning ? "Re-matching…" : "Re-run Matching"}
                </Button>
              )}
              <Button
                onClick={applyBatch}
                disabled={applying || batch.totals.matched === 0}
                className={isSale ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {applying ? "Applying…" : `Apply ${isSale ? "→ Subtract Stock" : "→ Add Stock"}`}
              </Button>
            </div>
            {applyError && <p className="text-xs text-red-500">{applyError}</p>}
          </div>
        )}
        {batch.status === "applied" && (
          <Badge className="bg-green-100 text-green-700 border border-green-300">Applied</Badge>
        )}
        {batch.status === "reversed" && (
          <Badge className="bg-orange-100 text-orange-700 border border-orange-300">Reversed</Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total rows", val: batch.totals.rows, color: "" },
          { label: "Matched", val: batch.totals.matched, color: "text-green-600" },
          { label: "Unmatched", val: batch.totals.unmatched, color: "text-red-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-variant delta preview */}
      {aggregated.size > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Stock Changes Preview</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(aggregated.entries()).map(([vId, qty]) => {
                  const v = variantMap[vId];
                  if (!v) return null;
                  const after = v.stockQty + delta(qty);
                  return (
                    <TableRow key={vId} className={after < 0 ? "bg-red-50" : ""}>
                      <TableCell className="text-sm">{v.nameCanonical}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <span className={isSale ? "text-red-600" : "text-green-600"}>
                          {isSale ? "-" : "+"}{qty}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-gray-400">{v.stockQty}</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        <span className={after < 0 ? "text-red-600" : ""}>{after}</span>
                        {after < 0 && <span className="ml-1 text-xs text-red-500">⚠ negative</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Row-level detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            All Rows
            {batch.totals.unmatched > 0 && !isApplied && (
              <span className="text-xs font-normal text-orange-600 ml-2">
                {batch.totals.unmatched} need manual matching below
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Report Name</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matched To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.rows.map((r) => {
                const v = r.matchedVariant ? variantMap[r.matchedVariant] : null;
                return (
                  <TableRow key={r.rowIndex}>
                    <TableCell className="text-xs text-gray-400">{r.rowIndex + 1}</TableCell>
                    <TableCell className="text-sm font-mono">{r.rawName}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.qty}</TableCell>
                    <TableCell>
                      {r.status === "matched" && (
                        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                          {r.matchType}
                        </Badge>
                      )}
                      {r.status === "unmatched" && (
                        <Badge variant="destructive" className="text-xs">unmatched</Badge>
                      )}
                      {r.status === "skipped" && (
                        <Badge variant="secondary" className="text-xs">skipped</Badge>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[260px]">
                      {r.status === "matched" && v && (
                        <span className="text-sm text-gray-700">{v.nameCanonical}</span>
                      )}
                      {r.status === "matched" && !v && (
                        <span className="text-sm text-gray-400 italic">variant not found</span>
                      )}
                      {r.status === "unmatched" && !isApplied && (
                        <div className="flex flex-col gap-1">
                          {r.suggestions && r.suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              <span className="text-xs text-gray-400">Suggestions:</span>
                              {r.suggestions.map((s) => (
                                <Button
                                  key={s.variantId}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6 px-2"
                                  onClick={() => resolveRow(r.rowIndex, s.variantId, true)}
                                >
                                  {s.nameCanonical} ({Math.round(s.score * 100)}%)
                                </Button>
                              ))}
                            </div>
                          )}
                          <Select onValueChange={(v) => resolveRow(r.rowIndex, v, true)}>
                            <SelectTrigger className="h-7 text-xs w-full">
                              <SelectValue placeholder="Pick variant manually…" />
                            </SelectTrigger>
                            <SelectContent>
                              {allVariants.map((av) => (
                                <SelectItem key={av._id} value={av._id} className="text-xs">
                                  {av.nameCanonical}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
