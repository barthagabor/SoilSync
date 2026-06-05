import mongoose from "mongoose";

const plantEppoLinkSchema = new mongoose.Schema(
    {
        perenualPlantId: { type: Number, required: true, index: true, unique: true },
        perenualMongoId: { type: mongoose.Schema.Types.ObjectId, required: true },
        scientificNameRaw: { type: String, default: "" },
        scientificNameNormalized: { type: String, default: "" },
        scientificNameCandidates: { type: [String], default: [] },
        eppoCode: { type: String, default: null, index: true },
        eppoPreferredName: { type: String, default: null },
        eppoMatchedName: { type: String, default: null },
        matchStatus: {
            type: String,
            enum: ["matched", "review", "unmatched"],
            default: "unmatched",
            index: true,
        },
        matchStrategy: {
            type: String,
            enum: ["exact", "species_stripped", "synonym", "manual", "unmatched"],
            default: "unmatched",
        },
        matchConfidence: { type: Number, default: 0 },
        isManualOverride: { type: Boolean, default: false },
        rawCandidate: { type: mongoose.Schema.Types.Mixed, default: null },
        matchedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "plant_eppo_links",
    }
);

plantEppoLinkSchema.index({ scientificNameNormalized: 1 });

export default mongoose.model("PlantEppoLink", plantEppoLinkSchema);
