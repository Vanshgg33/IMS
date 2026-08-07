import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Variant from "@/models/Variant";
import StockLedger from "@/models/StockLedger";
import { normalizeName } from "@/lib/normalize";
import { sendLowStockAlert, ReorderAlert } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    // Handle per-store stock adjustments — create ledger entry for each changed store
    const reorderAlerts: ReorderAlert[] = [];
    if (body.stock) {
      if (!variant.stock) variant.stock = { raipur: 0, bhilai: 0, rajnandgaon: 0 };
      const stores = ["raipur", "bhilai", "rajnandgaon"] as const;
      let stockChanged = false;
      for (const s of stores) {
        const newQty = Number(body.stock[s]) || 0;
        const oldQty = variant.stock[s] || 0;
        if (newQty !== oldQty) {
          variant.stock[s] = newQty;
          stockChanged = true;
          await StockLedger.create({
            variant: variant._id,
            store: s,
            delta: newQty - oldQty,
            reason: "adjustment",
            balanceAfter: newQty,
            note: "Manual adjustment via edit",
          });
          // detect threshold crossing on manual adjustment
          if (variant.reorderLevel > 0 && oldQty > variant.reorderLevel && newQty <= variant.reorderLevel) {
            reorderAlerts.push({
              productName: variant.productName || variant.nameCanonical || "Unknown Product",
              variantLabel: variant.variantLabel || variant.sku || "",
              sku: variant.sku || "",
              store: s,
              qty: newQty,
              reorderLevel: variant.reorderLevel,
            });
          }
        }
      }
      if (stockChanged) variant.markModified("stock");
    }
    await variant.save();

    // fire email after save — failure must not affect the API response
    if (reorderAlerts.length > 0) {
      sendLowStockAlert(reorderAlerts).catch((e) =>
        console.error("[variants PATCH] Low stock email failed:", e)
      );
    }

    return NextResponse.json(variant);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await Variant.findByIdAndUpdate(params.id, { active: false });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
