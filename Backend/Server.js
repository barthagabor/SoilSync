import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./utils/sendEmail.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import fs from "fs";

dotenv.config();

const app = express();
app.use(
    cors({
        origin: "http://localhost:5173", // Vite frontend URL
        credentials: true,               // allows sending cookies / headers
    })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
    .connect("mongodb://127.0.0.1:27017/soilsync", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

// 🔹 Registration
app.post("/register", async (req, res) => {
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

        // ✅ Send verification email
        await sendVerificationEmail(email, verificationToken);

        res.status(201).json({ message: "Registration successful! Please verify your email." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// 🔹 Email verification
app.get("/verify/:token", async (req, res) => {
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
});

// 🔹 Forgot password
app.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await User.findOne({ email });
        if (!user) {
            // for security reasons, don’t reveal if the user doesn’t exist
            return res.json({ message: "If this email exists, a reset link has been sent." });
        }

        const token = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = token;
        user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();

        await sendPasswordResetEmail(email, token);
        res.json({ message: "If this email exists, a reset link has been sent." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});

// 🔹 Reset password
app.post("/reset-password/:token", async (req, res) => {
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
});

// 🔹 Login
app.post("/login", async (req, res) => {
    const { identifier, password } = req.body;

    try {
        // Search by email or username
        const user = await User.findOne({
            $or: [{ email: identifier }, { name: identifier }],
        });

        if (!user) {
            return res.status(400).json({ message: "User not found." });
        }

        // Check if email is verified
        if (!user.verified) {
            return res.status(403).json({ message: "Please verify your email before logging in." });
        }

        // Password check
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password." });
        }

        // Later, add JWT token here
        const fakeToken = Math.random().toString(36).substring(2, 15);

        res.status(200).json({
            message: "Login successful!",
            token: fakeToken,
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
});


const plantSchema = new mongoose.Schema({}, { strict: false });
const PlantCollection = mongoose.model("PlantCollection", plantSchema, "Plants_DB");

app.get("/plants", async (req, res) => {
    try {
        const { search, category, climat, page = 1, limit = 20 } = req.query;

        const doc = await PlantCollection.findOne();
        if (!doc || !doc.HousePlantsTable) {
            return res.status(404).json({ message: "Növényadatok nem találhatók." });
        }

        let plants = doc.HousePlantsTable.map((p) => p.PutRequest.Item);

        // --- Szűrés és keresés ---
        if (search) {
            const term = search.toLowerCase();
            plants = plants.filter(
                (p) =>
                    p["Latin name"]?.toLowerCase().includes(term) ||
                    (Array.isArray(p["Common name"]) &&
                        p["Common name"].some((n) => n.toLowerCase().includes(term)))
            );
        }

        if (category) {
            plants = plants.filter(
                (p) => p.Categories?.toLowerCase() === category.toLowerCase()
            );
        }

        if (climat) {
            plants = plants.filter(
                (p) => p.Climat?.toLowerCase() === climat.toLowerCase()
            );
        }

        // --- Lapozás ---
        const start = (page - 1) * limit;
        const end = start + Number(limit);
        const paginated = plants.slice(start, end);

        res.json({
            total: plants.length,
            page: Number(page),
            totalPages: Math.ceil(plants.length / limit),
            data: paginated,
        });
    } catch (err) {
        console.error("❌ Hiba a növények lekérdezésekor:", err);
        res.status(500).json({ message: "Szerverhiba." });
    }
});

app.get("/plants/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const PlantCollection = mongoose.model("PlantCollection", new mongoose.Schema({}, { strict: false }), "Plants_DB");
        const doc = await PlantCollection.findOne();

        if (!doc || !doc.HousePlantsTable) {
            return res.status(404).json({ message: "Plant data not found." });
        }

        const plants = doc.HousePlantsTable.map((p) => p.PutRequest.Item);
        const plant = plants.find((p) => p.id === id);

        if (!plant) {
            return res.status(404).json({ message: "Plant not found." });
        }

        res.json(plant);
    } catch (err) {
        console.error("❌ Error fetching plant:", err);
        res.status(500).json({ message: "Server error." });
    }
});
app.listen(5000, () => console.log("✅ Server running on port 5000"));
