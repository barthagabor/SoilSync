import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import EppoTaxon from "../models/EppoTaxon.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import {
    getTaxonCategorization,
    getTaxonInfos,
    getTaxonNames,
    getTaxonOverview,
    getTaxonTaxonomy,
    normalizeEppoCode,
} from "../utils/eppoApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

function extractKingdom(taxonomy) {
    if (!Array.isArray(taxonomy)) return null;
    return taxonomy.find((item) => String(item?.type || "").toLowerCase() === "kingdom") || null;
}

async function run() {
    const eppoCode = normalizeEppoCode(process.argv[2]);

    if (!eppoCode) {
        console.error("Usage: node scripts/syncEppoTaxonByCode.js <EPPOCODE>");
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_taxa",
        meta: { eppoCode, stage: "full_taxon" },
    });

    try {
        const [overview, infoCounts, names, taxonomy, categorization] = await Promise.all([
            getTaxonOverview(eppoCode),
            getTaxonInfos(eppoCode),
            getTaxonNames(eppoCode),
            getTaxonTaxonomy(eppoCode),
            getTaxonCategorization(eppoCode),
        ]);

        const preferredName =
            overview?.prefname ||
            (Array.isArray(names) ? names.find((item) => item?.preferred)?.fullname : null) ||
            null;

        await EppoTaxon.findOneAndUpdate(
            { eppoCode },
            {
                $set: {
                    eppoCode,
                    preferredName,
                    scientificName: preferredName,
                    taxonType: overview?.datatype || null,
                    taxonomy: Array.isArray(taxonomy) ? taxonomy : [],
                    kingdom: extractKingdom(taxonomy),
                    infoCounts,
                    categories: Array.isArray(categorization) ? categorization : [],
                    names: Array.isArray(names) ? names : [],
                    rawBasic: overview,
                    rawInfos: infoCounts,
                    rawNames: names,
                    rawTaxonomy: taxonomy,
                    rawCategorization: categorization,
                    syncedAt: new Date(),
                },
            },
            {
                upsert: true,
                new: true,
            }
        );

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = 1;
        syncRun.successCount = 1;
        await syncRun.save();

        console.log(`Saved full EPPO taxon data for ${eppoCode}.`);
    } catch (error) {
        syncRun.status = "failed";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = 1;
        syncRun.errorCount = 1;
        syncRun.errorItems = [{ message: error.message, eppoCode }];
        await syncRun.save();
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error("Failed to sync EPPO taxon:", error.message);
    process.exit(1);
});
