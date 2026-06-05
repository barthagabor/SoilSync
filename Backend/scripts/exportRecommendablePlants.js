import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Plant from "../models/Plant.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

const EXCLUDED_TYPES = new Set(["weed", "cactus", "palm or cycad", "orchid", "carnivorous", "turfgrass", "thistle"]);
const TREE_TYPES = new Set(["tree", "needled evergreen"]);
const SHRUB_TYPES = new Set(["shrub", "deciduous shrub", "broadleaf evergreen"]);
const FLOWER_TYPES = new Set(["flower", "herb", "begonia", "coneflower", "chrysanthemum", "aster", "herbs"]);
const SUPPORT_TYPES = new Set(["bulb", "vine", "fern", "ornamental grass", "rush or sedge", "creeper", "grass"]);
const EDIBLE_TYPES = new Set(["fruit", "vegetable"]);

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function getPrimaryScientificName(plant) {
    return Array.isArray(plant?.scientific_name) && plant.scientific_name.length
        ? String(plant.scientific_name[0] || "").trim()
        : "";
}

function hasSpeciesLevelName(name) {
    const cleaned = String(name || "")
        .replace(/[']/g, " ")
        .trim();

    return cleaned.split(/\s+/).filter(Boolean).length >= 2;
}

function parseZone(value) {
    const parsed = Number(String(value ?? "").trim());
    return Number.isFinite(parsed) ? parsed : null;
}

function overlapsLocalZone(hardiness, zoneMin, zoneMax) {
    const min = parseZone(hardiness?.min);
    const max = parseZone(hardiness?.max);

    if (min == null && max == null) {
        return false;
    }

    const normalizedMin = min ?? max;
    const normalizedMax = max ?? min;
    return normalizedMin <= zoneMax && normalizedMax >= zoneMin;
}

function getCategory(type) {
    const normalizedType = normalizeText(type);

    if (EDIBLE_TYPES.has(normalizedType)) return "edible";
    if (TREE_TYPES.has(normalizedType)) return "tree";
    if (SHRUB_TYPES.has(normalizedType)) return "shrub";
    if (FLOWER_TYPES.has(normalizedType)) return "flower";
    if (SUPPORT_TYPES.has(normalizedType)) return "support";
    return "other";
}

function getBand(score) {
    if (score >= 110) return "high";
    if (score >= 85) return "medium";
    if (score >= 70) return "low";
    return "not_recommendable";
}

function scorePlant(plant, { zoneMin, zoneMax, threshold }) {
    const scientificName = getPrimaryScientificName(plant);
    const type = normalizeText(plant?.details?.type);
    const cycle = normalizeText(plant?.details?.cycle);
    const watering = normalizeText(plant?.details?.watering);
    const careLevel = normalizeText(plant?.details?.care_level);
    const maintenance = normalizeText(plant?.details?.maintenance);
    const hardiness = plant?.details?.hardiness || {};
    const toxicity = plant?.details?.toxicity || {};

    let score = 0;
    const reasons = [];
    const flags = [];

    if (plant?.common_name) {
        score += 12;
        reasons.push("common_name");
    } else {
        flags.push("missing_common_name");
    }

    if (scientificName && hasSpeciesLevelName(scientificName)) {
        score += 12;
        reasons.push("valid_scientific_name");
    } else {
        score -= 20;
        flags.push("non_species_name");
    }

    if (plant?.default_image?.regular_url) {
        score += 8;
        reasons.push("has_image");
    } else {
        flags.push("missing_image");
    }

    if (cycle === "perennial" || cycle === "herbaceous perennial") {
        score += 14;
        reasons.push("perennial");
    } else if (cycle === "annual") {
        score += 8;
        reasons.push("annual");
    } else {
        flags.push("unknown_cycle");
    }

    if (hardiness?.min && hardiness?.max) {
        score += 12;
        reasons.push("has_hardiness");
    } else {
        flags.push("missing_hardiness");
    }

    if (overlapsLocalZone(hardiness, zoneMin, zoneMax)) {
        score += 18;
        reasons.push("local_zone_fit");
    } else {
        score -= 30;
        flags.push("outside_local_zone");
    }

    if (watering === "average") {
        score += 10;
        reasons.push("average_watering");
    } else if (watering === "minimum") {
        score += 12;
        reasons.push("low_water_need");
    } else if (watering === "frequent") {
        score -= 4;
        flags.push("frequent_watering");
    } else {
        flags.push("unknown_watering");
    }

    if (careLevel === "low" || careLevel === "easy") {
        score += 14;
        reasons.push("easy_care");
    } else if (careLevel === "medium" || careLevel === "moderate") {
        score += 8;
        reasons.push("manageable_care");
    } else if (careLevel === "high") {
        score -= 12;
        flags.push("high_care");
    } else {
        flags.push("unknown_care_level");
    }

    if (maintenance === "low" || maintenance === "moderate") {
        score += 8;
        reasons.push("manageable_maintenance");
    } else if (maintenance === "high") {
        score -= 10;
        flags.push("high_maintenance");
    } else {
        flags.push("unknown_maintenance");
    }

    if (toxicity?.humans === false && toxicity?.pets === false) {
        score += 6;
        reasons.push("non_toxic");
    }

    const category = getCategory(plant?.details?.type);
    if (category !== "other") {
        score += 14;
        reasons.push(`type:${type || "other"}`);
    } else {
        flags.push("uncategorized_type");
    }

    if (EXCLUDED_TYPES.has(type)) {
        score -= 40;
        flags.push("excluded_type");
    }

    const recommendabilityBand = getBand(score);
    return {
        id: plant.id,
        common_name: plant.common_name || null,
        scientific_name: scientificName || null,
        category,
        type: plant?.details?.type || null,
        cycle: plant?.details?.cycle || null,
        watering: plant?.details?.watering || null,
        care_level: plant?.details?.care_level || null,
        maintenance: plant?.details?.maintenance || null,
        hardiness_min: hardiness?.min ?? null,
        hardiness_max: hardiness?.max ?? null,
        score,
        recommendabilityBand,
        isRecommendable: score >= threshold && category !== "other" && !EXCLUDED_TYPES.has(type),
        reasons,
        flags,
    };
}

function parseArgs(argv) {
    const options = {
        all: false,
        limit: 300,
        zoneMin: 5,
        zoneMax: 7,
        threshold: 70,
    };

    for (const arg of argv) {
        if (arg === "--all") {
            options.all = true;
        } else if (arg.startsWith("--limit=")) {
            const parsed = Number(arg.split("=")[1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                options.limit = parsed;
            }
        } else if (arg.startsWith("--zone-min=")) {
            const parsed = Number(arg.split("=")[1]);
            if (Number.isFinite(parsed)) {
                options.zoneMin = parsed;
            }
        } else if (arg.startsWith("--zone-max=")) {
            const parsed = Number(arg.split("=")[1]);
            if (Number.isFinite(parsed)) {
                options.zoneMax = parsed;
            }
        } else if (arg.startsWith("--threshold=")) {
            const parsed = Number(arg.split("=")[1]);
            if (Number.isFinite(parsed)) {
                options.threshold = parsed;
            }
        }
    }

    return options;
}

function summarize(items) {
    return items.reduce(
        (acc, item) => {
            acc.categories[item.category] = (acc.categories[item.category] || 0) + 1;
            acc.bands[item.recommendabilityBand] = (acc.bands[item.recommendabilityBand] || 0) + 1;
            if (item.isRecommendable) {
                acc.recommendableCount += 1;
            }
            return acc;
        },
        {
            recommendableCount: 0,
            categories: {},
            bands: {},
        }
    );
}

function toCsvRow(values) {
    return values.map((value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(",");
}

async function run() {
    const options = parseArgs(process.argv.slice(2));
    await mongoose.connect(MONGO_URI);

    try {
        const plants = await Plant.find(
            {},
            {
                id: 1,
                common_name: 1,
                scientific_name: 1,
                details: 1,
                default_image: 1,
                _id: 0,
            }
        ).lean();

        const scoredPlants = plants
            .map((plant) => scorePlant(plant, options))
            .sort((left, right) => right.score - left.score || left.id - right.id);

        const exportedItems = options.all ? scoredPlants : scoredPlants.slice(0, options.limit);
        const summary = summarize(exportedItems);
        const fileSuffix = options.all ? "all" : `top${options.limit}`;

        const exportDir = path.join(process.cwd(), "exports");
        fs.mkdirSync(exportDir, { recursive: true });

        const jsonPath = path.join(exportDir, `recommendable_plants_${fileSuffix}.json`);
        const csvPath = path.join(exportDir, `recommendable_plants_${fileSuffix}.csv`);

        const payload = {
            generatedAt: new Date().toISOString(),
            options,
            totalSourcePlants: scoredPlants.length,
            exportedCount: exportedItems.length,
            summary,
            items: exportedItems,
        };

        fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

        const csvHeaders = [
            "rank",
            "id",
            "common_name",
            "scientific_name",
            "category",
            "type",
            "cycle",
            "watering",
            "care_level",
            "maintenance",
            "hardiness_min",
            "hardiness_max",
            "score",
            "recommendability_band",
            "is_recommendable",
            "reasons",
            "flags",
        ];

        const csvLines = [toCsvRow(csvHeaders)];
        exportedItems.forEach((item, index) => {
            csvLines.push(
                toCsvRow([
                    index + 1,
                    item.id,
                    item.common_name,
                    item.scientific_name,
                    item.category,
                    item.type,
                    item.cycle,
                    item.watering,
                    item.care_level,
                    item.maintenance,
                    item.hardiness_min,
                    item.hardiness_max,
                    item.score,
                    item.recommendabilityBand,
                    item.isRecommendable,
                    item.reasons.join("|"),
                    item.flags.join("|"),
                ])
            );
        });
        fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");

        console.log(
            JSON.stringify(
                {
                    jsonPath,
                    csvPath,
                    exportedCount: exportedItems.length,
                    summary,
                    sample: exportedItems.slice(0, 10),
                },
                null,
                2
            )
        );
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error("Failed to export recommendable plants:", error.message);
    process.exit(1);
});
