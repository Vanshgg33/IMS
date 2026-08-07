import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StockLedger from "@/models/StockLedger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get("variantId");
    const query = variantId ? { variant: variantId } : {};
    const entries = await StockLedger.find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("variant", "nameCanonical sku")
      .populate("batch", "fileName source type saleDate")
      .lean();
    return NextResponse.json(entries);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
