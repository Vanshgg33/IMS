import mongoose from "mongoose";
import Variant from "@/models/Variant";
import StockLedger from "@/models/StockLedger";
import UploadBatch from "@/models/UploadBatch";

export async function applyBatch(batchId: string) {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const batch = await UploadBatch.findById(batchId).session(session);
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== "previewed") throw new Error("Batch not in previewed state");

    const isSale = batch.type === "sale";
    const ledgerReason: "sale" | "purchase" = isSale ? "sale" : "purchase";

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
      v.stockQty += delta;
      await v.save({ session });
      await StockLedger.create(
        [{ variant: v._id, delta, reason: ledgerReason, batch: batch._id, balanceAfter: v.stockQty }],
        { session }
      );
      unitsProcessed += qty;
    }

    batch.status = "applied";
    batch.appliedAt = new Date();
    batch.totals.unitsProcessed = unitsProcessed;
    await batch.save({ session });
  });
  session.endSession();
}

export async function reverseBatch(batchId: string) {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    const batch = await UploadBatch.findById(batchId).session(session);
    if (!batch) throw new Error("Batch not found");
    if (batch.status !== "applied") throw new Error("Batch not in applied state");

    const isSale = batch.type === "sale";

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
      v.stockQty += delta;
      await v.save({ session });
      await StockLedger.create(
        [{ variant: v._id, delta, reason: "reversal", batch: batch._id, balanceAfter: v.stockQty }],
        { session }
      );
    }

    batch.status = "reversed";
    batch.reversedAt = new Date();
    await batch.save({ session });
  });
  session.endSession();
}
