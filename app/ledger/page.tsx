"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Entry {
  _id: string;
  delta: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
  variant: { nameCanonical: string; sku: string };
  batch?: { fileName: string; source: string; type: string; saleDate?: string };
  note?: string;
}

const REASON_COLORS: Record<string, string> = {
  sale: "bg-red-100 text-red-700",
  purchase: "bg-green-100 text-green-700",
  reversal: "bg-orange-100 text-orange-700",
  seed: "bg-blue-100 text-blue-700",
  adjustment: "bg-gray-100 text-gray-600",
};

function LedgerTable() {
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url = variantId ? `/api/ledger?variantId=${variantId}` : "/api/ledger";
    fetch(url).then((r) => r.json()).then((d) => { setEntries(d); setLoading(false); });
  }, [searchParams, variantId]);

  const filtered = entries.filter((e) =>
    e.variant?.nameCanonical?.toLowerCase().includes(search.toLowerCase()) ||
    e.reason.includes(search.toLowerCase()) ||
    e.batch?.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const productName = entries[0]?.variant?.nameCanonical;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {variantId && (
            <Link href="/">
              <Button variant="outline" size="sm" className="text-xs">← Products</Button>
            </Link>
          )}
          <h1 className="text-xl font-bold">
            {variantId && productName ? `History: ${productName}` : "Stock Ledger"}
          </h1>
        </div>
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
      </div>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale Date</TableHead>
              <TableHead>Applied At</TableHead>
              {!variantId && <TableHead>Variant</TableHead>}
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Delta</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Batch</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => (
              <TableRow key={e._id}>
                <TableCell className="text-xs text-gray-700 whitespace-nowrap font-medium">
                  {e.batch?.saleDate
                    ? new Date(e.batch.saleDate).toLocaleDateString()
                    : new Date(e.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString()}
                </TableCell>
                {!variantId && <TableCell className="text-sm">{e.variant?.nameCanonical ?? "—"}</TableCell>}
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REASON_COLORS[e.reason] || ""}`}>
                    {e.reason}
                  </span>
                </TableCell>
                <TableCell className={`text-right font-mono font-bold ${e.delta < 0 ? "text-red-600" : "text-green-600"}`}>
                  {e.delta > 0 ? "+" : ""}{e.delta}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{e.balanceAfter}</TableCell>
                <TableCell className="text-xs text-gray-500">
                  {e.batch ? `${e.batch.fileName}` : e.note || "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={variantId ? 6 : 7} className="text-center text-gray-400 py-8">No entries.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 text-sm">Loading…</p>}>
      <LedgerTable />
    </Suspense>
  );
}
