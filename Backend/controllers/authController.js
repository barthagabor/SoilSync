import User from "../models/User.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Feltételezem, hogy ezek a fájlok megvannak, ha korábban működött
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";

const JWT_SECRET = process.env.JWT_SECRET || "szupertitkoskulcs_soilsync_2025";


export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        const verificationToken = Math.random().toString(36).substring(2, 15);

        const newUser = new User({
            name,
            email,
            password,
            verificationToken,
        });

        await newUser.save();

        await sendVerificationEmail(email, verificationToken);

        res.status(201).json({ message: "Registration successful! Please verify your email." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error during registration." });
    }
};


export const verifyEmail = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({ verificationToken: token });
        if (!user) {
            return res.status(400).send("Invalid or expired verification link.");
        }

        user.verified = true;
        user.verificationToken = null;
        await user.save();

        res.send("✅ Email successfully verified! You can now log in.");
    } catch (err) {
        res.status(500).send("Server error during verification.");
    }
};


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: "If this email exists, a reset link has been sent." });
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();

        await sendPasswordResetEmail(email, token);
        res.json({ message: "If this email exists, a reset link has been sent." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
};


export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long." });
        }

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired password reset link." });
        }

        user.password = password;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        res.json({ message: "Password updated successfully. You can now log in." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
};


export const loginUser = async (req, res) => {
    const { identifier, password } = req.body;

    try {
        const user = await User.findOne({
            $or: [{ email: identifier }, { name: identifier }],
        });

        if (!user) {
            return res.status(400).json({ message: "User not found." });
        }

        if (!user.verified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password." });
        }

        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role,
                systemRole: user.systemRole,
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
};


export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile." });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { name, bio, location, profileImage } = req.body;
        const user = await User.findById(req.user.userId);

        if (name) user.name = name;
        if (bio) user.bio = bio;
        if (location) user.location = location;
        if (profileImage) user.profileImage = profileImage;

        await user.save();
        res.json({ message: "Profile updated successfully!", user });
    } catch (err) {
        res.status(500).json({ message: "Error updating profile." });
    }
};