import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Variant from "@/models/Variant";
import StockLedger from "@/models/StockLedger";
import { normalizeName } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const body = await req.json();
    const variant = await Variant.findById(params.id);
    if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.productName !== undefined) variant.productName = body.productName;
    if (body.variantLabel !== undefined) variant.variantLabel = body.variantLabel;
    if (body.unit !== undefined) variant.unit = body.unit;
    if (body.reorderLevel !== undefined) variant.reorderLevel = body.reorderLevel;
    if (body.active !== undefined) variant.active = body.active;

    if (body.productName !== undefined || body.variantLabel !== undefined) {
      variant.nameCanonical = `${variant.productName} ${variant.variantLabel}`.trim();
      variant.nameKey = normalizeName(variant.nameCanonical);
    }

    // Handle manual stock adjustment — create ledger entry for audit trail
    if (body.stockQty !== undefined && body.stockQty !== variant.stockQty) {
      const delta = body.stockQty - variant.stockQty;
      variant.stockQty = body.stockQty;
      await variant.save();
      await StockLedger.create({
        variant: variant._id,
        delta,
        reason: "adjustment",
        balanceAfter: variant.stockQty,
        note: "Manual adjustment via edit",
      });
    } else {
      await variant.save();
    }

    return NextResponse.json(variant);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await Variant.findByIdAndUpdate(params.id, { active: false });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
