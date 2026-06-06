import User from "../models/User.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { isEmailDeliveryConfigured, sendVerificationEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";
import { ensureCommunityIdentity } from "../services/communityIdentityService.js";
import { getJwtSecret } from "../utils/jwt.js";

const shouldRequireEmailVerification = () => process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
const isEmailVerificationActive = () => shouldRequireEmailVerification() && isEmailDeliveryConfigured();
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim();
const isDuplicateKeyError = (error) => Number(error?.code) === 11000;

export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const normalizedName = normalizeName(name);
        const normalizedEmail = normalizeEmail(email);
        const normalizedPassword = String(password || "");

        if (!normalizedName || !normalizedEmail || !normalizedPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (normalizedPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered." });
        }

        const requireEmailVerification = isEmailVerificationActive();
        const verificationToken = requireEmailVerification ? Math.random().toString(36).substring(2, 15) : null;

        const newUser = new User({
            name: normalizedName,
            email: normalizedEmail,
            password: normalizedPassword,
            verificationToken,
            verified: !requireEmailVerification,
        });

        await ensureCommunityIdentity(newUser);
        await newUser.save();

        if (requireEmailVerification) {
            try {
                await sendVerificationEmail(email, verificationToken);
            } catch (emailError) {
                await User.deleteOne({ _id: newUser._id });
                throw emailError;
            }
        }

        res.status(201).json({
            message: requireEmailVerification
                ? "Registration successful! Please verify your email."
                : "Registration successful! You can now log in.",
        });
    } catch (err) {
        if (isDuplicateKeyError(err)) {
            const duplicateField = Object.keys(err?.keyPattern || err?.keyValue || {})[0];

            if (duplicateField === "email") {
                return res.status(400).json({ message: "Email is already registered." });
            }

            if (duplicateField === "communityUsername") {
                return res.status(400).json({ message: "That display identity is already taken. Please try again." });
            }

            return res.status(400).json({ message: "This account already exists." });
        }

        console.error("Registration error:", err);
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

        res.send("Email successfully verified! You can now log in.");
    } catch (err) {
        res.status(500).send("Server error during verification.");
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });
        if (!isEmailDeliveryConfigured()) {
            return res.status(503).json({ message: "Password reset email is not configured yet." });
        }

        const normalizedEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.json({ message: "If this email exists, a reset link has been sent." });
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();

        await sendPasswordResetEmail(normalizedEmail, token);
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
            $or: [{ email: identifier }, { name: identifier }, { communityUsername: identifier }],
        });

        if (!user) {
            return res.status(400).json({ message: "User not found." });
        }

        if (isEmailVerificationActive() && !user.verified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password." });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            getJwtSecret(),
            { expiresIn: "7d" }
        );

        await ensureCommunityIdentity(user, { save: true });

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                communityUsername: user.communityUsername,
                profileImage: user.profileImage,
                role: user.role,
                systemRole: user.systemRole,
                subscriptionPlan: user.subscriptionPlan,
                premiumStatus: user.premiumStatus,
                premiumActivatedAt: user.premiumActivatedAt,
                premiumExpiresAt: user.premiumExpiresAt,
            },
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        await ensureCommunityIdentity(user, { save: true });
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

        await ensureCommunityIdentity(user);
        await user.save();
        res.json({ message: "Profile updated successfully!", user });
    } catch (err) {
        res.status(500).json({ message: "Error updating profile." });
    }
};
