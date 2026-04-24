import EppoDistribution from "../models/EppoDistribution.js";
import EppoPlantPestRelation from "../models/EppoPlantPestRelation.js";
import PlantEppoLink from "../models/PlantEppoLink.js";

const regionNameFormatter =
    typeof Intl?.DisplayNames === "function"
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

let countryCache = {
    expiresAt: 0,
    entries: [],
    byCode: new Map(),
    byName: new Map(),
};

const COUNTRY_CACHE_TTL_MS = 30 * 60 * 1000;

const normalizeText = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toLowerCase();

const normalizeOptionValue = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
};

const resolveCountryName = (countryCode) => {
    const normalizedCode = String(countryCode || "").trim().toUpperCase();
    if (!normalizedCode) return null;

    try {
        return regionNameFormatter?.of(normalizedCode) || null;
    } catch {
        return null;
    }
};

const buildCountryCandidates = (rawLocation) => {
    const raw = normalizeOptionValue(rawLocation);
    if (!raw) return [];

    const commaSeparated = raw
        .split(",")
        .map((part) => normalizeOptionValue(part))
        .filter(Boolean);
    const slashSeparated = raw
        .split(/[;/|]/)
        .map((part) => normalizeOptionValue(part))
        .filter(Boolean);
    const tokens = [
        raw,
        ...commaSeparated.reverse(),
        ...slashSeparated.reverse(),
    ];

    return [...new Set(tokens)];
};

const getCountryDirectory = async () => {
    if (countryCache.expiresAt > Date.now()) {
        return countryCache;
    }

    const rows = await EppoDistribution.aggregate([
        {
            $group: {
                _id: "$countryCode",
                countryCode: { $first: "$countryCode" },
                countryName: { $first: "$countryName" },
            },
        },
    ]);

    const entries = rows
        .map((item) => {
            const countryCode = normalizeOptionValue(item?.countryCode)?.toUpperCase();
            const countryName = normalizeOptionValue(item?.countryName) || resolveCountryName(countryCode);
            if (!countryCode) return null;

            return {
                countryCode,
                countryName: countryName || countryCode,
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.countryName.localeCompare(right.countryName));

    const byCode = new Map();
    const byName = new Map();

    for (const entry of entries) {
        byCode.set(entry.countryCode, entry);
        byName.set(normalizeText(entry.countryCode), entry);
        if (entry.countryName) {
            byName.set(normalizeText(entry.countryName), entry);
        }
    }

    countryCache = {
        expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS,
        entries,
        byCode,
        byName,
    };

    return countryCache;
};

export const resolveCountryContextFromLocation = async (rawLocation) => {
    const location = normalizeOptionValue(rawLocation);
    if (!location) return null;

    const directory = await getCountryDirectory();
    const candidates = buildCountryCandidates(location);

    for (const candidate of candidates) {
        const normalizedCandidate = normalizeText(candidate);
        const uppercaseCandidate = String(candidate).trim().toUpperCase();

        if (directory.byCode.has(uppercaseCandidate)) {
            const match = directory.byCode.get(uppercaseCandidate);
            return {
                rawLocation: location,
                countryCode: match.countryCode,
                countryName: match.countryName,
                matchSource: "code",
                matchValue: candidate,
            };
        }

        if (directory.byName.has(normalizedCandidate)) {
            const match = directory.byName.get(normalizedCandidate);
            return {
                rawLocation: location,
                countryCode: match.countryCode,
                countryName: match.countryName,
                matchSource: "name",
                matchValue: candidate,
            };
        }
    }

    return null;
};

const getClassificationBucket = (label) => {
    const normalized = normalizeText(label);
    if (normalized.includes("major")) return "major";
    if (normalized.includes("host")) return "host";
    if (normalized.includes("experimental")) return "experimental";
    return "other";
};

const buildRiskLabel = ({ presentCount, majorCount, score, coveredCount, totalCount }) => {
    if (presentCount === 0) {
        if (totalCount === 0) return "low";
        if (coveredCount === 0) return "unknown";
        return "low";
    }

    if (majorCount > 0 || score >= 6 || presentCount >= 3) return "high";
    return "caution";
};

const buildRiskSummary = ({ label, presentCount, countryName, totalCount, coveredCount }) => {
    if (!countryName) {
        return "Add your country in the profile to evaluate local pest exposure.";
    }

    if (totalCount === 0) {
        return "No EPPO pest records are currently linked to this plant.";
    }

    if (coveredCount === 0) {
        return `Pest relations exist, but no country-level EPPO distribution data has been cached yet for ${countryName}.`;
    }

    if (presentCount === 0) {
        return `No linked EPPO pests are currently flagged as present in ${countryName}.`;
    }

    if (label === "high") {
        return `${presentCount} linked EPPO pest${presentCount !== 1 ? "s are" : " is"} currently present in ${countryName}.`;
    }

    return `${presentCount} linked EPPO pest${presentCount !== 1 ? "s are" : " is"} present in ${countryName}, so planting should be done with caution.`;
};

export const buildPestRiskForPlantCode = async (
    plantEppoCode,
    rawLocation,
    { relations: prefetchedRelations = null } = {}
) => {
    if (!normalizeOptionValue(plantEppoCode)) {
        return {
            status: "no_match",
            label: "unknown",
            summary: "This plant is not linked to an EPPO taxon yet.",
        };
    }

    const country = await resolveCountryContextFromLocation(rawLocation);
    if (!country) {
        return {
            status: "no_location",
            label: "unknown",
            summary: "Add your country in the profile to evaluate local pest exposure.",
        };
    }

    const relations =
        prefetchedRelations ||
        (await EppoPlantPestRelation.find(
            { plantEppoCode },
            {
                pestEppoCode: 1,
                pestPreferredName: 1,
                classificationLabel: 1,
                classificationLabels: 1,
            }
        ).lean());

    const totalPestCount = relations.length;

    if (totalPestCount === 0) {
        return {
            status: "no_pests",
            label: "low",
            countryCode: country.countryCode,
            countryName: country.countryName,
            summary: "No EPPO pest records are currently linked to this plant.",
            presentCount: 0,
            totalPestCount: 0,
            coveredPestCount: 0,
            missingDistributionCount: 0,
            warnings: [],
            presentPestCodes: [],
        };
    }

    const pestCodes = [...new Set(relations.map((relation) => relation.pestEppoCode).filter(Boolean))];
    const [coveredCodes, presentRows] = await Promise.all([
        EppoDistribution.distinct("eppoCode", {
            eppoCode: { $in: pestCodes },
        }),
        EppoDistribution.find(
            {
                eppoCode: { $in: pestCodes },
                countryCode: country.countryCode,
                isPresent: true,
            },
            {
                eppoCode: 1,
                countryCode: 1,
                countryName: 1,
                presenceStatus: 1,
            }
        ).lean(),
    ]);

    const coveredSet = new Set(coveredCodes.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean));
    const presentSet = new Set(
        presentRows.map((row) => String(row?.eppoCode || "").trim().toUpperCase()).filter(Boolean)
    );
    const presentRelations = relations.filter((relation) => presentSet.has(String(relation.pestEppoCode || "").trim().toUpperCase()));

    let majorCount = 0;
    let hostCount = 0;
    let experimentalCount = 0;
    let otherCount = 0;
    let score = 0;

    for (const relation of presentRelations) {
        const labels = [
            relation.classificationLabel,
            ...(Array.isArray(relation.classificationLabels) ? relation.classificationLabels : []),
        ].filter(Boolean);
        const bucket = getClassificationBucket(labels[0]);

        if (bucket === "major") {
            majorCount += 1;
            score += 3;
        } else if (bucket === "host") {
            hostCount += 1;
            score += 2;
        } else if (bucket === "experimental") {
            experimentalCount += 1;
            score += 1;
        } else {
            otherCount += 1;
            score += 1;
        }
    }

    const coveredPestCount = pestCodes.filter((code) => coveredSet.has(String(code || "").trim().toUpperCase())).length;
    const presentCount = presentRelations.length;
    const label = buildRiskLabel({
        presentCount,
        majorCount,
        score,
        coveredCount: coveredPestCount,
        totalCount: totalPestCount,
    });

    const warnings = presentRelations.slice(0, 4).map((relation) => {
        const pestName = relation.pestPreferredName || relation.pestEppoCode;
        const classification = relation.classificationLabel || relation.classificationLabels?.[0];
        return classification
            ? `${pestName} is present in ${country.countryName} (${classification})`
            : `${pestName} is present in ${country.countryName}`;
    });

    return {
        status: coveredPestCount === 0 ? "no_distribution_data" : "evaluated",
        label,
        countryCode: country.countryCode,
        countryName: country.countryName,
        summary: buildRiskSummary({
            label,
            presentCount,
            countryName: country.countryName,
            totalCount: totalPestCount,
            coveredCount: coveredPestCount,
        }),
        presentCount,
        totalPestCount,
        coveredPestCount,
        missingDistributionCount: Math.max(0, totalPestCount - coveredPestCount),
        majorPresentCount: majorCount,
        hostPresentCount: hostCount,
        experimentalPresentCount: experimentalCount,
        otherPresentCount: otherCount,
        warnings,
        presentPestCodes: presentRelations.map((relation) => relation.pestEppoCode).filter(Boolean),
    };
};

export const enrichRecommendationResultsWithPestRisk = async (results, rawLocation, { plantLinksById } = {}) => {
    if (!Array.isArray(results) || results.length === 0) return [];

    const linkedIds = results
        .map((result) => Number(result?.id))
        .filter((value) => Number.isFinite(value));

    if (linkedIds.length === 0) return results;

    let linksById = plantLinksById;
    if (!linksById) {
        const links = await PlantEppoLink.find(
            {
                perenualPlantId: { $in: linkedIds },
            },
            {
                perenualPlantId: 1,
                eppoCode: 1,
                matchStatus: 1,
            }
        ).lean();

        linksById = new Map(links.map((link) => [Number(link.perenualPlantId), link]));
    }

    const enriched = [];

    for (const result of results) {
        const plantId = Number(result?.id);
        const link = linksById.get(plantId);
        const pestRisk =
            link?.matchStatus === "matched" && link?.eppoCode
                ? await buildPestRiskForPlantCode(link.eppoCode, rawLocation)
                : {
                      status: link ? "no_match" : "unlinked",
                      label: "unknown",
                      summary: "No EPPO pest intelligence is linked to this plant yet.",
                  };

        const riskFlags = Array.isArray(result.risk_flags) ? [...result.risk_flags] : [];

        if (pestRisk?.label === "high") {
            riskFlags.unshift(`High pest exposure in ${pestRisk.countryName}`);
        } else if (pestRisk?.label === "caution") {
            riskFlags.unshift(`Known pest exposure in ${pestRisk.countryName}`);
        }

        enriched.push({
            ...result,
            risk_flags: [...new Set(riskFlags)].slice(0, 5),
            pest_risk: pestRisk,
        });
    }

    return enriched;
};
