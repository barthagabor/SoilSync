import express from "express";
import { getPlantDetails, getPlantGuides, getPlants, getRegions } from "../controllers/plantsController.js";

const router = express.Router();

router.get("/plants", getPlants);
router.get("/plants/:id", getPlantDetails);
router.get("/plants/:id/guides", getPlantGuides);
router.get("/regions", getRegions);

export default router;
