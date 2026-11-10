import mongoose from "mongoose";

const globalCache = globalThis;

if (!globalCache.mongooseCache) {
    globalCache.mongooseCache = {
        connection: null,
        promise: null,
    };
}

const cache = globalCache.mongooseCache;

export const connectDB = async () => {
    if (cache.connection && mongoose.connection.readyState === 1) {
        return cache.connection;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is missing");
    }

    if (!cache.promise) {
        cache.promise = mongoose.connect(process.env.MONGODB_URI, {
            dbName: "chat-app",
            serverSelectionTimeoutMS: 10000,
        });
    }

    try {
        cache.connection = await cache.promise;
        console.log("MongoDB connected successfully");
        return cache.connection;
    } catch (error) {
        cache.promise = null;
        cache.connection = null;
        console.error("MongoDB connection error:", error.message);
        throw error;
    }
};
