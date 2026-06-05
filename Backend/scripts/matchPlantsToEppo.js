 import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import PlantEppoLink from "../models/PlantEppoLink.js";
import EppoSyncRun from "../models/EppoSyncRun.js";
import { getTaxonOverview, normalizeEppoCode, searchEppoCodesByTaxonName } from "../utils/eppoApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        limit: null,
        includeReviewed: false,
        rematchAll: false,
    };

    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === "--limit" && args[i + 1]) {
            options.limit = Number(args[i + 1]);
            i += 1;
        } else if (args[i] === "--include-reviewed") {
            options.includeReviewed = true;
        } else if (args[i] === "--rematch-all") {
            options.rematchAll = true;
        }
    }

    return options;
}

function summarizeCandidates(candidates) {
    return (Array.isArray(candidates) ? candidates : []).map((item) => ({
        eppoCode: normalizeEppoCode(item?.eppocode),
        preferred: Boolean(item?.preferred),
    }));
}

function isSpeciesLevelName(name) {
    const tokens = String(name || "").trim().split(/\s+/).filter(Boolean);
    return tokens.length >= 2;
}

function buildUnmatchedUpdate(matchStrategy = "unmatched") {
    return {
        eppoCode: null,
        eppoPreferredName: null,
        eppoMatchedName: null,
        matchStatus: "unmatched",
        matchStrategy,
        matchConfidence: 0,
        rawCandidate: null,
        matchedAt: null,
    };
}

function buildReviewUpdate({ matchStrategy, matchedName, candidates }) {
    return {
        eppoCode: null,
        eppoPreferredName: null,
        eppoMatchedName: matchedName,
        matchStatus: "review",
        matchStrategy,
        matchConfidence: 0.5,
        rawCandidate: summarizeCandidates(candidates),
        matchedAt: null,
    };
}

function buildManualReviewUpdate(candidateNames) {
    return {
        eppoCode: null,
        eppoPreferredName: null,
        eppoMatchedName: candidateNames.join(" | "),
        matchStatus: "review",
        matchStrategy: "manual",
        matchConfidence: 0.25,
        rawCandidate: {
            reason: "candidate_not_species_level",
            names: candidateNames,
        },
        matchedAt: null,
    };
}

function getScientificNameCacheKey(link) {
    return String(link?.scientificNameNormalized || "")
        .trim()
        .toLowerCase();
}

function getResolutionScore(update) {
    if (update?.matchStatus === "matched") {
        return 2;
    }

    if (update?.matchStatus === "review") {
        return 1;
    }

    return 0;
}

function cloneUpdate(update) {
    const rawCandidate =
        update?.rawCandidate && typeof update.rawCandidate === "object"
            ? JSON.parse(JSON.stringify(update.rawCandidate))
            : update?.rawCandidate ?? null;

    return {
        eppoCode: update?.eppoCode || null,
        eppoPreferredName: update?.eppoPreferredName || null,
        eppoMatchedName: update?.eppoMatchedName || null,
        matchStatus: update?.matchStatus || "unmatched",
        matchStrategy: update?.matchStrategy || "unmatched",
        matchConfidence: Number(update?.matchConfidence || 0),
        rawCandidate,
        matchedAt: update?.matchStatus === "matched" ? new Date() : null,
    };
}

async function buildMatchedUpdate({ matchStrategy, matchedName, candidate }) {
    const eppoCode = normalizeEppoCode(candidate?.eppocode);
    const overview = await getTaxonOverview(eppoCode);

    return {
        eppoCode,
        eppoPreferredName: overview?.prefname || null,
        eppoMatchedName: matchedName,
        matchStatus: "matched",
        matchStrategy,
        matchConfidence: 1,
        rawCandidate: {
            result: summarizeCandidates([candidate])[0] || null,
            overview,
        },
        matchedAt: new Date(),
    };
}

async function resolveCandidateSet(name, matchStrategy, options = {}) {
    const candidates = await searchEppoCodesByTaxonName(name, options);
    const normalizedCandidates = Array.isArray(candidates)
        ? candidates.filter((item) => normalizeEppoCode(item?.eppocode))
        : [];

    if (!normalizedCandidates.length) {
        return { status: "unmatched", update: buildUnmatchedUpdate(matchStrategy) };
    }

    if (normalizedCandidates.length > 1) {
        return {
            status: "review",
            update: buildReviewUpdate({
                matchStrategy,
                matchedName: name,
                candidates: normalizedCandidates,
            }),
        };
    }

    return {
        status: "matched",
        update: await buildMatchedUpdate({
            matchStrategy,
            matchedName: name,
            candidate: normalizedCandidates[0],
        }),
    };
}

async function resolveLink(link) {
    const candidates = Array.isArray(link.scientificNameCandidates)
        ? link.scientificNameCandidates.filter(Boolean)
        : [];
    const ambiguousNames = [];

    for (const candidateName of candidates) {
        if (!isSpeciesLevelName(candidateName)) {
            ambiguousNames.push(candidateName);
            continue;
        }

        const exact = await resolveCandidateSet(candidateName, "exact", { onlyPreferred: true });
        if (exact.status !== "unmatched") {
            return exact.update;
        }

        const fallback = await resolveCandidateSet(candidateName, "synonym", { onlyPreferred: false });
        if (fallback.status !== "unmatched") {
            return fallback.update;
        }
    }

    if (ambiguousNames.length) {
        return buildManualReviewUpdate(ambiguousNames);
    }

    return buildUnmatchedUpdate("unmatched");
}

async function run() {
    const { limit, includeReviewed, rematchAll } = parseArgs();
    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "match_plants",
        meta: { limit, includeReviewed, rematchAll },
    });

    try {
        const query = {
            isManualOverride: { $ne: true },
        };

        if (!rematchAll && !includeReviewed) {
            query.matchStatus = { $in: ["unmatched", null] };
        } else if (!rematchAll && includeReviewed) {
            query.matchStatus = { $in: ["unmatched", "review", null] };
        }

        let cursor = PlantEppoLink.find(query).sort({ perenualPlantId: 1 });
        if (limit && Number.isFinite(limit) && limit > 0) {
            cursor = cursor.limit(limit);
        }

        const links = await cursor.lean();
        const reusableLinks = await PlantEppoLink.find(
            {
                scientificNameNormalized: { $nin: [null, ""] },
                matchStatus: { $in: ["matched", "review"] },
            },
            {
                scientificNameNormalized: 1,
                eppoCode: 1,
                eppoPreferredName: 1,
                eppoMatchedName: 1,
                matchStatus: 1,
                matchStrategy: 1,
                matchConfidence: 1,
                rawCandidate: 1,
            }
        ).lean();

        const resolutionCache = new Map();
        for (const reusableLink of reusableLinks) {
            const key = getScientificNameCacheKey(reusableLink);
            if (!key) {
                continue;
            }

            const existing = resolutionCache.get(key);
            if (!existing || getResolutionScore(reusableLink) > getResolutionScore(existing)) {
                resolutionCache.set(key, cloneUpdate(reusableLink));
            }
        }

        let processedCount = 0;
        let successCount = 0;
        let reviewCount = 0;
        let unmatchedCount = 0;
        let cacheHitCount = 0;
        let apiLookupCount = 0;
        const errorItems = [];

        for (const link of links) {
            processedCount += 1;

            try {
                const cacheKey = getScientificNameCacheKey(link);
                let update = cacheKey ? resolutionCache.get(cacheKey) : null;

                if (update) {
                    update = cloneUpdate(update);
                    cacheHitCount += 1;
                } else {
                    update = await resolveLink(link);
                    apiLookupCount += 1;

                    if (cacheKey) {
                        resolutionCache.set(cacheKey, cloneUpdate(update));
                    }
                }

                await PlantEppoLink.findByIdAndUpdate(link._id, {
                    $set: update,
                });

                if (update.matchStatus === "matched") {
                    successCount += 1;
                } else if (update.matchStatus === "review") {
                    reviewCount += 1;
                } else {
                    unmatchedCount += 1;
                }
            } catch (error) {
                errorItems.push({
                    perenualPlantId: link.perenualPlantId,
                    scientificNameNormalized: link.scientificNameNormalized,
                    message: error.message,
                });
            }
        }

        syncRun.status = errorItems.length ? "partial" : "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = processedCount;
        syncRun.successCount = successCount;
        syncRun.errorCount = errorItems.length;
        syncRun.errorItems = errorItems;
        syncRun.meta = {
            ...(syncRun.meta || {}),
            matchedCount: successCount,
            reviewCount,
            unmatchedCount,
            cacheHitCount,
            apiLookupCount,
        };
        await syncRun.save();

        console.log(
            `Processed ${processedCount} plants. Matched ${successCount}. Review ${reviewCount}. Unmatched ${unmatchedCount}. Cache hits ${cacheHitCount}. API lookups ${apiLookupCount}. Errors ${errorItems.length}.`
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
    console.error("Failed to match plants to EPPO:", error.message);
    process.exit(1);
});
