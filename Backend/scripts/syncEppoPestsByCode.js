import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import EppoPlantPestRelation from "../models/EppoPlantPestRelation.js";
import EppoTaxon from "../models/EppoTaxon.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import { getTaxonPests, normalizeEppoCode } from "../utils/eppoApi.js";
import { getTaxonPhotos } from "../utils/eppoPhotoScraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

function aggregatePests(rows) {
    const byPest = new Map();

    for (const item of Array.isArray(rows) ? rows : []) {
        const pestEppoCode = normalizeEppoCode(item?.eppocode);
        if (!pestEppoCode) continue;

        if (!byPest.has(pestEppoCode)) {
            byPest.set(pestEppoCode, {
                pestEppoCode,
                pestPreferredName: String(item?.prefname || "").trim() || null,
                classificationIds: new Set(),
                classificationLabels: new Set(),
                bibliographicReferences: new Set(),
                rawItems: [],
            });
        }

        const entry = byPest.get(pestEppoCode);
        const classId = Number(item?.class_id);
        const classLabel = String(item?.class_label || "").trim();
        const bibref = String(item?.bibref || "").trim();

        if (Number.isFinite(classId)) entry.classificationIds.add(classId);
        if (classLabel) entry.classificationLabels.add(classLabel);
        if (bibref) entry.bibliographicReferences.add(bibref);
        entry.rawItems.push(item);
    }

    return [...byPest.values()].map((entry) => {
        const classificationIds = [...entry.classificationIds];
        const classificationLabels = [...entry.classificationLabels];

        return {
            pestEppoCode: entry.pestEppoCode,
            pestPreferredName: entry.pestPreferredName,
            classificationId: classificationIds[0] ?? null,
            classificationIds,
            classificationLabel: classificationLabels[0] ?? null,
            classificationLabels,
            bibliographicReferences: [...entry.bibliographicReferences],
            rawItems: entry.rawItems,
        };
    });
}

async function syncPestPhotoCaches(relations, { force = false } = {}) {
    let syncedTaxa = 0;
    let skippedTaxa = 0;
    let totalPhotos = 0;
    const errors = [];
    const pestCodes = [...new Set(relations.map((relation) => relation.pestEppoCode).filter(Boolean))];
    const existingTaxa = await EppoTaxon.find(
        { eppoCode: { $in: pestCodes } },
        {
            eppoCode: 1,
            preferredName: 1,
            scientificName: 1,
            photos: 1,
            photosSyncedAt: 1,
        }
    ).lean();
    const existingByCode = new Map(existingTaxa.map((taxon) => [taxon.eppoCode, taxon]));

    for (const relation of relations) {
        try {
            const existing = existingByCode.get(relation.pestEppoCode);

            if (!force && existing?.photosSyncedAt) {
                if (relation.pestPreferredName && (!existing.preferredName || !existing.scientificName)) {
                    await EppoTaxon.findOneAndUpdate(
                        { eppoCode: relation.pestEppoCode },
                        {
                            $set: {
                                preferredName: existing.preferredName || relation.pestPreferredName,
                                scientificName: existing.scientificName || relation.pestPreferredName,
                            },
                        }
                    );
                }

                skippedTaxa += 1;
                totalPhotos += Array.isArray(existing.photos) ? existing.photos.length : 0;
                continue;
            }

            const photos = await getTaxonPhotos(relation.pestEppoCode);
            const update = {
                eppoCode: relation.pestEppoCode,
                photos,
                photosSyncedAt: new Date(),
                syncedAt: new Date(),
            };

            if (relation.pestPreferredName) {
                update.preferredName = relation.pestPreferredName;
                update.scientificName = relation.pestPreferredName;
            }

            await EppoTaxon.findOneAndUpdate(
                { eppoCode: relation.pestEppoCode },
                { $set: update },
                {
                    upsert: true,
                    new: true,
                }
            );

            syncedTaxa += 1;
            totalPhotos += photos.length;
        } catch (error) {
            errors.push({
                pestEppoCode: relation.pestEppoCode,
                message: error.message,
            });
        }
    }

    return {
        syncedTaxa,
        skippedTaxa,
        totalPhotos,
        errors,
    };
}

export async function syncPestsByPlantEppoCode(
    plantEppoCode,
    { forcePhotoRefresh = false, skipPhotos = false } = {}
) {
    if (!plantEppoCode) {
        throw new Error("Missing EPPO code.");
    }

    const normalizedPlantEppoCode = normalizeEppoCode(plantEppoCode);

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_pests",
        meta: {
            plantEppoCode: normalizedPlantEppoCode,
            forcePhotoRefresh,
            skipPhotos,
        },
    });

    try {
        const rows = await getTaxonPests(normalizedPlantEppoCode);
        const relations = aggregatePests(rows);
        const photoSync = skipPhotos
            ? {
                  syncedTaxa: 0,
                  skippedTaxa: 0,
                  totalPhotos: 0,
                  errors: [],
              }
            : await syncPestPhotoCaches(relations, { force: forcePhotoRefresh });

        await EppoPlantPestRelation.deleteMany({ plantEppoCode: normalizedPlantEppoCode });

        if (relations.length) {
            await EppoPlantPestRelation.insertMany(
                relations.map((item) => ({
                    plantEppoCode: normalizedPlantEppoCode,
                    pestEppoCode: item.pestEppoCode,
                    pestPreferredName: item.pestPreferredName,
                    classificationId: item.classificationId,
                    classificationIds: item.classificationIds,
                    classificationLabel: item.classificationLabel,
                    classificationLabels: item.classificationLabels,
                    bibliographicReferences: item.bibliographicReferences,
                    rawItems: item.rawItems,
                    syncedAt: new Date(),
                }))
            );
        }

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = Array.isArray(rows) ? rows.length : 0;
        syncRun.successCount = relations.length;
        syncRun.meta = {
            ...(syncRun.meta || {}),
            photoTaxaUpdated: photoSync.syncedTaxa,
            photoTaxaReused: photoSync.skippedTaxa,
            photoCount: photoSync.totalPhotos,
            photoErrors: photoSync.errors.length,
        };
        await syncRun.save();

        if (photoSync.errors.length) {
            console.warn(`Photo sync warnings for ${normalizedPlantEppoCode}: ${photoSync.errors.length} pest taxa could not be scraped.`);
        }

        if (skipPhotos) {
            console.log(`Saved ${relations.length} pest relations for ${normalizedPlantEppoCode} (photo sync skipped).`);
        } else {
            console.log(
                `Saved ${relations.length} pest relations for ${normalizedPlantEppoCode} and cached ${photoSync.totalPhotos} pest photos (${photoSync.syncedTaxa} fetched, ${photoSync.skippedTaxa} reused).`
            );
        }

        return {
            plantEppoCode: normalizedPlantEppoCode,
            relationCount: relations.length,
            photoSync,
        };
    } catch (error) {
        syncRun.status = "failed";
        syncRun.finishedAt = new Date();
        syncRun.errorCount = 1;
        syncRun.errorItems = [{ message: error.message, plantEppoCode: normalizedPlantEppoCode }];
        await syncRun.save();
        throw error;
    }
}

async function run() {
    const plantEppoCode = normalizeEppoCode(process.argv[2]);
    const forcePhotoRefresh = process.argv.includes("--refresh-photos");
    const skipPhotos = process.argv.includes("--skip-photos");

    if (!plantEppoCode) {
        console.error("Usage: node scripts/syncEppoPestsByCode.js <EPPOCODE> [--refresh-photos] [--skip-photos]");
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);

    try {
        await syncPestsByPlantEppoCode(plantEppoCode, { forcePhotoRefresh, skipPhotos });
    } finally {
        await mongoose.disconnect();
    }
}

const isDirectRun =
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
    run().catch((error) => {
        console.error("Failed to sync EPPO pests:", error.message);
        process.exit(1);
    });
}
