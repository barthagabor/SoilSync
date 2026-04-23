import jwt from "jsonwebtoken";
import User from "../models/User.js";


const JWT_SECRET = process.env.JWT_SECRET || "szupertitkoskulcs_soilsync_2025";


export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user; // Itt lesz a userId: req.user.userId
        next();
    });
};


export const requireSystemRole = (allowedRoles = []) => async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.user.userId).select("systemRole email name");
        if (!currentUser) {
            return res.status(401).json({ message: "User not found." });
        }

        if (!allowedRoles.includes(currentUser.systemRole)) {
            return res.status(403).json({ message: "Admin access required." });
        }

        req.currentUser = currentUser;
        next();
    } catch (err) {
        console.error("Role check error:", err);
        res.status(500).json({ message: "Server error during role check." });
    }
};


export const requireAdmin = requireSystemRole(["admin", "superadmin"]);
export const requireSuperAdmin = requireSystemRole(["superadmin"]);