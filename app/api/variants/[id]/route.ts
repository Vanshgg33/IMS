import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Variant from "@/models/Variant";
import { normalizeName } from "@/lib/normalize";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

  await variant.save();
  return NextResponse.json(variant);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await connectDB();
  await Variant.findByIdAndUpdate(params.id, { active: false });
  return NextResponse.json({ ok: true });
}
