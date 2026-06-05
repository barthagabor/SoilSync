import mongoose from "mongoose";

const PlantSchema = new mongoose.Schema({
    id: { type: Number, required: true },           // Perenual ID
    common_name: { type: String },
    scientific_name: { type: [String] },
    other_name: { type: [String] },
    family: { type: String },
    genus: { type: String },

    default_image: {
        license: Number,
        license_name: String,
        license_url: String,
        original_url: String,
        regular_url: String,
        medium_url: String,
        small_url: String,
        thumbnail: String,
    },

    cycle: { type: String },
    watering: { type: String },
    sunlight: { type: [String] },

    details: { type: Object },
    eppoMatched: { type: Boolean, default: false, index: true },
    eppoMatchStatus: { type: String, default: "unmatched" },
    hasCloudinaryImage: { type: Boolean, default: false, index: true },
    imageStorageProvider: { type: String, default: "unknown" },

    imported_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const Plant = mongoose.model("Plant", PlantSchema, "Perenual_Plants");

export default Plant;
