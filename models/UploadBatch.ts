import mongoose from "mongoose";

const SuggestionSchema = new mongoose.Schema(
  { variantId: String, nameCanonical: String, score: Number },
  { _id: false }
);

const RowSchema = new mongoose.Schema(
  {
    rowIndex:       Number,
    rawName:        String,
    qty:            Number,
    status:         { type: String, enum: ["matched", "unmatched", "skipped"], default: "unmatched" },
    matchedVariant: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },
    matchType:      { type: String, enum: ["exact", "alias", "manual", "fuzzy"] },
    suggestions:    [SuggestionSchema],
  },
  { _id: false }
);

const UploadBatchSchema = new mongoose.Schema(
  {
    fileName:  String,
    fileHash:  { type: String, index: true },
    source:    String,
    type:      { type: String, enum: ["sale", "purchase"], default: "sale" },
    columnMap: { name: String, qty: String },
    rows:      [RowSchema],
    status:    {
      type: String,
      enum: ["parsed", "previewed", "applied", "reversed", "discarded"],
      default: "parsed",
    },
    totals:    { rows: Number, matched: Number, unmatched: Number, unitsProcessed: Number },
    appliedAt: Date,
    reversedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.UploadBatch || mongoose.model("UploadBatch", UploadBatchSchema);
