import mongoose from "mongoose";
const contactRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  wallpaper: { type: String, enum: ["default", "midnight", "ocean", "forest", "sunset"], default: "default" },
}, { timestamps: true });
contactRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });
export default mongoose.model("ContactRequest", contactRequestSchema);
