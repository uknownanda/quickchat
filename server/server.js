import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";

import { connectDB } from "./lib/db.js";
import { initializeSocket } from "./lib/socket.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import contactRouter from "./routes/contactRoutes.js";

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://quickchat-two-mu.vercel.app",
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

app.use(express.json({ limit: "7mb" }));

app.get("/", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "QuickChat API and Socket.IO are running",
    });
});

app.get("/api/status", (_req, res) => {
    const databaseState = ["disconnected", "connected", "connecting", "disconnecting"][
        mongoose.connection.readyState
    ] || "unknown";
    const healthy = mongoose.connection.readyState === 1;

    res.status(healthy ? 200 : 503).json({
        success: healthy,
        message: healthy ? "Server and database are healthy" : "Server is running; database is unavailable",
        database: databaseState,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

const ensureDatabase = async (_req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        res.status(503).json({
            success: false,
            message: "Database is temporarily unavailable. Please retry shortly.",
        });
    }
};

app.use("/api/auth", ensureDatabase, userRouter);
app.use("/api/contacts", ensureDatabase, contactRouter);
app.use("/api/messages", ensureDatabase, messageRouter);

app.use((req, res) => res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
}));

app.use((error, _req, res, _next) => {
    console.error("Unhandled backend error:", error);
    if (res.headersSent) return;
    const status = error.status === 413 ? 413 : 500;
    res.status(status).json({
        success: false,
        message: status === 413 ? "Request payload is too large" : "Internal server error",
    });
});

initializeSocket(httpServer, allowedOrigins);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`QuickChat API + Socket.IO listening on port ${PORT}`);
});

const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down gracefully`);
    httpServer.close(async () => {
        try {
            await mongoose.connection.close();
            process.exit(0);
        } catch (error) {
            console.error("Error while closing MongoDB:", error.message);
            process.exit(1);
        }
    });
    setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
