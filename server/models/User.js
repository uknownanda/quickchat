import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: {
        type: String, required: true, unique: true, lowercase: true, trim: true,
        minlength: 3, maxlength: 20,
        match: /^[a-z0-9_]+$/
    },
    fullName: { type: String, required: true, trim: true, maxlength: 60 },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },
    bio: { type: String, default: "" },
    lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
