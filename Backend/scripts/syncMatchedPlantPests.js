import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import PlantEppoLink from "../models/PlantEppoLink.js";
import EppoPlantPestRelation from "../models/EppoPlantPestRelation.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import { syncPestsByPlantEppoCode } from "./syncEppoPestsByCode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

function parseLimit(args) {
    const value = args.find((arg) => arg.startsWith("--limit="));
    if (!value) return null;

    const parsed = Number(value.split("=")[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function run() {
    const args = process.argv.slice(2);
    const limit = parseLimit(args);
    const forcePhotoRefresh = args.includes("--refresh-photos");
    const includeExisting = args.includes("--include-existing");
    const skipPhotos = args.includes("--skip-photos");

    await mongoose.connect(MONGO_URI);

    try {
        let eppoCodes = await PlantEppoLink.distinct("eppoCode", {
            matchStatus: "matched",
            eppoCode: { $nin: [null, ""] },
        });

        eppoCodes = eppoCodes
            .map((code) => String(code || "").trim().toUpperCase())
            .filter(Boolean)
            .sort((left, right) => left.localeCompare(right));

        if (!includeExisting) {
            const [relationCodes, successfulRunCodes] = await Promise.all([
                EppoPlantPestRelation.distinct("plantEppoCode"),
                EppoSyncRun.aggregate([
                    {
                        $match: {
                            jobType: "sync_pests",
                            status: "success",
                            "meta.plantEppoCode": { $nin: [null, ""] },
                        },
                    },
                    {
                        $group: {
                            _id: "$meta.plantEppoCode",
                        },
                    },
                ]),
            ]);

            const syncedSet = new Set(
                [
                    ...relationCodes.map((code) => String(code || "").trim().toUpperCase()),
                    ...successfulRunCodes.map((item) => String(item?._id || "").trim().toUpperCase()),
                ].filter(Boolean)
            );
            eppoCodes = eppoCodes.filter((code) => !syncedSet.has(code));
        }

        if (limit) {
            eppoCodes = eppoCodes.slice(0, limit);
        }

        console.log(`Sync queue size: ${eppoCodes.length} unique matched plant EPPO codes.`);

        let successCount = 0;
        const failures = [];

        for (const [index, code] of eppoCodes.entries()) {
            console.log(`[${index + 1}/${eppoCodes.length}] Syncing ${code}...`);

            try {
                await syncPestsByPlantEppoCode(code, { forcePhotoRefresh, skipPhotos });
                successCount += 1;
            } catch (error) {
                failures.push({
                    code,
                    message: error.message,
                });
                console.error(`Failed ${code}: ${error.message}`);
            }
        }

        console.log(`Finished matched-plant pest sync. Success: ${successCount}, failed: ${failures.length}.`);

        if (failures.length) {
            console.log(JSON.stringify(failures.slice(0, 20), null, 2));
        }
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error("Failed to sync matched plant pests:", error.message);
    process.exit(1);
});
