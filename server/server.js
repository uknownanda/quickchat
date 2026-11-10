import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";

import { connectDB } from "./lib/db.js";
import { initializeSocket } from "./lib/socket.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import contactRouter from "./routes/contactRoutes.js";

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://chat-app-frontend-v2-three.vercel.app",
    "http://localhost:5173",
].filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token"],
}));

app.use(express.json({ limit: "4mb" }));

app.get("/", (_req, res) => {
    res.status(200).json({ success: true, message: "Chat App API and Socket.IO are running" });
});

app.get("/api/status", (_req, res) => {
    res.status(200).json({ success: true, message: "Server is live", database: "not checked" });
});

app.use("/api/auth", async (_req, res, next) => {
    try { await connectDB(); next(); }
    catch (error) {
        console.error("MongoDB connection failed:", error.message);
        res.status(503).json({ success: false, message: "Database connection failed. Check backend logs." });
    }
});

app.use("/api/contacts", async (_req, res, next) => {
    try { await connectDB(); next(); }
    catch (error) { console.error("MongoDB connection failed:", error.message); res.status(503).json({ success: false, message: "Database connection failed" }); }
});

app.use("/api/messages", async (_req, res, next) => {
    try { await connectDB(); next(); }
    catch (error) {
        console.error("MongoDB connection failed:", error.message);
        res.status(503).json({ success: false, message: "Database connection failed. Check backend logs." });
    }
});

app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/contacts", contactRouter);

app.use((req, res) => res.status(404).json({
    success: false, message: `Route not found: ${req.method} ${req.originalUrl}`,
}));

app.use((error, _req, res, _next) => {
    console.error("Unhandled backend error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
});

initializeSocket(httpServer, allowedOrigins);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Chat App API + Socket.IO listening on port ${PORT}`);
});

export default app;
