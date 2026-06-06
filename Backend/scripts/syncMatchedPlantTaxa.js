import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import PlantEppoLink from "../models/PlantEppoLink.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import EppoTaxon from "../models/EppoTaxon.js";
import { syncTaxonByCode } from "./syncEppoTaxonByCode.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

function parseLimit(args) {
    const inlineValue = args.find((arg) => arg.startsWith("--limit="));
    const separateIndex = args.findIndex((arg) => arg === "--limit");

    const rawValue =
        inlineValue?.split("=")[1] ??
        (separateIndex >= 0 ? args[separateIndex + 1] : null);

    if (!rawValue) return null;

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function run() {
    const args = process.argv.slice(2);
    const limit = parseLimit(args);
    const includeExisting = args.includes("--include-existing");

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
            const [existingTaxonCodes, successfulSyncCodes] = await Promise.all([
                EppoTaxon.distinct("eppoCode"),
                EppoSyncRun.distinct("meta.eppoCode", {
                    jobType: "sync_taxa",
                    status: "success",
                    "meta.eppoCode": { $in: eppoCodes },
                }),
            ]);

            const syncedSet = new Set(
                [...existingTaxonCodes, ...successfulSyncCodes]
                    .map((code) => String(code || "").trim().toUpperCase())
                    .filter(Boolean)
            );

            eppoCodes = eppoCodes.filter((code) => !syncedSet.has(code));
        }

        if (limit) {
            eppoCodes = eppoCodes.slice(0, limit);
        }

        console.log(`Matched plant taxon sync queue size: ${eppoCodes.length}.`);

        let successCount = 0;
        const failures = [];

        for (const [index, eppoCode] of eppoCodes.entries()) {
            console.log(`[${index + 1}/${eppoCodes.length}] Syncing taxon for ${eppoCode}...`);

            try {
                await syncTaxonByCode(eppoCode);
                successCount += 1;
            } catch (error) {
                failures.push({
                    eppoCode,
                    message: error.message,
                });
                console.error(`Failed ${eppoCode}: ${error.message}`);
            }
        }

        console.log(`Finished matched-plant taxon sync. Success: ${successCount}, failed: ${failures.length}.`);

        if (failures.length) {
            console.log(JSON.stringify(failures.slice(0, 20), null, 2));
        }
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error("Failed to sync matched plant taxa:", error.message);
    process.exit(1);
});
