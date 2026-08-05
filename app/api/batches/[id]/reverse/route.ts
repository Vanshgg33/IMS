import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { reverseBatch } from "@/lib/applyBatch";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  await reverseBatch(params.id);
  return NextResponse.json({ ok: true });
}
