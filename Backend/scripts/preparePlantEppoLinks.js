import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Plant from "../models/Plant.js";
import PlantEppoLink from "../models/PlantEppoLink.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import { buildScientificNameCandidates, pickPrimaryScientificName } from "../utils/eppoNameTools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

function parseArgs() {
    const args = process.argv.slice(2);
    const options = { limit: null };

    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === "--limit" && args[i + 1]) {
            options.limit = Number(args[i + 1]);
            i += 1;
        }
    }

    return options;
}

async function run() {
    const { limit } = parseArgs();
    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "prepare_links",
        meta: { limit },
    });

    try {
        let query = Plant.find({}, {
            id: 1,
            scientific_name: 1,
            common_name: 1,
            genus: 1,
            species_epithet: 1,
        }).sort({ id: 1 });

        if (limit && Number.isFinite(limit) && limit > 0) {
            query = query.limit(limit);
        }

        const plants = await query.lean();

        let processedCount = 0;
        let successCount = 0;

        for (const plant of plants) {
            processedCount += 1;

            const scientificNameRaw = Array.isArray(plant.scientific_name)
                ? String(plant.scientific_name[0] || "").trim()
                : "";
            const scientificNameCandidates = buildScientificNameCandidates(plant);
            const scientificNameNormalized = pickPrimaryScientificName(plant);

            await PlantEppoLink.findOneAndUpdate(
                { perenualPlantId: plant.id },
                {
                    $set: {
                        perenualMongoId: plant._id,
                        scientificNameRaw,
                        scientificNameNormalized,
                        scientificNameCandidates,
                        updatedAt: new Date(),
                    },
                    $setOnInsert: {
                        matchStatus: "unmatched",
                        matchStrategy: "unmatched",
                        matchConfidence: 0,
                        isManualOverride: false,
                    },
                },
                {
                    upsert: true,
                    new: true,
                }
            );

            successCount += 1;
        }

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = processedCount;
        syncRun.successCount = successCount;
        await syncRun.save();

        console.log(`Prepared ${successCount} plant EPPO link records.`);
    } catch (error) {
        syncRun.status = "failed";
        syncRun.finishedAt = new Date();
        syncRun.errorCount = 1;
        syncRun.errorItems = [{ message: error.message }];
        await syncRun.save();
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error("Failed to prepare plant EPPO links:", error.message);
    process.exit(1);
});
