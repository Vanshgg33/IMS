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
  store?: string;
  balanceAfter: number;
  createdAt: string;
  variant: { nameCanonical: string; sku: string };
  batch?: { fileName: string; source: string; type: string; saleDate?: string };
  note?: string;
}

const REASON_STYLES: Record<string, { bg: string; color: string }> = {
  sale:       { bg: "#FEE2E2",              color: "#B91C1C" },
  purchase:   { bg: "var(--nl-green-light)", color: "var(--nl-green)" },
  reversal:   { bg: "#FFF7ED",              color: "#C2410C" },
  seed:       { bg: "#EFF6FF",              color: "#1D4ED8" },
  adjustment: { bg: "hsl(var(--muted))",    color: "var(--nl-text-3)" },
};

function LedgerTable() {
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const url = variantId ? `/api/ledger?variantId=${variantId}` : "/api/ledger";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setEntries(Array.isArray(d) ? d : []); })
      .catch(() => { setEntries([]); })
      .finally(() => setLoading(false));
  }, [searchParams, variantId]);

  const filtered = entries.filter((e) =>
    e.variant?.nameCanonical?.toLowerCase().includes(search.toLowerCase()) ||
    e.reason.includes(search.toLowerCase()) ||
    e.batch?.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const productName = entries[0]?.variant?.nameCanonical;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {variantId && (
            <Link href="/">
              <Button variant="outline" size="sm" style={{ fontSize: "12px", color: "var(--nl-text-2)" }}>← Products</Button>
            </Link>
          )}
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--nl-text)", margin: 0, letterSpacing: "-0.01em" }}>
              {variantId && productName ? `History: ${productName}` : "Stock Ledger"}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--nl-text-3)", marginTop: "3px" }}>
              {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
            </p>
          </div>
        </div>
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44" />
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
              <TableHead>Store</TableHead>
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
                <TableCell style={{ fontSize: "12px", fontWeight: 600, textTransform: "capitalize", color: "var(--nl-text-2)" }}>
                  {e.store ?? "—"}
                </TableCell>
                <TableCell>
                  {(() => {
                    const s = REASON_STYLES[e.reason] || REASON_STYLES.adjustment;
                    return (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "999px", fontSize: "11.5px", fontWeight: 600, background: s.bg, color: s.color }}>
                        {e.reason}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right" style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: e.delta < 0 ? "#B91C1C" : "var(--nl-green)", fontSize: "13.5px" }}>
                  {e.delta > 0 ? "+" : ""}{e.delta}
                </TableCell>
                <TableCell className="text-right" style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--nl-text-2)" }}>{e.balanceAfter}</TableCell>
                <TableCell className="text-xs text-gray-500">
                  {e.batch ? `${e.batch.fileName}` : e.note || "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={variantId ? 7 : 8} className="text-center text-gray-400 py-8">No entries.</TableCell>
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
