import express from "express";
import { chatWithPremiumAssistant } from "../controllers/premiumController.js";
import { authenticateToken, requirePremium } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/assistant/chat", authenticateToken, requirePremium, chatWithPremiumAssistant);

export default router;
