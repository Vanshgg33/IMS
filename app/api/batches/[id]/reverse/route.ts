import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { reverseBatch } from "@/lib/applyBatch";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await reverseBatch(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
