import { fetchRecommenderOptionsData, runPrimaryPlantRecommender } from "../services/recommenderService.js";

export const getRecommenderOptions = async (_req, res) => {
    try {
        const options = await fetchRecommenderOptionsData();
        res.json(options);
    } catch (err) {
        console.error("Recommender options error:", err);
        res.status(500).json({ message: "Server error while loading recommender options." });
    }
};

export const recommendPlants = async (req, res) => {
    const requestedTopK = Number(req.body?.limit);
    const topK = Number.isInteger(requestedTopK) && requestedTopK > 0 ? requestedTopK : 6;
    await runPrimaryPlantRecommender(req, res, { topK });
};
