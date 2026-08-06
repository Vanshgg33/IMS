import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { applyBatch } from "@/lib/applyBatch";
import UploadBatch from "@/models/UploadBatch";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const batch = await UploadBatch.findById(params.id);
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (batch.status === "previewed") {
      // already previewed — proceed
    } else if (batch.status === "parsed") {
      batch.status = "previewed";
      await batch.save();
    } else {
      return NextResponse.json({ error: `Cannot apply — status is ${batch.status}` }, { status: 409 });
    }

    await applyBatch(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
