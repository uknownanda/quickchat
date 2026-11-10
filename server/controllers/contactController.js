import User from "../models/User.js";
import ContactRequest from "../models/ContactRequest.js";
import { getIO, userSocketmap } from "../lib/socket.js";

export const searchPeople = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) return res.json({ success: true, users: [] });
    const me = req.user._id;
    const users = await User.find({ _id: { $ne: me }, $or: [
      { username: { $regex: q.replace(/^@/, ""), $options: "i" } }, { fullName: { $regex: q, $options: "i" } }
    ] }).select("fullName username profilePic bio").limit(20);
    const ids = users.map(u => u._id);
    const requests = await ContactRequest.find({ $or: [{ sender: me, recipient: { $in: ids } }, { recipient: me, sender: { $in: ids } }] });
    const statusById = {};
    requests.forEach(r => { const other = r.sender.toString() === me.toString() ? r.recipient : r.sender; statusById[other.toString()] = r.status === "accepted" ? "contact" : r.sender.toString() === me.toString() ? "sent" : r.status === "pending" ? "received" : "rejected"; });
    res.json({ success: true, users: users.map(u => ({ ...u.toObject(), relationship: statusById[u._id.toString()] || "none" })) });
  } catch (e) { res.status(500).json({ success: false, message: "Search failed" }); }
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
    const socketId = userSocketmap[recipient.toString()];
    if (socketId) getIO().to(socketId).emit("contactRequest", { requestId: request._id, from: { _id: sender, fullName: req.user.fullName } });
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
    const senderSocket = userSocketmap[request.sender.toString()];
    if (senderSocket) getIO().to(senderSocket).emit("contactRequestUpdated", { status: request.status });
    res.json({ success: true, status: request.status });
  } catch (e) { res.status(500).json({ success: false, message: "Could not update invitation" }); }
};
