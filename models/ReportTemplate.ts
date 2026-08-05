import mongoose from "mongoose";

const ReportTemplateSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, unique: true },
    type:      { type: String, enum: ["sale", "purchase"], default: "sale" },
    columnMap: { name: String, qty: String },
  },
  { timestamps: true }
);

export default mongoose.models.ReportTemplate ||
  mongoose.model("ReportTemplate", ReportTemplateSchema);
