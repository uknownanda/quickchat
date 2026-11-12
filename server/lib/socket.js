import { Server } from "socket.io";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import ContactRequest from "../models/ContactRequest.js";

let io;

// Track socket IDs rather than a connection counter so duplicate disconnects,
// reconnect races, and multiple devices cannot incorrectly mark a user offline.
export const userSocketmap = new Map();

const getOnlineUserIds = () => Array.from(userSocketmap.entries())
    .filter(([, socketIds]) => socketIds.size > 0)
    .map(([userId]) => userId);

const broadcastOnlineUsers = () => {
    if (io) io.emit("getOnlineUsers", getOnlineUserIds());
};

export const initializeSocket = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, {
        cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token || !process.env.JWT_SECRET) return next(new Error("Unauthorized"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
            if (!decoded?.userId || !Number.isFinite(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) {
                return next(new Error("Unauthorized"));
            }

            const user = await User.findById(decoded.userId).select("_id").lean();
            if (!user) return next(new Error("Unauthorized"));

            socket.data.userId = user._id.toString();
            return next();
        } catch {
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", async (socket) => {
        const userId = socket.data.userId;
        if (!userId) return;

        socket.join(`user:${userId}`);

        const wasOffline = !userSocketmap.has(userId);
        if (!userSocketmap.has(userId)) userSocketmap.set(userId, new Set());
        userSocketmap.get(userId).add(socket.id);

        // Send an authoritative snapshot to the newly connected client.
        socket.emit("getOnlineUsers", getOnlineUserIds());
        if (wasOffline) {
            io.emit("presenceUpdated", { userId, online: true });
        }
        broadcastOnlineUsers();

        await User.findByIdAndUpdate(userId, { $set: { lastSeen: new Date() } }).catch((error) => {
            console.error("Could not update connection timestamp:", error.message);
        });

        // Clients can request a fresh snapshot after reconnecting or recovering.
        socket.on("requestOnlineUsers", () => {
            socket.emit("getOnlineUsers", getOnlineUserIds());
        });

        socket.on("typing", async ({ to, isTyping } = {}) => {
            if (!to || to === userId) return;
            try {
                const connected = await ContactRequest.exists({
                    status: "accepted",
                    $or: [{ sender: userId, recipient: to }, { sender: to, recipient: userId }],
                });
                if (connected) {
                    io.to(`user:${to}`).emit("typing", { from: userId, isTyping: Boolean(isTyping) });
                }
            } catch (error) {
                console.error("Typing event failed:", error.message);
            }
        });

        socket.on("disconnect", async () => {
            const activeSockets = userSocketmap.get(userId);
            if (!activeSockets) return;

            activeSockets.delete(socket.id);
            if (activeSockets.size === 0) {
                userSocketmap.delete(userId);
                const lastSeen = new Date();
                await User.findByIdAndUpdate(userId, { $set: { lastSeen } }).catch((error) => {
                    console.error("Could not update last-seen timestamp:", error.message);
                });
                io.emit("presenceUpdated", { userId, online: false, lastSeen });
            }
            broadcastOnlineUsers();
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.IO has not been initialized");
    return io;
};
