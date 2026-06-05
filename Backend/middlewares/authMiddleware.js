import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getJwtSecret } from "../utils/jwt.js";

const hasActivePremium = (user) =>
    user?.subscriptionPlan === "premium" && user?.premiumStatus === "active";

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

export const attachUserIfPresent = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        next();
        return;
    }

    jwt.verify(token, getJwtSecret(), (err, user) => {
        if (!err) {
            req.user = user;
        }

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

export const requirePremium = async (req, res, next) => {
    try {
        const currentUser = await User.findById(req.user.userId).select(
            "name email subscriptionPlan premiumStatus premiumExpiresAt"
        );
        if (!currentUser) {
            return res.status(401).json({ message: "User not found." });
        }

        if (!hasActivePremium(currentUser)) {
            return res.status(403).json({
                message: "Premium access is required for this feature.",
            });
        }

        req.currentUser = currentUser;
        next();
    } catch (err) {
        console.error("Premium access check error:", err);
        res.status(500).json({ message: "Server error during premium access check." });
    }
};
