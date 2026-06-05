 import mongoose from "mongoose";

const eppoTaxonSchema = new mongoose.Schema(
    {
        eppoCode: { type: String, required: true, unique: true, index: true },
        preferredName: { type: String, default: null },
        scientificName: { type: String, default: null },
        taxonType: { type: String, default: null },
        taxonomy: { type: mongoose.Schema.Types.Mixed, default: null },
        kingdom: { type: mongoose.Schema.Types.Mixed, default: null },
        otherInfo: { type: mongoose.Schema.Types.Mixed, default: null },
        infoCounts: { type: mongoose.Schema.Types.Mixed, default: null },
        names: { type: [mongoose.Schema.Types.Mixed], default: [] },
        categories: { type: [mongoose.Schema.Types.Mixed], default: [] },
        photos: { type: [mongoose.Schema.Types.Mixed], default: [] },
        rawBasic: { type: mongoose.Schema.Types.Mixed, default: null },
        rawInfos: { type: mongoose.Schema.Types.Mixed, default: null },
        rawNames: { type: mongoose.Schema.Types.Mixed, default: null },
        rawTaxonomy: { type: mongoose.Schema.Types.Mixed, default: null },
        rawCategorization: { type: mongoose.Schema.Types.Mixed, default: null },
        photosSyncedAt: { type: Date, default: null },
        syncedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: "eppo_taxa",
    }
);

export default mongoose.model("EppoTaxon", eppoTaxonSchema);
