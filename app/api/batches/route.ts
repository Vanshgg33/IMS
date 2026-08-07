import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UploadBatch from "@/models/UploadBatch";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const batches = await UploadBatch.find({ status: { $ne: "discarded" } }).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json(batches);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
