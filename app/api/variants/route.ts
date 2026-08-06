import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Variant from "@/models/Variant";
import StockLedger from "@/models/StockLedger";
import { normalizeName } from "@/lib/normalize";

export const dynamic = "force-dynamic";

function makeSKU() {
  return "SKU-" + Date.now().toString(36).toUpperCase();
}

export async function GET() {
  await connectDB();
  const variants = await Variant.find({ active: true }).sort({ productName: 1, variantLabel: 1 }).lean();
  return NextResponse.json(variants);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { productName, variantLabel, unit, stockQty, reorderLevel } = body;

    if (!productName?.trim() || !variantLabel?.trim()) {
      return NextResponse.json({ error: "productName and variantLabel are required" }, { status: 400 });
    }

    const nameCanonical = `${productName.trim()} ${variantLabel.trim()}`.trim();
    const nameKey = normalizeName(nameCanonical);

    const existing = await Variant.findOne({ nameKey });
    if (existing) return NextResponse.json({ error: "A variant with this name already exists" }, { status: 409 });

    const variant = await Variant.create({
      sku: makeSKU(),
      productName: productName.trim(),
      variantLabel: variantLabel.trim(),
      nameCanonical,
      nameKey,
      unit: unit || "unit",
      stockQty: stockQty || 0,
      reorderLevel: reorderLevel || 0,
    });

    if (stockQty > 0) {
      await StockLedger.create({
        variant: variant._id,
        delta: stockQty,
        reason: "seed",
        balanceAfter: stockQty,
      });
    }

    return NextResponse.json(variant, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
