import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getIO } from "../lib/socket.js";
import ContactRequest from "../models/ContactRequest.js";

const areContacts = async (a, b) => Boolean(await ContactRequest.findOne({ status: "accepted", $or: [{ sender: a, recipient: b }, { sender: b, recipient: a }] }));
const pairQuery = (a, b) => ({ $or: [{ senderId: a, receiverId: b }, { senderId: b, receiverId: a }] });
const emitPair = (a, b, event, payload) => { const io = getIO(); io.to(`user:${a}`).emit(event, payload); io.to(`user:${b}`).emit(event, payload); };

export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const links = await ContactRequest.find({ status: "accepted", $or: [{ sender: userId }, { recipient: userId }] });
        const contactIds = links.map(link => link.sender.toString() === userId.toString() ? link.recipient : link.sender);
        const users = await User.find({ _id: { $in: contactIds } }).select("-password");
        const unseenMessages = {};
        await Promise.all(users.map(async user => { const count = await Message.countDocuments({ senderId: user._id, receiverId: userId, seen: false }); if (count) unseenMessages[user._id.toString()] = count; }));
        return res.status(200).json({ success: true, users, unseenMessages });
    } catch (error) { console.error("Get Users Error:", error); return res.status(500).json({ success: false, message: "Unable to load users" }); }
};

export const getMessages = async (req, res) => {
    try {
        const { id } = req.params; const myId = req.user._id;
        if (!(await areContacts(myId, id))) return res.status(403).json({ success: false, message: "You can message only accepted contacts" });
        const now = new Date();
        const changed = await Message.updateMany({ senderId: id, receiverId: myId, seen: false }, { $set: { seen: true, readAt: now, deliveredAt: now } });
        if (changed.modifiedCount) emitPair(myId.toString(), id.toString(), "messagesRead", { readerId: myId.toString(), senderId: id.toString(), readAt: now });
        const messages = await Message.find(pairQuery(myId, id)).populate("replyTo", "text image senderId").sort({ createdAt: 1 });
        return res.status(200).json({ success: true, messages });
    } catch (error) { console.error("Get Messages Error:", error); return res.status(500).json({ success: false, message: "Unable to load messages" }); }
};

export const markMessageAsSeen = async (req, res) => {
    try {
        const message = await Message.findOneAndUpdate({ _id: req.params.id, receiverId: req.user._id }, { $set: { seen: true, readAt: new Date() } }, { new: true });
        if (!message) return res.status(404).json({ success: false, message: "Message not found" });
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageRead", { messageId: message._id, readerId: req.user._id.toString(), readAt: message.readAt });
        return res.status(200).json({ success: true });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to update message status" }); }
};

export const sendMessage = async (req, res) => {
    try {
        const { text = "", image, replyTo } = req.body; const receiverId = req.params.id; const senderId = req.user._id;
        if (!(await areContacts(senderId, receiverId))) return res.status(403).json({ success: false, message: "Accept this contact invitation before messaging" });
        if (!text.trim() && !image) return res.status(400).json({ success: false, message: "A message or image is required" });
        let imageUrl = "";
        if (image) { if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(image)) return res.status(400).json({ success: false, message: "Only image attachments are allowed" }); const upload = await cloudinary.uploader.upload(image, { resource_type: "image" }); imageUrl = upload.secure_url; }
        const newMessage = await Message.create({ senderId, receiverId, text: text.trim(), image: imageUrl, replyTo: replyTo || null, deliveredAt: null });
        const recipientOnline = Boolean((await User.exists({ _id: receiverId })) && getIO().sockets.adapter.rooms.get(`user:${receiverId}`)?.size);
        if (recipientOnline) { newMessage.deliveredAt = new Date(); await newMessage.save(); }
        getIO().to(`user:${receiverId}`).emit("newMessage", newMessage);
        return res.status(201).json({ success: true, newMessage });
    } catch (error) { console.error("Send Message Error:", error); return res.status(500).json({ success: false, message: "Unable to send message" }); }
};

export const searchMessages = async (req, res) => {
    try {
        const { id } = req.params; const q = String(req.query.q || "").trim().slice(0, 100);
        if (!(await areContacts(req.user._id, id))) return res.status(403).json({ success: false, message: "You can search only accepted conversations" });
        if (!q) return res.json({ success: true, messages: [] });
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const messages = await Message.find({ ...pairQuery(req.user._id, id), text: { $regex: escaped, $options: "i" }, deletedAt: null }).sort({ createdAt: -1 }).limit(50);
        return res.json({ success: true, messages });
    } catch (error) { console.error("Search Messages Error:", error); return res.status(500).json({ success: false, message: "Search failed" }); }
};

export const updateMessage = async (req, res) => {
    try {
        const { text, emoji } = req.body;
        const ownership = typeof emoji === "string" ? { $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] } : { senderId: req.user._id };
        const message = await Message.findOne({ _id: req.params.id, ...ownership });
        if (!message) return res.status(404).json({ success: false, message: "Message not found or not authorized" });
        if (message.deletedAt) return res.status(400).json({ success: false, message: "Deleted messages cannot be changed" });
        if (typeof text === "string" && message.senderId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Only the sender can edit a message" });
        if (typeof text === "string") { if (!text.trim() || text.length > 5000) return res.status(400).json({ success: false, message: "Message text must be 1–5000 characters" }); message.text = text.trim(); message.editedAt = new Date(); }
        if (typeof emoji === "string") {
            if (!emoji || emoji.length > 16) return res.status(400).json({ success: false, message: "Invalid reaction" });
            const existing = message.reactions.find(r => r.userId.toString() === req.user._id.toString());
            if (existing?.emoji === emoji) message.reactions = message.reactions.filter(r => r.userId.toString() !== req.user._id.toString());
            else if (existing) existing.emoji = emoji;
            else message.reactions.push({ userId: req.user._id, emoji });
        }
        await message.save(); emitPair(message.senderId.toString(), message.receiverId.toString(), "messageUpdated", message);
        return res.json({ success: true, message });
    } catch (error) { console.error("Update Message Error:", error); return res.status(500).json({ success: false, message: "Unable to update message" }); }
};

export const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findOne({ _id: req.params.id, senderId: req.user._id });
        if (!message) return res.status(404).json({ success: false, message: "Message not found or not yours" });
        message.text = ""; message.image = ""; message.deletedAt = new Date(); message.reactions = []; await message.save();
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageDeleted", { _id: message._id, deletedAt: message.deletedAt, text: "", image: "", reactions: [] });
        return res.json({ success: true, message });
    } catch (error) { console.error("Delete Message Error:", error); return res.status(500).json({ success: false, message: "Unable to delete message" }); }
};


export const togglePinMessage = async (req, res) => {
    try {
        const message = await Message.findOne({ _id: req.params.id, $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] });
        if (!message) return res.status(404).json({ success: false, message: "Message not found" });
        if (message.deletedAt) return res.status(400).json({ success: false, message: "Deleted messages cannot be pinned" });
        message.isPinned = !message.isPinned;
        message.pinnedAt = message.isPinned ? new Date() : null;
        await message.save();
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageUpdated", message);
        return res.json({ success: true, message });
    } catch (error) {
        console.error("Pin Message Error:", error);
        return res.status(500).json({ success: false, message: "Unable to update pinned message" });
    }
};
