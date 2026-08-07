import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    _id:         { type: String, default: "global" },
    alertEmails: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);
