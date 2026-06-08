import express from "express";
import { getRecommenderOptions, recommendPlants } from "../controllers/recommenderController.js";

const router = express.Router();

router.get("/options", getRecommenderOptions);
router.post("/v2", recommendPlants);
router.post("/xgb", recommendPlants);
router.post("/", recommendPlants);

export default router;
