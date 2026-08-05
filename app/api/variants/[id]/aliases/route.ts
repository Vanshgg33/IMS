/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Variant from "@/models/Variant";
import { normalizeName } from "@/lib/normalize";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const { raw } = await req.json();
  const key = normalizeName(raw);
  const variant = await Variant.findById(params.id);
  if (!variant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const alreadyExists = variant.aliases.some((a: any) => a.key === key) || variant.nameKey === key;
  if (!alreadyExists) {
    variant.aliases.push({ raw, key });
    await variant.save();
  }
  return NextResponse.json(variant);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  const { key } = await req.json();
  await Variant.findByIdAndUpdate(params.id, { $pull: { aliases: { key } } });
  return NextResponse.json({ ok: true });
}
