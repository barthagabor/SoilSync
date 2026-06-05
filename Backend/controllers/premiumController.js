import { generatePremiumAssistantReply } from "../services/premiumAssistantService.js";

export const chatWithPremiumAssistant = async (req, res) => {
    try {
        const {
            message,
            conversation,
            selectedPlantIds,
            includeFavourites,
            includeSavedGardens,
            uploadedChatImage,
            uploadedGardenPhotoMeta,
        } = req.body || {};

        const result = await generatePremiumAssistantReply({
            userId: req.user.userId,
            message,
            conversation,
            selectedPlantIds,
            includeFavourites,
            includeSavedGardens,
            uploadedChatImage,
            uploadedGardenPhotoMeta,
        });

        res.json(result);
    } catch (err) {
        console.error("Premium assistant error:", err);
        res.status(500).json({
            message: err.message || "Error while generating the premium assistant response.",
        });
    }
};
