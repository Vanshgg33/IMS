"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Batch {
  _id: string;
  fileName: string;
  source: string;
  type: "sale" | "purchase";
  status: string;
  totals: { rows: number; matched: number; unmatched: number; unitsProcessed: number };
  createdAt: string;
  saleDate?: string;
  appliedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  parsed: "bg-gray-100 text-gray-600",
  previewed: "bg-yellow-100 text-yellow-700",
  applied: "bg-green-100 text-green-700",
  reversed: "bg-orange-100 text-orange-700",
  discarded: "bg-red-100 text-red-600",
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Batches</h1>
        <Link href="/upload"><Button size="sm">+ New Upload</Button></Link>
      </div>

      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {loadError} —{" "}
          <button className="underline" onClick={() => { setLoading(true); load(); }}>retry</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
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
                  <Link href={`/batches/${b._id}`} className="text-blue-600 hover:underline text-sm">
                    {b.fileName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{b.source}</TableCell>
                <TableCell>
                  <Badge variant={b.type === "sale" ? "destructive" : "default"} className="text-xs">
                    {b.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || ""}`}>
                    {b.status}
                  </span>
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
                <TableCell colSpan={9} className="text-center text-gray-400 py-8">
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
