import mongoose from "mongoose";
import Variant from "@/models/Variant";
import StockLedger from "@/models/StockLedger";
import UploadBatch from "@/models/UploadBatch";
import { sendLowStockAlert, ReorderAlert } from "@/lib/email";

export async function applyBatch(batchId: string) {
  const reorderAlerts: ReorderAlert[] = [];

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      reorderAlerts.length = 0; // clear on transaction retry

      const batch = await UploadBatch.findById(batchId).session(session);
      if (!batch) throw new Error("Batch not found");
      if (batch.status !== "previewed") throw new Error("Batch not in previewed state");

      const isSale = batch.type === "sale";
      const ledgerReason: "sale" | "purchase" = isSale ? "sale" : "purchase";
      const VALID_STORES = ["raipur", "bhilai", "rajnandgaon"];
      if (!batch.store || !VALID_STORES.includes(batch.store)) {
        throw new Error("Batch has no valid store — cannot apply");
      }
      const store = batch.store as "raipur" | "bhilai" | "rajnandgaon";

      const byVariant = new Map<string, number>();
      for (const r of batch.rows) {
        if (r.status !== "matched") continue;
        const id = String(r.matchedVariant);
        byVariant.set(id, (byVariant.get(id) || 0) + r.qty);
      }

      let unitsProcessed = 0;
      for (const [variantId, qty] of Array.from(byVariant.entries())) {
        const v = await Variant.findById(variantId).session(session);
        if (!v) continue;
        const delta = isSale ? -qty : qty;
        if (!v.stock) v.stock = { raipur: 0, bhilai: 0, rajnandgaon: 0 };

        const prevQty = v.stock[store] || 0;
        v.stock[store] = prevQty + delta;
        const newQty = v.stock[store];

        // detect reorder threshold crossing (stock drops from above to at/below reorder level)
        if (v.reorderLevel > 0 && prevQty > v.reorderLevel && newQty <= v.reorderLevel) {
          reorderAlerts.push({
            productName: v.productName || v.nameCanonical || "Unknown Product",
            variantLabel: v.variantLabel || v.sku || "",
            sku: v.sku || "",
            store,
            qty: newQty,
            reorderLevel: v.reorderLevel,
          });
        }

        v.markModified("stock");
        await v.save({ session });
        await StockLedger.create(
          [{ variant: v._id, store, delta, reason: ledgerReason, batch: batch._id, balanceAfter: newQty }],
          { session }
        );
        unitsProcessed += qty;
      }

      batch.status = "applied";
      batch.appliedAt = new Date();
      batch.totals.unitsProcessed = unitsProcessed;
      batch.markModified("totals");
      await batch.save({ session });
    });
  } finally {
    session.endSession();
  }

  // fire email after transaction commits — email failure must NOT roll back stock changes
  if (reorderAlerts.length > 0) {
    sendLowStockAlert(reorderAlerts).catch((e) =>
      console.error("[applyBatch] Low stock email failed:", e)
    );
  }
}

export async function reverseBatch(batchId: string) {
  const reorderAlerts: ReorderAlert[] = [];

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      reorderAlerts.length = 0; // clear on transaction retry

      const batch = await UploadBatch.findById(batchId).session(session);
      if (!batch) throw new Error("Batch not found");
      if (batch.status !== "applied") throw new Error("Batch not in applied state");

      const isSale = batch.type === "sale";
      const VALID_STORES = ["raipur", "bhilai", "rajnandgaon"];
      if (!batch.store || !VALID_STORES.includes(batch.store)) {
        throw new Error("Batch has no valid store — cannot reverse");
      }
      const store = batch.store as "raipur" | "bhilai" | "rajnandgaon";

      const byVariant = new Map<string, number>();
      for (const r of batch.rows) {
        if (r.status !== "matched") continue;
        const id = String(r.matchedVariant);
        byVariant.set(id, (byVariant.get(id) || 0) + r.qty);
      }

      for (const [variantId, qty] of Array.from(byVariant.entries())) {
        const v = await Variant.findById(variantId).session(session);
        if (!v) continue;
        const delta = isSale ? qty : -qty; // reverse of apply
        if (!v.stock) v.stock = { raipur: 0, bhilai: 0, rajnandgaon: 0 };

        const prevQty = v.stock[store] || 0;
        v.stock[store] = prevQty + delta;
        const newQty = v.stock[store];

        // reversal of a purchase decreases stock — detect threshold crossing
        if (v.reorderLevel > 0 && prevQty > v.reorderLevel && newQty <= v.reorderLevel) {
          reorderAlerts.push({
            productName: v.productName || v.nameCanonical || "Unknown Product",
            variantLabel: v.variantLabel || v.sku || "",
            sku: v.sku || "",
            store,
            qty: newQty,
            reorderLevel: v.reorderLevel,
          });
        }

        v.markModified("stock");
        await v.save({ session });
        await StockLedger.create(
          [{ variant: v._id, store, delta, reason: "reversal", batch: batch._id, balanceAfter: newQty }],
          { session }
        );
      }

      batch.status = "reversed";
      batch.reversedAt = new Date();
      await batch.save({ session });
    });
  } finally {
    session.endSession();
  }

  // fire email after transaction commits
  if (reorderAlerts.length > 0) {
    sendLowStockAlert(reorderAlerts).catch((e) =>
      console.error("[reverseBatch] Low stock email failed:", e)
    );
  }
}
