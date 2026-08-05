import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import StockLedger from "@/models/StockLedger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const variantId = searchParams.get("variantId");
  const query = variantId ? { variant: variantId } : {};
  const entries = await StockLedger.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("variant", "nameCanonical sku")
    .populate("batch", "fileName source type")
    .lean();
  return NextResponse.json(entries);
}
