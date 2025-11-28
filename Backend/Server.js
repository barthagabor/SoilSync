import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./utils/sendEmail.js";
// HA NEM használod itt az API-t, ezt akár ki is veheted:
// import { perenualRequest } from "./utils/perenualApi.js";
import crypto from "crypto";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();

// 🔧 CORS – fejlesztéshez engedjünk mindent, ne vacakoljon porttal
app.use(cors());

// ha nagyon ragaszkodsz a szigorúhoz, akkor inkább ez legyen:
// app.use(
//     cors({
//         origin: "http://localhost:5173",
//         credentials: true,
//     })
// );

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
    .connect("mongodb://127.0.0.1:27017/soilsync")
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

// 🔹 Perenual növény kollekció (Mongo: Perenual_Plants)
const perenualPlantSchema = new mongoose.Schema({}, { strict: false });
const PerenualPlant = mongoose.model(
    "PerenualPlant",
    perenualPlantSchema,
    "Perenual_Plants"
);

// --- AUTH RÉSZEK ---

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

// 🌱 Perenual plants list endpoint
app.get("/plants", async (req, res) => {
    try {
        let { page = 1, limit = 24, search = "" } = req.query;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 24;
        const skip = (pageNumber - 1) * limitNumber;

        const query = {};

        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { common_name: regex },
                { scientific_name: regex }, // scientific_name array-t is elkapja
                { genus: regex },
                { family: regex },
            ];
        }

        const [total, plants] = await Promise.all([
            PerenualPlant.countDocuments(query),
            PerenualPlant.find(query)
                .sort({ common_name: 1 })
                .skip(skip)
                .limit(limitNumber),
        ]);

        res.json({
            data: plants,
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
        });
    } catch (err) {
        console.error("❌ Error fetching plants:", err);
        res.status(500).json({ message: "Server error while fetching plants." });
    }
});

// 🌱 Egyetlen növény lekérése ID alapján
app.get("/plants/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const plant = await PerenualPlant.findOne({ id: Number(id) });

        if (!plant) {
            return res.status(404).json({ message: "Plant not found" });
        }

        res.json(plant);

    } catch (err) {
        console.error("❌ Error fetching plant details:", err);
        res.status(500).json({ message: "Server error while fetching plant details." });
    }
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));
