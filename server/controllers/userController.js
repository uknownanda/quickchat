import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import {
    isValidEmail,
    isValidProfileImage,
    normalizeEmail,
    validateProfileFields,
} from "../lib/security.js";

export const checkUsername = async (req, res) => {
    const username = String(req.query.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ success: false, available: false, message: "Use 3–20 characters: letters, numbers, and underscores." });
    }
    const exists = await User.exists({ username });
    return res.json({ success: true, available: !exists });
};

export const signup = async (req, res) => {
    try {
        const { fullName, username, password, bio = "" } = req.body || {};
        const normalizedUsername = String(username || "").trim().toLowerCase();
        const normalizedEmail = normalizeEmail(req.body?.email);
        const profileError = validateProfileFields({ fullName, bio });
        if (profileError) return res.status(400).json({ success: false, message: profileError });
        if (!normalizedUsername || !normalizedEmail || typeof password !== "string") {
            return res.status(400).json({ success: false, message: "Please complete all required fields." });
        }
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }
        if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
            return res.status(400).json({ success: false, message: "Username must be 3–20 characters and contain only letters, numbers, or underscores." });
        }
        if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes." });
        }
        const [emailExists, usernameExists] = await Promise.all([
            User.exists({ email: normalizedEmail }),
            User.exists({ username: normalizedUsername }),
        ]);
        if (emailExists) return res.status(409).json({ success: false, message: "An account with this email already exists." });
        if (usernameExists) return res.status(409).json({ success: false, message: "That username is already taken. Try another one." });

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            fullName: fullName.trim(),
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword,
            bio: bio.trim(),
        });
        const token = generateToken(newUser._id);
        const userData = await User.findById(newUser._id).select("-password");
        return res.status(201).json({ success: true, userData, token, message: "Your QuickChat account is ready." });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            return res.status(409).json({ success: false, message: field === "username" ? "That username is already taken." : "An account with this email already exists." });
        }
        console.error("Signup Error:", error.message);
        return res.status(500).json({ success: false, message: "Could not create your account. Please try again." });
    }
};

export const login = async (req, res) => {
    try {
        const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || "").trim().toLowerCase();
        const password = req.body?.password;
        if (!identifier || typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ success: false, message: "Enter your username or email and password." });
        }
        const userData = await User.findOne({
            $or: [{ email: identifier }, { username: identifier.replace(/^@/, "") }],
        });
        if (!userData || !(await bcrypt.compare(password, userData.password))) {
            return res.status(401).json({ success: false, message: "Incorrect username/email or password." });
        }
        const token = generateToken(userData._id);
        const safeUserData = await User.findById(userData._id).select("-password");
        return res.status(200).json({ success: true, userData: safeUserData, token, message: "Welcome back!" });
    } catch (error) {
        console.error("Login Error:", error.message);
        return res.status(500).json({ success: false, message: "Login failed. Please try again." });
    }
};

export const checkAuth = (req, res) => res.status(200).json({ success: true, user: req.user });

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body || {};
        const profileError = validateProfileFields({ fullName, bio });
        if (profileError) return res.status(400).json({ success: false, message: profileError });
        if (profilePic !== undefined && profilePic !== "" && !isValidProfileImage(profilePic)) {
            return res.status(400).json({ success: false, message: "Profile image must be a valid PNG, JPEG, WEBP or GIF image under 5 MB." });
        }

        const updates = { fullName: fullName.trim(), bio: bio.trim() };
        if (profilePic) {
            const upload = await cloudinary.uploader.upload(profilePic, {
                resource_type: "image",
                folder: "quickchat/profiles",
            });
            updates.profilePic = upload.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true },
        ).select("-password");

        if (!updatedUser) return res.status(404).json({ success: false, message: "User not found." });
        return res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Profile Update Error:", error.message);
        return res.status(500).json({ success: false, message: "Profile update failed. Please try again." });
    }
};
