import mongoose from "mongoose";

const AliasSchema = new mongoose.Schema(
  { raw: String, key: { type: String, index: true } },
  { _id: false }
);

const VariantSchema = new mongoose.Schema(
  {
    sku:           { type: String, unique: true, index: true },
    productName:   { type: String, required: true },
    variantLabel:  { type: String, required: true },
    nameCanonical: { type: String, required: true },
    nameKey:       { type: String, required: true, unique: true, index: true },
    aliases:       [AliasSchema],
    unit:          { type: String, default: "unit" },
    stock: {
      raipur:      { type: Number, default: 0 },
      bhilai:      { type: Number, default: 0 },
      rajnandgaon: { type: Number, default: 0 },
    },
    reorderLevel:  { type: Number, default: 0 },
    active:        { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Variant || mongoose.model("Variant", VariantSchema);
