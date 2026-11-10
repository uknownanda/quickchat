import User from "../models/User.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization;
        const token = req.headers.token ||
            (authorization?.startsWith("Bearer ")
                ? authorization.slice(7)
                : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: token not provided",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET environment variable is missing");
            return res.status(500).json({
                success: false,
                message: "Authentication is not configured on the server",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error("Authentication error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
