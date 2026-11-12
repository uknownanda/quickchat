import { Server } from "socket.io";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import ContactRequest from "../models/ContactRequest.js";
let io;
export const userSocketmap = {};
export const initializeSocket = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, { cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true } });
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token || !process.env.JWT_SECRET) {
                return next(new Error("Unauthorized"));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
            if (!decoded?.userId || !Number.isFinite(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) return next(new Error("Unauthorized"));
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
        if (userId) {
            socket.join(`user:${userId}`);
            userSocketmap[userId] = (userSocketmap[userId] || 0) + 1;
            await User.findByIdAndUpdate(userId, { $set: { lastSeen: new Date() } }).catch(() => {});
            io.emit("presenceUpdated", { userId, online: true });
        }
        io.emit("getOnlineUsers", Object.keys(userSocketmap));
        socket.on("typing", async ({ to, isTyping } = {}) => {
            if (!to || to === userId) return;
            try {
                
                const connected = await ContactRequest.exists({
                    status: "accepted",
                    $or: [{ sender: userId, recipient: to }, { sender: to, recipient: userId }],
                });
                if (connected) io.to(`user:${to}`).emit("typing", { from: userId, isTyping: Boolean(isTyping) });
            } catch (error) {
                console.error("Typing event failed:", error.message);
            }
        });
        socket.on("disconnect", async () => {
            if (userId) {
                userSocketmap[userId] = Math.max(0, (userSocketmap[userId] || 1) - 1);
                if (!userSocketmap[userId]) {
                    delete userSocketmap[userId];
                    const lastSeen = new Date();
                    await User.findByIdAndUpdate(userId, { $set: { lastSeen } }).catch(() => {});
                    io.emit("presenceUpdated", { userId, online: false, lastSeen });
                }
            }
            io.emit("getOnlineUsers", Object.keys(userSocketmap));
        });
    });
    return io;
};
export const getIO = () => { if (!io) throw new Error("Socket.IO has not been initialized"); return io; };
