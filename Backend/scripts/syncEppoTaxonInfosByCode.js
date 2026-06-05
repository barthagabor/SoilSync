import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import EppoTaxon from "../models/EppoTaxon.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import { getTaxonInfos, normalizeEppoCode } from "../utils/eppoApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

async function run() {
    const eppoCode = normalizeEppoCode(process.argv[2]);

    if (!eppoCode) {
        console.error("Usage: node scripts/syncEppoTaxonInfosByCode.js <EPPOCODE>");
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_taxa",
        meta: { eppoCode, stage: "infos" },
    });

    try {
        const infoCounts = await getTaxonInfos(eppoCode);

        await EppoTaxon.findOneAndUpdate(
            { eppoCode },
            {
                $set: {
                    eppoCode,
                    infoCounts,
                    rawInfos: infoCounts,
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

        console.log(`Saved EPPO info counts for ${eppoCode}.`);
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
    console.error("Failed to sync taxon infos:", error.message);
    process.exit(1);
});
