import express from "express";
import {
    createAdminPlant,
    deleteAdminPlant,
    getAdminPlants,
    getAdminUsers,
    updatePlantCatalogStatus,
    updateUserSubscription,
    updateUserSystemRole,
    deleteUserBySuperAdmin,
} from "../controllers/adminController.js";
import { authenticateToken, requireAdmin, requireSuperAdmin } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.get("/users", authenticateToken, requireAdmin, getAdminUsers);
router.patch("/users/:userId/system-role", authenticateToken, requireSuperAdmin, updateUserSystemRole);
router.patch("/users/:userId/subscription", authenticateToken, requireSuperAdmin, updateUserSubscription);
router.get("/plants", authenticateToken, requireAdmin, getAdminPlants);
router.post("/plants", authenticateToken, requireAdmin, createAdminPlant);
router.patch("/plants/:id/catalog-status", authenticateToken, requireAdmin, updatePlantCatalogStatus);
router.delete("/plants/:id", authenticateToken, requireAdmin, deleteAdminPlant);
router.delete("/users/:targetUserId", authenticateToken, requireSuperAdmin, deleteUserBySuperAdmin
);
export default router;
