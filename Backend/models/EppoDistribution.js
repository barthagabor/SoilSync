import mongoose from "mongoose";

const eppoDistributionSchema = new mongoose.Schema(
    {
        eppoCode: { type: String, required: true, index: true },
        countryCode: { type: String, required: true, index: true },
        countryName: { type: String, default: null },
        presenceStatus: { type: String, default: null },
        presenceStatuses: { type: [String], default: [] },
        isPresent: { type: Boolean, default: false, index: true },
        stateIds: { type: [String], default: [] },
        rowCount: { type: Number, default: 0 },
        source: { type: String, default: "EPPO" },
        rawItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
        syncedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "eppo_distributions",
    }
);

eppoDistributionSchema.index({ eppoCode: 1, countryCode: 1, presenceStatus: 1 }, { unique: true });

export default mongoose.model("EppoDistribution", eppoDistributionSchema);
