/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UploadBatch from "@/models/UploadBatch";
import Variant from "@/models/Variant";
import { normalizeName } from "@/lib/normalize";
import { buildIndex, matchName } from "@/lib/matchRow";

export const dynamic = "force-dynamic";

// PATCH — resolve unmatched rows (assign variantId + optionally save alias)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { rowIndex, variantId, saveAlias } = await req.json();

    const batch = await UploadBatch.findById(params.id);
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const row = batch.rows.find((r: any) => r.rowIndex === rowIndex);
    if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

    const variant = await Variant.findById(variantId);
    if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

    row.matchedVariant = variantId;
    row.status = "matched";
    row.matchType = "manual";

    if (saveAlias) {
      const key = normalizeName(row.rawName);
      const alreadyExists = variant.aliases.some((a: any) => a.key === key) || variant.nameKey === key;
      if (!alreadyExists) {
        variant.aliases.push({ raw: row.rawName, key });
        await variant.save();
      }
    }

    batch.totals.matched = batch.rows.filter((r: any) => r.status === "matched").length;
    batch.totals.unmatched = batch.rows.filter((r: any) => r.status === "unmatched").length;
    batch.markModified("totals");
    await batch.save();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — re-run matching on all unmatched rows (after new aliases added)
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const batch = await UploadBatch.findById(params.id);
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const index = await buildIndex();
    for (const row of batch.rows) {
      if (row.status !== "unmatched") continue;
      const result = matchName(row.rawName, index);
      if (result.status === "matched") {
        row.status = "matched";
        row.matchedVariant = result.variantId as any;
        row.matchType = result.matchType as any;
        row.suggestions = undefined;
      } else {
        row.suggestions = (result as any).suggestions;
      }
    }

    batch.totals.matched = batch.rows.filter((r: any) => r.status === "matched").length;
    batch.totals.unmatched = batch.rows.filter((r: any) => r.status === "unmatched").length;
    batch.markModified("totals");
    await batch.save();
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
