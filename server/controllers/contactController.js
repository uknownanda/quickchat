import User from "../models/User.js";
import ContactRequest from "../models/ContactRequest.js";
import { getIO } from "../lib/socket.js";

export const searchPeople = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ success: true, users: [] });
    const me = req.user._id;
    const searchTerm = q.replace(/^@/, "").slice(0, 40);
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\    const escaped = searchTerm.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");");
    const users = await User.find({
      _id: { $ne: me },
      $or: [
        { username: { $regex: escaped, $options: "i" } },
        { fullName: { $regex: escaped, $options: "i" } },
      ],
    }).select("fullName username profilePic bio").limit(20);
    const ids = users.map((u) => u._id);
    const requests = await ContactRequest.find({
      $or: [
        { sender: me, recipient: { $in: ids } },
        { recipient: me, sender: { $in: ids } },
      ],
    });
    const statusById = {};
    requests.forEach((request) => {
      const other = request.sender.toString() === me.toString() ? request.recipient : request.sender;
      statusById[other.toString()] = request.status === "accepted"
        ? "contact"
        : request.sender.toString() === me.toString()
          ? "sent"
          : request.status === "pending" ? "received" : "rejected";
    });
    return res.json({
      success: true,
      users: users.map((user) => ({
        ...user.toObject(),
        relationship: statusById[user._id.toString()] || "none",
      })),
    });
  } catch (error) {
    console.error("Search People Error:", error);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};
export const sendContactRequest = async (req, res) => {
  try {
    const recipient = req.params.id, sender = req.user._id;
    if (sender.toString() === recipient) return res.status(400).json({ success: false, message: "You cannot invite yourself" });
    if (!(await User.exists({ _id: recipient }))) return res.status(404).json({ success: false, message: "User not found" });
    let request = await ContactRequest.findOne({ $or: [{ sender, recipient }, { sender: recipient, recipient: sender }] });
    if (request?.status === "accepted") return res.status(409).json({ success: false, message: "Already connected" });
    if (request?.status === "pending") return res.status(409).json({ success: false, message: "An invitation is already pending" });
    if (request) { request.sender = sender; request.recipient = recipient; request.status = "pending"; await request.save(); }
    else request = await ContactRequest.create({ sender, recipient });
    getIO().to(`user:${recipient.toString()}`).emit("contactRequest", { requestId: request._id, from: { _id: sender, fullName: req.user.fullName } });
    res.status(201).json({ success: true, request });
  } catch (e) { res.status(500).json({ success: false, message: "Could not send invitation" }); }
};

export const listContactRequests = async (req, res) => {
  try {
    const [received, sent] = await Promise.all([
      ContactRequest.find({ recipient: req.user._id, status: "pending" }).populate("sender", "fullName email profilePic"),
      ContactRequest.find({ sender: req.user._id, status: "pending" }).populate("recipient", "fullName email profilePic")
    ]);
    res.json({ success: true, received, sent });
  } catch (e) { res.status(500).json({ success: false, message: "Could not load invitations" }); }
};

export const respondToContactRequest = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action" });
    const request = await ContactRequest.findOne({ _id: req.params.id, recipient: req.user._id, status: "pending" });
    if (!request) return res.status(404).json({ success: false, message: "Invitation not found" });
    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();
    getIO().to(`user:${request.sender.toString()}`).emit("contactRequestUpdated", { status: request.status });
    getIO().to(`user:${request.recipient.toString()}`).emit("contactRequestUpdated", { status: request.status });
    res.json({ success: true, status: request.status });
  } catch (e) { res.status(500).json({ success: false, message: "Could not update invitation" }); }
};
