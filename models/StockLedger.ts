import mongoose from "mongoose";

const StockLedgerSchema = new mongoose.Schema(
  {
    variant:      { type: mongoose.Schema.Types.ObjectId, ref: "Variant", index: true },
    delta:        Number,
    reason:       { type: String, enum: ["sale", "purchase", "reversal", "seed", "adjustment"] },
    batch:        { type: mongoose.Schema.Types.ObjectId, ref: "UploadBatch" },
    balanceAfter: Number,
    note:         String,
  },
  { timestamps: true }
);

export default mongoose.models.StockLedger || mongoose.model("StockLedger", StockLedgerSchema);
