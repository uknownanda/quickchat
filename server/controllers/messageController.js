import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getIO } from "../lib/socket.js";
import ContactRequest from "../models/ContactRequest.js";

const areContacts = async (a, b) => Boolean(
    await ContactRequest.exists({
        status: "accepted",
        $or: [
            { sender: a, recipient: b },
            { sender: b, recipient: a },
        ],
    })
);

const pairQuery = (a, b) => ({
    $or: [
        { senderId: a, receiverId: b },
        { senderId: b, receiverId: a },
    ],
});

const emitPair = (a, b, event, payload) => {
    const io = getIO();
    io.to(`user:${a}`).emit(event, payload);
    io.to(`user:${b}`).emit(event, payload);
};

export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;
        const links = await ContactRequest.find({
            status: "accepted",
            $or: [{ sender: userId }, { recipient: userId }],
        }).select("sender recipient").lean();

        const contactIds = links.map((link) =>
            link.sender.toString() === userId.toString() ? link.recipient : link.sender
        );

        if (!contactIds.length) {
            return res.status(200).json({ success: true, users: [], unseenMessages: {} });
        }

        const [users, unreadCounts, latestMessages] = await Promise.all([
            User.find({ _id: { $in: contactIds } })
                .select("-password")
                .lean(),
            Message.aggregate([
                {
                    $match: {
                        senderId: { $in: contactIds },
                        receiverId: userId,
                        seen: false,
                    },
                },
                { $group: { _id: "$senderId", count: { $sum: 1 } } },
            ]),
            Message.aggregate([
                {
                    $match: {
                        $or: [
                            { senderId: userId, receiverId: { $in: contactIds } },
                            { senderId: { $in: contactIds }, receiverId: userId },
                        ],
                    },
                },
                {
                    $sort: { createdAt: -1, _id: -1 },
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$senderId", userId] },
                                "$receiverId",
                                "$senderId",
                            ],
                        },
                        message: {
                            $first: {
                                _id: "$_id",
                                text: "$text",
                                image: "$image",
                                deletedAt: "$deletedAt",
                                senderId: "$senderId",
                                createdAt: "$createdAt",
                            },
                        },
                    },
                },
            ]),
        ]);

        const unseenMessages = Object.fromEntries(
            unreadCounts.map(({ _id, count }) => [_id.toString(), count])
        );
        const latestByContact = new Map(
            latestMessages.map(({ _id, message }) => [_id.toString(), message])
        );

        const contactsWithActivity = users.map((user) => ({
            ...user,
            lastMessage: latestByContact.get(user._id.toString()) || null,
        }));

        contactsWithActivity.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt
                ? new Date(a.lastMessage.createdAt).getTime()
                : 0;
            const bTime = b.lastMessage?.createdAt
                ? new Date(b.lastMessage.createdAt).getTime()
                : 0;
            return bTime - aTime;
        });

        return res.status(200).json({
            success: true,
            users: contactsWithActivity,
            unseenMessages,
        });
    } catch (error) {
        console.error("Get Users Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load users",
        });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const myId = req.user._id;
        const after = req.query.after ? String(req.query.after) : null;
        const before = req.query.before ? String(req.query.before) : null;
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
        if (after && before) return res.status(400).json({ success: false, message: "Use either before or after cursor" });
        if (!(await areContacts(myId, id))) return res.status(403).json({ success: false, message: "You can message only accepted contacts" });

        let query = pairQuery(myId, id);
        const cursor = after || before;
        if (cursor) {
            if (!Message.db.base.Types.ObjectId.isValid(cursor)) return res.status(400).json({ success: false, message: "Invalid message cursor" });
            const cursorMessage = await Message.findOne({ _id: cursor, ...query }).select("_id createdAt").lean();
            if (!cursorMessage) return res.status(400).json({ success: false, message: "Message cursor was not found in this conversation" });
            const comparison = after ? "$gt" : "$lt";
            query = { ...query, $and: [{ $or: [
                { createdAt: { [comparison]: cursorMessage.createdAt } },
                { createdAt: cursorMessage.createdAt, _id: { [comparison]: cursorMessage._id } },
            ] }] };
        }

        if (!before) {
            const now = new Date();
            const incomingQuery = after
                ? { ...query, senderId: id, receiverId: myId, seen: false }
                : { senderId: id, receiverId: myId, seen: false };
            const changed = await Message.updateMany(incomingQuery, { $set: { seen: true, readAt: now, deliveredAt: now } });
            if (changed.modifiedCount) emitPair(myId.toString(), id.toString(), "messagesRead", {
                readerId: myId.toString(), senderId: id.toString(), readAt: now,
            });
        }

        const sort = before || !after ? { createdAt: -1, _id: -1 } : { createdAt: 1, _id: 1 };
        let messages = await Message.find(query).populate("replyTo", "text image senderId").sort(sort).limit(limit + 1).lean();
        const hasMore = messages.length > limit;
        if (hasMore) messages = messages.slice(0, limit);
        if (before || !after) messages.reverse();

        return res.status(200).json({ success: true, messages, hasMore, nextCursor: messages.length ? messages[0]._id : null });
    } catch (error) {
        console.error("Get Messages Error:", error);
        return res.status(500).json({ success: false, message: "Unable to load messages" });
    }
};
export const getSharedMedia = async (req, res) => {
    try {
        const { id } = req.params;
        if (!(await areContacts(req.user._id, id))) {
            return res.status(403).json({ success: false, message: "You can view media only from accepted contacts" });
        }
        const media = await Message.find({
            ...pairQuery(req.user._id, id),
            image: { $exists: true, $ne: "" },
            deletedAt: null,
        }).select("_id image createdAt").sort({ createdAt: -1, _id: -1 }).limit(200).lean();
        return res.json({ success: true, media });
    } catch (error) {
        console.error("Get Shared Media Error:", error);
        return res.status(500).json({ success: false, message: "Unable to load shared media" });
    }
};

export const markMessageAsSeen = async (req, res) => {
    try {
        const message = await Message.findOneAndUpdate(
            { _id: req.params.id, receiverId: req.user._id },
            { $set: { seen: true, deliveredAt: new Date(), readAt: new Date() } },
            { new: true }
        );
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageRead", {
            messageId: message._id,
            readerId: req.user._id.toString(),
            readAt: message.readAt,
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Mark Seen Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update message status",
        });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const { text = "", image, replyTo } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        if (!(await areContacts(senderId, receiverId))) {
            return res.status(403).json({
                success: false,
                message: "Accept this contact invitation before messaging",
            });
        }
        if (typeof text !== "string" || (!text.trim() && !image)) {
            return res.status(400).json({
                success: false,
                message: "A message or image is required",
            });
        }
        if (text.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message text cannot exceed 5000 characters",
            });
        }

        let imageUrl = "";
        if (image) {
            if (
                typeof image !== "string" ||
                !/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(image)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Only image attachments are allowed",
                });
            }
            const upload = await cloudinary.uploader.upload(image, {
                resource_type: "image",
            });
            imageUrl = upload.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text: text.trim(),
            image: imageUrl,
            replyTo: replyTo || null,
            deliveredAt: null,
        });

        const recipientOnline = Boolean(
            getIO().sockets.adapter.rooms.get(`user:${receiverId}`)?.size
        );
        if (recipientOnline) {
            newMessage.deliveredAt = new Date();
            await newMessage.save();
        }

        getIO().to(`user:${receiverId}`).emit("newMessage", newMessage);
        return res.status(201).json({ success: true, newMessage });
    } catch (error) {
        console.error("Send Message Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to send message",
        });
    }
};

export const searchMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const q = String(req.query.q || "").trim().slice(0, 100);
        if (!(await areContacts(req.user._id, id))) {
            return res.status(403).json({
                success: false,
                message: "You can search only accepted conversations",
            });
        }
        if (!q) return res.json({ success: true, messages: [] });

        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const messages = await Message.find({
            ...pairQuery(req.user._id, id),
            text: { $regex: escaped, $options: "i" },
            deletedAt: null,
        })
            .sort({ createdAt: -1, _id: -1 })
            .limit(50)
            .lean();

        return res.json({ success: true, messages });
    } catch (error) {
        console.error("Search Messages Error:", error);
        return res.status(500).json({ success: false, message: "Search failed" });
    }
};

export const updateMessage = async (req, res) => {
    try {
        const { text, emoji } = req.body;
        const ownership =
            typeof emoji === "string"
                ? { $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] }
                : { senderId: req.user._id };
        const message = await Message.findOne({ _id: req.params.id, ...ownership });
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found or not authorized",
            });
        }
        if (message.deletedAt) {
            return res.status(400).json({
                success: false,
                message: "Deleted messages cannot be changed",
            });
        }
        if (
            typeof text === "string" &&
            message.senderId.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the sender can edit a message",
            });
        }
        if (typeof text === "string") {
            if (!text.trim() || text.length > 5000) {
                return res.status(400).json({
                    success: false,
                    message: "Message text must be 1–5000 characters",
                });
            }
            message.text = text.trim();
            message.editedAt = new Date();
        }
        if (typeof emoji === "string") {
            if (!emoji || emoji.length > 16) {
                return res.status(400).json({ success: false, message: "Invalid reaction" });
            }
            const existing = message.reactions.find(
                (reaction) => reaction.userId.toString() === req.user._id.toString()
            );
            if (existing?.emoji === emoji) {
                message.reactions = message.reactions.filter(
                    (reaction) => reaction.userId.toString() !== req.user._id.toString()
                );
            } else if (existing) {
                existing.emoji = emoji;
            } else {
                message.reactions.push({ userId: req.user._id, emoji });
            }
        }
        await message.save();
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageUpdated", message);
        return res.json({ success: true, message });
    } catch (error) {
        console.error("Update Message Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update message",
        });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.id,
            senderId: req.user._id,
        });
        if (!message) {
            return res.status(404).json({
                success: false,
                message: "Message not found or not yours",
            });
        }
        message.text = "";
        message.image = "";
        message.deletedAt = new Date();
        message.reactions = [];
        await message.save();
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageDeleted", {
            _id: message._id,
            deletedAt: message.deletedAt,
            text: "",
            image: "",
            reactions: [],
        });
        return res.json({ success: true, message });
    } catch (error) {
        console.error("Delete Message Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete message",
        });
    }
};

export const togglePinMessage = async (req, res) => {
    try {
        const message = await Message.findOne({
            _id: req.params.id,
            $or: [{ senderId: req.user._id }, { receiverId: req.user._id }],
        });
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }
        if (message.deletedAt) {
            return res.status(400).json({
                success: false,
                message: "Deleted messages cannot be pinned",
            });
        }
        message.isPinned = !message.isPinned;
        message.pinnedAt = message.isPinned ? new Date() : null;
        await message.save();
        emitPair(message.senderId.toString(), message.receiverId.toString(), "messageUpdated", message);
        return res.json({ success: true, message });
    } catch (error) {
        console.error("Pin Message Error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update pinned message",
        });
    }
};


const allowedWallpapers = new Set(["default", "midnight", "ocean", "forest", "sunset", "aurora", "stardust", "geometry", "glass", "minimal", "dreamscape", "ember"]);

export const getConversationWallpaper = async (req, res) => {
    try {
        const otherUserId = req.params.id;
        if (!otherUserId || otherUserId === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "Invalid conversation." });
        }
        const contact = await ContactRequest.findOne({
            status: "accepted",
            $or: [
                { sender: req.user._id, recipient: otherUserId },
                { sender: otherUserId, recipient: req.user._id },
            ],
        }).select("wallpaper").lean();
        if (!contact) return res.status(403).json({ success: false, message: "This conversation is not available." });
        return res.status(200).json({ success: true, wallpaper: contact.wallpaper || "default" });
    } catch (error) {
        console.error("Get conversation wallpaper error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load conversation theme." });
    }
};

export const updateConversationWallpaper = async (req, res) => {
    try {
        const otherUserId = req.params.id;
        const wallpaper = String(req.body?.wallpaper || "");
        if (!otherUserId || otherUserId === req.user._id.toString() || !allowedWallpapers.has(wallpaper)) {
            return res.status(400).json({ success: false, message: "Choose a valid conversation theme." });
        }
        const contact = await ContactRequest.findOneAndUpdate(
            {
                status: "accepted",
                $or: [
                    { sender: req.user._id, recipient: otherUserId },
                    { sender: otherUserId, recipient: req.user._id },
                ],
            },
            { $set: { wallpaper } },
            { new: true, runValidators: true }
        ).select("sender recipient wallpaper").lean();

        if (!contact) return res.status(403).json({ success: false, message: "This conversation is not available." });

        const payload = {
            userIds: [contact.sender.toString(), contact.recipient.toString()],
            wallpaper: contact.wallpaper,
        };
        const io = getIO();
        payload.userIds.forEach((id) => io.to(`user:${id}`).emit("conversationWallpaperUpdated", payload));
        return res.status(200).json({ success: true, wallpaper: contact.wallpaper });
    } catch (error) {
        console.error("Update conversation wallpaper error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to update conversation theme." });
    }
};
