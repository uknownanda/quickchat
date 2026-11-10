import { Server } from "socket.io";
import User from "../models/User.js";
let io;
export const userSocketmap = {};
export const initializeSocket = (httpServer, allowedOrigins) => {
    io = new Server(httpServer, { cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true } });
    io.on("connection", async (socket) => {
        const userId = socket.handshake.query.userId?.toString();
        if (userId) {
            socket.join(`user:${userId}`);
            userSocketmap[userId] = (userSocketmap[userId] || 0) + 1;
            await User.findByIdAndUpdate(userId, { $set: { lastSeen: new Date() } }).catch(() => {});
            io.emit("presenceUpdated", { userId, online: true });
        }
        io.emit("getOnlineUsers", Object.keys(userSocketmap));
        socket.on("typing", ({ to, isTyping }) => { if (userId && to) io.to(`user:${to}`).emit("typing", { from: userId, isTyping: Boolean(isTyping) }); });
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
