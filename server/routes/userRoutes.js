import express from "express";
import { checkAuth, checkUsername, login, signup, updateProfile } from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";
import { createRateLimiter } from "../lib/security.js";

const userRouter = express.Router();
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many authentication attempts. Please wait 15 minutes and try again." });
const usernameLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: "Too many username checks. Please slow down." });

userRouter.get("/check-username", usernameLimiter, checkUsername);
userRouter.post("/signup", authLimiter, signup);
userRouter.post("/login", authLimiter, login);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);

export default userRouter;
