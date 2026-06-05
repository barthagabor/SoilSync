import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import EppoDistribution from "../models/EppoDistribution.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import { getTaxonDistribution, normalizeEppoCode } from "../utils/eppoApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

const regionNameFormatter =
    typeof Intl?.DisplayNames === "function"
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

function resolveCountryName(countryCode) {
    const normalizedCode = String(countryCode || "").trim().toUpperCase();
    if (!normalizedCode) return null;

    try {
        return regionNameFormatter?.of(normalizedCode) || null;
    } catch {
        return null;
    }
}

export function isPresentStatus(pestStatus) {
    const value = String(pestStatus || "").trim().toLowerCase();
    if (!value) return false;

    const negativeTokens = ["absent", "eradicated", "intercepted", "transient", "invalid", "doubtful"];
    return !negativeTokens.some((token) => value.includes(token));
}

function pickPrimaryStatus(statuses) {
    const cleaned = [...new Set(
        (Array.isArray(statuses) ? statuses : [])
            .map((item) => String(item || "").trim())
            .filter(Boolean)
    )];

    const presentStatus = cleaned.find((status) => isPresentStatus(status));
    return presentStatus || cleaned[0] || null;
}

export function aggregateDistributionByCountry(rows) {
    const byCountry = new Map();

    for (const item of Array.isArray(rows) ? rows : []) {
        const countryCode = String(item?.country_iso || "").trim().toUpperCase();
        if (!countryCode) continue;

        if (!byCountry.has(countryCode)) {
            byCountry.set(countryCode, {
                countryCode,
                countryName: null,
                presenceStatuses: new Set(),
                stateIds: new Set(),
                rawItems: [],
            });
        }

        const entry = byCountry.get(countryCode);
        const status = String(item?.peststatus || "").trim();
        const stateId = String(item?.state_id || "").trim();

        if (status) entry.presenceStatuses.add(status);
        if (stateId) entry.stateIds.add(stateId);
        entry.rawItems.push(item);
    }

    return [...byCountry.values()].map((entry) => {
        const presenceStatuses = [...entry.presenceStatuses];
        const presenceStatus = pickPrimaryStatus(presenceStatuses);

        return {
            countryCode: entry.countryCode,
            countryName: entry.countryName || resolveCountryName(entry.countryCode),
            presenceStatus,
            presenceStatuses,
            isPresent: presenceStatuses.some((status) => isPresentStatus(status)),
            stateIds: [...entry.stateIds],
            rowCount: entry.rawItems.length,
            rawItems: entry.rawItems,
        };
    });
}

async function run() {
    const eppoCode = normalizeEppoCode(process.argv[2]);

    if (!eppoCode) {
        console.error("Usage: node scripts/syncEppoDistributionByCode.js <EPPOCODE>");
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_distribution",
        meta: { eppoCode },
    });

    try {
        const rows = await getTaxonDistribution(eppoCode);
        const distributions = aggregateDistributionByCountry(rows);

        await EppoDistribution.deleteMany({ eppoCode });

        if (distributions.length) {
            await EppoDistribution.insertMany(
                distributions.map((item) => ({
                    eppoCode,
                    countryCode: item.countryCode,
                    countryName: item.countryName,
                    presenceStatus: item.presenceStatus,
                    presenceStatuses: item.presenceStatuses,
                    isPresent: item.isPresent,
                    stateIds: item.stateIds,
                    rowCount: item.rowCount,
                    rawItems: item.rawItems,
                    syncedAt: new Date(),
                }))
            );
        }

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = Array.isArray(rows) ? rows.length : 0;
        syncRun.successCount = distributions.length;
        await syncRun.save();

        console.log(`Saved ${distributions.length} country-level distribution rows for ${eppoCode}.`);
    } catch (error) {
        syncRun.status = "failed";
        syncRun.finishedAt = new Date();
        syncRun.errorCount = 1;
        syncRun.errorItems = [{ message: error.message, eppoCode }];
        await syncRun.save();
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

export async function syncDistributionByCode(eppoCode) {
    const normalizedCode = normalizeEppoCode(eppoCode);
    if (!normalizedCode) {
        throw new Error("Usage: node scripts/syncEppoDistributionByCode.js <EPPOCODE>");
    }

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_distribution",
        meta: { eppoCode: normalizedCode },
    });

    try {
        const rows = await getTaxonDistribution(normalizedCode);
        const distributions = aggregateDistributionByCountry(rows);

        await EppoDistribution.deleteMany({ eppoCode: normalizedCode });

        if (distributions.length) {
            await EppoDistribution.insertMany(
                distributions.map((item) => ({
                    eppoCode: normalizedCode,
                    countryCode: item.countryCode,
                    countryName: item.countryName,
                    presenceStatus: item.presenceStatus,
                    presenceStatuses: item.presenceStatuses,
                    isPresent: item.isPresent,
                    stateIds: item.stateIds,
                    rowCount: item.rowCount,
                    rawItems: item.rawItems,
                    syncedAt: new Date(),
                }))
            );
        }

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = Array.isArray(rows) ? rows.length : 0;
        syncRun.successCount = distributions.length;
        await syncRun.save();

        return {
            eppoCode: normalizedCode,
            distributions,
            processedCount: Array.isArray(rows) ? rows.length : 0,
        };
    } catch (error) {
        syncRun.status = "failed";
        syncRun.finishedAt = new Date();
        syncRun.errorCount = 1;
        syncRun.errorItems = [{ message: error.message, eppoCode: normalizedCode }];
        await syncRun.save();
        throw error;
    }
}

const isDirectRun =
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
    run().catch((error) => {
        console.error("Failed to sync EPPO distribution:", error.message);
        process.exit(1);
    });
}
