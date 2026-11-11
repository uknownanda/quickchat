import mongoose from "mongoose";

let connectionPromise = null;

const connectOptions = {
    dbName: process.env.MONGODB_DB_NAME || "chat-app",
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
    minPoolSize: 0,
    retryReads: true,
    retryWrites: true,
};

mongoose.connection.on("connected", () => {
    console.log("MongoDB connection established");
});

mongoose.connection.on("reconnected", () => {
    console.log("MongoDB connection restored");
});

mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB connection lost; Mongoose will attempt to reconnect");
});

mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
});

export const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is missing");
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGODB_URI, connectOptions)
            .catch((error) => {
                connectionPromise = null;
                throw error;
            });
    }

    try {
        await connectionPromise;
        return mongoose.connection;
    } catch (error) {
        connectionPromise = null;
        throw error;
    }
};
