import express from "express";
import {
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getUserProfile,
    updateUserProfile
} from "../controllers/authController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Nyilvános útvonalak (bárki elérheti)
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/verify/:token", verifyEmail);

// Védett útvonalak (csak érvényes tokennel)
router.get("/profile", authenticateToken, getUserProfile);
router.put("/profile/update", authenticateToken, updateUserProfile);

export default router;