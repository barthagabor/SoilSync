import mongoose from "mongoose";

const eppoPlantPestRelationSchema = new mongoose.Schema(
    {
        plantEppoCode: { type: String, required: true, index: true },
        pestEppoCode: { type: String, required: true, index: true },
        pestPreferredName: { type: String, default: null },
        classificationId: { type: Number, default: null },
        classificationIds: { type: [Number], default: [] },
        classificationLabel: { type: String, default: null },
        classificationLabels: { type: [String], default: [] },
        bibliographicReferences: { type: [String], default: [] },
        source: { type: String, default: "EPPO" },
        rawItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
        syncedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "eppo_plant_pest_relations",
    }
);

eppoPlantPestRelationSchema.index({ plantEppoCode: 1, pestEppoCode: 1 }, { unique: true });

export default mongoose.model("EppoPlantPestRelation", eppoPlantPestRelationSchema);
