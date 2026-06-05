import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Plant from "../models/Plant.js";
import PlantEppoLink from "../models/PlantEppoLink.js";
import EppoSyncRun from "../models/EppoSyncRun.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

async function run() {
    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_plant_eppo_flags",
        meta: {},
    });

    try {
        const [matchedIds, reviewIds, unmatchedIds, totalPlants] = await Promise.all([
            PlantEppoLink.distinct("perenualPlantId", { matchStatus: "matched" }),
            PlantEppoLink.distinct("perenualPlantId", { matchStatus: "review" }),
            PlantEppoLink.distinct("perenualPlantId", { matchStatus: "unmatched" }),
            Plant.countDocuments({}),
        ]);

        await Plant.updateMany(
            {},
            {
                $set: {
                    eppoMatched: false,
                    eppoMatchStatus: "unmatched",
                },
            }
        );

        if (reviewIds.length) {
            await Plant.updateMany(
                { id: { $in: reviewIds } },
                {
                    $set: {
                        eppoMatched: false,
                        eppoMatchStatus: "review",
                    },
                }
            );
        }

        if (matchedIds.length) {
            await Plant.updateMany(
                { id: { $in: matchedIds } },
                {
                    $set: {
                        eppoMatched: true,
                        eppoMatchStatus: "matched",
                    },
                }
            );
        }

        if (unmatchedIds.length) {
            await Plant.updateMany(
                { id: { $in: unmatchedIds } },
                {
                    $set: {
                        eppoMatched: false,
                        eppoMatchStatus: "unmatched",
                    },
                }
            );
        }

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = totalPlants;
        syncRun.successCount = matchedIds.length;
        syncRun.meta = {
            totalPlants,
            matchedCount: matchedIds.length,
            reviewCount: reviewIds.length,
            unmatchedCount: unmatchedIds.length,
        };
        await syncRun.save();

        console.log(
            `Synced EPPO match flags for ${totalPlants} plants. Matched ${matchedIds.length}, review ${reviewIds.length}, unmatched ${unmatchedIds.length}.`
        );
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
    console.error("Failed to sync plant EPPO match flags:", error.message);
    process.exit(1);
});
