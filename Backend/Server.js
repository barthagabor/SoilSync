import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./utils/sendEmail.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // FONTOS: npm install jsonwebtoken

dotenv.config();

const app = express();

// 🔧 CORS – fejlesztéshez engedjünk mindent, ne vacakoljon porttal
app.use(cors());

<<<<<<< Updated upstream
// ha nagyon ragaszkodsz a szigorúhoz, akkor inkább ez legyen:
// app.use(
//     cors({
//         origin: "http://localhost:5173",
//         credentials: true,
//     })
// );

app.use(express.json({ limit: '10mb' })); // Limit növelése a képek miatt!
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
=======

app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));


app.use("/", authRoutes);
>>>>>>> Stashed changes

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

// A GET /plants végpont elején definiáld a régiókat
const REGION_MAPPING = {
    "Europe": ["Europe", "Germany", "France", "Italy", "Spain", "United Kingdom", "Hungary", "Austria", "Romania", "Ukraine", "Poland"],
    "Oceania": ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Samoa"],
    "North America": ["United States", "Canada", "Mexico"],
    "Asia": ["China", "Japan", "India", "Thailand", "Vietnam", "Indonesia", "South Korea"],
    "Africa": ["South Africa", "Egypt", "Nigeria", "Kenya", "Morocco"],
    "South America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru"]
};

// --- JWT SECRET ---
// Élesben ezt a .env fájlba tedd: JWT_SECRET=valami_nagyon_titkos
const JWT_SECRET = process.env.JWT_SECRET || "szupertitkoskulcs_soilsync_2025";

// --- MIDDLEWARE: Token ellenőrzés (EZ HIÁNYZOTT!) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user; // Itt lesz a userId: req.user.userId
        next();
    });
};

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

        // IGAZI JWT TOKEN GENERÁLÁS
        const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: {
                name: user.name,
                email: user.email,
                profileImage: user.profileImage
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error during login." });
    }
});

// 🔹 GET CURRENT USER PROFILE (Profil oldalhoz)
app.get("/profile", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password"); // Jelszót ne küldjük vissza
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Error fetching profile." });
    }
});

// 🔹 UPDATE PROFILE (Képfeltöltés, adatok)
app.put("/profile/update", authenticateToken, async (req, res) => {
    try {
        const { name, bio, location, profileImage } = req.body;
        const user = await User.findById(req.user.userId);

        if (name) user.name = name;
        if (bio) user.bio = bio;
        if (location) user.location = location;
        if (profileImage) user.profileImage = profileImage; // Base64 string

        await user.save();
        res.json({ message: "Profile updated successfully!", user });
    } catch (err) {
        res.status(500).json({ message: "Error updating profile." });
    }
});

// 🌱 Növények listázása szűréssel
app.get("/plants", async (req, res) => {
    try {
        // !!! ITT ADTAM HOZZÁ AZ 'origin'-t a listához !!!
        let { page = 1, limit = 24, search = "", watering, sunlight, care_level, type, cycle, origin } = req.query;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 24;
        const skip = (pageNumber - 1) * limitNumber;

        const query = {};

        // Keresés (Search)
        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { common_name: regex },
                { scientific_name: regex },
                { genus: regex },
                { family: regex },
            ];
        }

        // --- SZŰRŐK ---

        if (watering) query['details.watering'] = watering;
        if (care_level) query['details.care_level'] = care_level;
        if (type) query.type = new RegExp(type, "i");
        if (cycle) query.cycle = new RegExp(cycle, "i");
        if (sunlight) query['details.sunlight'] = { $in: [new RegExp(sunlight, "i")] };

        // !!! ITT VAN A HIÁNYZÓ ORIGIN LOGIKA !!!
        if (origin) {
            // Megnézzük, hogy a választott origin (pl. "Oceania") szerepel-e a térképünkben
            const mappedCountries = REGION_MAPPING[origin];

            if (mappedCountries) {
                // Ha régió (pl. Oceania), akkor keressük bármelyik hozzá tartozó országot
                query['details.origin'] = {
                    $in: mappedCountries.map(c => new RegExp(c, "i"))
                };
            } else {
                // Ha nem régió (pl. "Australia"), akkor keressük simán a nevet
                query['details.origin'] = { $in: [new RegExp(origin, "i")] };
            }
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

// 🌍 ÚJ VÉGPONT: Összes elérhető régió/ország lekérése az adatbázisból
app.get("/regions", async (req, res) => {
    try {
        // Aggregáció:
        // 1. $unwind: A növények 'details.origin' tömbjét szétszedjük külön dokumentumokra
        // 2. $group: Csoportosítjuk őket név szerint (így eltűnnek a duplikációk)
        // 3. $sort: ABC sorrendbe rendezzük
        const regions = await PerenualPlant.aggregate([
            { $unwind: "$details.origin" },
            {
                $group: {
                    _id: "$details.origin"
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    name: "$_id"
                }
            }
        ]);

        // Az eredmény egy tömb lesz: [{ name: "Afghanistan" }, { name: "Albania" }, ...]
        // Ezt egyszerűsítjük egy sima string tömbbé: ["Afghanistan", "Albania", ...]
        const regionList = regions.map(r => r.name).filter(Boolean); // filter(Boolean) kiszűri a null/üres értékeket

        res.json(regionList);

    } catch (err) {
        console.error("❌ Error fetching regions:", err);
        res.status(500).json({ message: "Server error while fetching regions." });
    }
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));