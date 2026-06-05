import mongoose from "mongoose";

const eppoSyncRunSchema = new mongoose.Schema(
    {
        jobType: {
            type: String,
            enum: ["prepare_links", "match_plants", "sync_taxa", "sync_pests", "sync_distribution", "sync_plant_eppo_flags", "sync_plant_image_flags"],
            required: true,
            index: true,
        },
        startedAt: { type: Date, required: true, default: () => new Date() },
        finishedAt: { type: Date, default: null },
        status: {
            type: String,
            enum: ["success", "partial", "failed", "running"],
            default: "running",
            index: true,
        },
        processedCount: { type: Number, default: 0 },
        successCount: { type: Number, default: 0 },
        errorCount: { type: Number, default: 0 },
        errorItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
        meta: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    {
        timestamps: true,
        collection: "eppo_sync_runs",
    }
);

eppoSyncRunSchema.index({ jobType: 1, startedAt: -1 });

export default mongoose.model("EppoSyncRun", eppoSyncRunSchema);
