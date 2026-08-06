/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UploadBatch from "@/models/UploadBatch";
import Variant from "@/models/Variant";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const batch = await UploadBatch.findById(params.id).lean();
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const variantIds = (batch as any).rows
      .filter((r: any) => r.matchedVariant)
      .map((r: any) => r.matchedVariant);
    const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
    const variantMap = Object.fromEntries(variants.map((v) => [String(v._id), v]));

    return NextResponse.json({ batch, variantMap });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
