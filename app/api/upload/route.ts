/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UploadBatch from "@/models/UploadBatch";
import { buildIndex, matchName } from "@/lib/matchRow";
import * as XLSX from "xlsx";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const nameCol = formData.get("nameCol") as string;
    const qtyCol = formData.get("qtyCol") as string;
    const source = (formData.get("source") as string) || "manual";
    const batchType = (formData.get("type") as string) || "sale";

    if (!file || !nameCol || !qtyCol) {
      return NextResponse.json({ error: "Missing file or column mapping" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const duplicate = await UploadBatch.findOne({ fileHash, status: "applied" });

    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const index = await buildIndex();

    const rows = rawRows.map((r, i) => {
      const rawName = String(r[nameCol] || "").trim();
      const qty = parseFloat(String(r[qtyCol] || "0")) || 0;
      if (!rawName || qty <= 0) return { rowIndex: i, rawName, qty, status: "skipped" as const };
      const match = matchName(rawName, index);
      return {
        rowIndex: i,
        rawName,
        qty,
        status: match.status as "matched" | "unmatched" | "skipped",
        matchedVariant: match.status === "matched" ? match.variantId : undefined,
        matchType: match.status === "matched" ? match.matchType : undefined,
        suggestions: match.status === "unmatched" ? (match as any).suggestions : undefined,
      };
    });

    const matched = rows.filter((r) => r.status === "matched").length;
    const unmatched = rows.filter((r) => r.status === "unmatched").length;

    const batch = await UploadBatch.create({
      fileName: file.name,
      fileHash,
      source,
      type: batchType,
      columnMap: { name: nameCol, qty: qtyCol },
      rows,
      status: "parsed",
      totals: { rows: rows.length, matched, unmatched, unitsProcessed: 0 },
    });

    return NextResponse.json({ batch, duplicateWarning: !!duplicate, duplicateDate: duplicate?.appliedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
