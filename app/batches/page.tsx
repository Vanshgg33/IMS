"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Batch {
  _id: string;
  fileName: string;
  source: string;
  type: "sale" | "purchase";
  store: string;
  status: string;
  totals: { rows: number; matched: number; unmatched: number; unitsProcessed: number };
  createdAt: string;
  saleDate?: string;
  appliedAt?: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  parsed:    { bg: "hsl(var(--muted))",              color: "var(--nl-text-3)",    dot: "var(--nl-text-3)" },
  previewed: { bg: "var(--nl-amber-light)",           color: "var(--nl-amber-hover)", dot: "var(--nl-amber)" },
  applied:   { bg: "var(--nl-green-light)",           color: "var(--nl-green)",     dot: "var(--nl-green)" },
  reversed:  { bg: "#FFF7ED", color: "#C2410C",       dot: "#F97316" },
  discarded: { bg: "#FEE2E2", color: "#B91C1C",       dot: "#EF4444" },
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reversingId, setReversingId] = useState<string | null>(null);

  async function load() {
    setLoadError("");
    try {
      const res = await fetch("/api/batches");
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setBatches(await res.json());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function reverse(id: string) {
    if (!confirm("Reverse this batch? Stock will be restored.")) return;
    setReversingId(id);
    try {
      const res = await fetch(`/api/batches/${id}/reverse`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Reverse failed");
      } else {
        load();
      }
    } catch {
      alert("Network error — could not reverse batch");
    } finally {
      setReversingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--nl-text)", margin: 0, letterSpacing: "-0.01em" }}>Batches</h1>
          <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginTop: "3px" }}>Upload history &amp; applied stock changes</p>
        </div>
        <Link href="/upload">
          <Button size="sm" style={{ background: "var(--nl-amber)", color: "#fff", fontWeight: 700 }}>+ New Upload</Button>
        </Link>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {loadError} —{" "}
          <button className="underline" onClick={() => { setLoading(true); load(); }}>retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: "44px", borderRadius: "8px" }} />)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Rows</TableHead>
              <TableHead className="text-right">Matched</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Sale Date</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => (
              <TableRow key={b._id}>
                <TableCell>
                  <Link href={`/batches/${b._id}`} style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--nl-amber)", textDecoration: "none", fontFamily: "var(--font-mono)" }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                    {b.fileName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{b.source}</TableCell>
                <TableCell>
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "2px 8px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 700,
                    ...(b.type === "sale"
                      ? { background: "#FEE2E2", color: "#B91C1C" }
                      : { background: "var(--nl-green-light)", color: "var(--nl-green)" })
                  }}>
                    {b.type === "sale" ? "▾ sale" : "▴ purchase"}
                  </span>
                </TableCell>
                <TableCell style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--nl-text-2)", textTransform: "capitalize" }}>
                  {b.store || "—"}
                </TableCell>
                <TableCell>
                  {(() => {
                    const s = STATUS_STYLES[b.status] || STATUS_STYLES.parsed;
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: s.bg, color: s.color, fontSize: "11.5px", fontWeight: 600, padding: "3px 9px", borderRadius: "999px" }}>
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                        {b.status}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right text-sm">{b.totals?.rows ?? "-"}</TableCell>
                <TableCell className="text-right text-sm">{b.totals?.matched ?? "-"}</TableCell>
                <TableCell className="text-right text-sm font-mono">{b.totals?.unitsProcessed ?? "-"}</TableCell>
                <TableCell className="text-xs text-gray-400">
                  {b.saleDate ? new Date(b.saleDate).toLocaleDateString() : new Date(b.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs text-gray-400">
                  {b.appliedAt ? new Date(b.appliedAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {/* View is always available */}
                    <Link href={`/batches/${b._id}`}>
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2">View</Button>
                    </Link>
                    {/* Reverse only for applied batches */}
                    {b.status === "applied" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-orange-600 h-7 px-2"
                        disabled={reversingId === b._id}
                        onClick={() => reverse(b._id)}
                      >
                        {reversingId === b._id ? "…" : "Reverse"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                  No batches yet.{" "}
                  <Link href="/upload" className="text-blue-600 hover:underline">Upload a report.</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
