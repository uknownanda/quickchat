import mongoose from "mongoose";
const contactRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  wallpaper: { type: String, default: "default", validate: { validator: (value) => { const [theme, design = "0"] = String(value).split("|"); return ["default", "midnight", "ocean", "forest", "sunset", "aurora", "stardust", "geometry", "glass", "minimal", "dreamscape", "ember"].includes(theme) && /^[0-2]$/.test(design); }, message: "Invalid conversation wallpaper" } },
}, { timestamps: true });
contactRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });
export default mongoose.model("ContactRequest", contactRequestSchema);
