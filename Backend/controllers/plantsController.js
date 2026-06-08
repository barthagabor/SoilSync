import PerenualPlant from "../models/PerenualPlant.js";
import PlantEppoLink from "../models/PlantEppoLink.js";
import EppoPlantPestRelation from "../models/EppoPlantPestRelation.js";
import EppoTaxon from "../models/EppoTaxon.js";
import EppoDistribution from "../models/EppoDistribution.js";
import { buildPestRiskForPlantCode } from "../utils/pestRisk.js";
import {
    buildCycleFilterCondition,
    buildPlantGuideSections,
    buildTypeFilterCondition,
    normalizeOptionValue,
    REGION_MAPPING,
    resolveCountryName,
} from "../utils/plantCatalog.js";

export const getPlants = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 24,
            search = "",
            watering,
            sunlight,
            care_level,
            type,
            cycle,
            origin,
            includeUnmatched,
            includeWithoutCloudinaryImage,
        } = req.query;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 24;
        const skip = (pageNumber - 1) * limitNumber;

        const query = {};
        const andClauses = [];
        const shouldIncludeUnmatched = String(includeUnmatched || "").trim().toLowerCase() === "true";
        const shouldIncludeWithoutCloudinaryImage =
            String(includeWithoutCloudinaryImage || "").trim().toLowerCase() === "true";

        if (!shouldIncludeUnmatched) {
            query.eppoMatched = true;
        }

        if (!shouldIncludeWithoutCloudinaryImage) {
            query.hasCloudinaryImage = true;
        }

        if (search) {
            const regex = new RegExp(search, "i");
            andClauses.push({
                $or: [
                    { common_name: regex },
                    { scientific_name: regex },
                    { other_name: regex },
                    { genus: regex },
                    { family: regex },
                    { type: regex },
                    { cycle: regex },
                    { watering: regex },
                    { sunlight: regex },
                    { "details.type": regex },
                    { "details.cycle": regex },
                    { "details.care_level": regex },
                    { "details.watering": regex },
                    { "details.origin": regex },
                    { "details.sunlight": regex },
                ],
            });
        }

        if (watering) query["details.watering"] = watering;
        if (care_level) query["details.care_level"] = care_level;
        if (type) {
            const typeCondition = buildTypeFilterCondition(type);
            if (typeCondition) andClauses.push(typeCondition);
        }
        if (cycle) {
            const cycleCondition = buildCycleFilterCondition(cycle);
            if (cycleCondition) andClauses.push(cycleCondition);
        }
        if (sunlight) query["details.sunlight"] = { $in: [new RegExp(sunlight, "i")] };

        if (origin) {
            const mappedCountries = REGION_MAPPING[origin];

            if (mappedCountries) {
                query["details.origin"] = {
                    $in: mappedCountries.map((country) => new RegExp(country, "i")),
                };
            } else {
                query["details.origin"] = { $in: [new RegExp(origin, "i")] };
            }
        }

        if (andClauses.length) query.$and = andClauses;

        const [total, plants] = await Promise.all([
            PerenualPlant.countDocuments(query),
            PerenualPlant.find(query)
                .sort({ common_name: 1 })
                .skip(skip)
                .limit(limitNumber),
        ]);

        res.json({
            data: plants,
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
        });
    } catch (err) {
        console.error("Error fetching plants:", err);
        res.status(500).json({ message: "Server error while fetching plants." });
    }
};

export const getPlantDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const viewerLocation = normalizeOptionValue(req.query?.viewerLocation || req.headers["x-viewer-location"]);

        const plant = await PerenualPlant.findOne({ id: Number(id) });

        if (!plant) {
            return res.status(404).json({ message: "Plant not found" });
        }

        const eppoLink = await PlantEppoLink.findOne(
            { perenualPlantId: Number(id) },
            {
                eppoCode: 1,
                eppoPreferredName: 1,
                eppoMatchedName: 1,
                matchStatus: 1,
                matchStrategy: 1,
                matchConfidence: 1,
            }
        ).lean();

        let pests = [];
        let eppoTaxon = null;
        let distributions = [];
        let pestTaxaByCode = new Map();

        if (eppoLink?.eppoCode && eppoLink?.matchStatus === "matched") {
            [pests, eppoTaxon, distributions] = await Promise.all([
                EppoPlantPestRelation.find(
                    { plantEppoCode: eppoLink.eppoCode },
                    {
                        pestEppoCode: 1,
                        pestPreferredName: 1,
                        classificationId: 1,
                        classificationLabel: 1,
                        classificationLabels: 1,
                    }
                )
                    .sort({ classificationId: 1, pestPreferredName: 1 })
                    .lean(),
                EppoTaxon.findOne(
                    { eppoCode: eppoLink.eppoCode },
                    {
                        preferredName: 1,
                        scientificName: 1,
                        taxonType: 1,
                        taxonomy: 1,
                        kingdom: 1,
                        infoCounts: 1,
                        syncedAt: 1,
                    }
                ).lean(),
                EppoDistribution.find(
                    { eppoCode: eppoLink.eppoCode, isPresent: true },
                    {
                        countryCode: 1,
                        countryName: 1,
                        presenceStatus: 1,
                        isPresent: 1,
                        syncedAt: 1,
                    }
                ).lean(),
            ]);

            if (pests.length > 0) {
                const pestTaxa = await EppoTaxon.find(
                    {
                        eppoCode: {
                            $in: [...new Set(pests.map((item) => item.pestEppoCode).filter(Boolean))],
                        },
                    },
                    {
                        eppoCode: 1,
                        photos: 1,
                    }
                ).lean();

                pestTaxaByCode = new Map(pestTaxa.map((item) => [item.eppoCode, item]));
            }
        }

        const pestRisk =
            eppoLink?.eppoCode && eppoLink?.matchStatus === "matched"
                ? await buildPestRiskForPlantCode(eppoLink.eppoCode, viewerLocation, { relations: pests })
                : null;

        const presentPestCodeSet = new Set(
            Array.isArray(pestRisk?.presentPestCodes) ? pestRisk.presentPestCodes : []
        );

        const distributionCountries = distributions
            .map((item) => ({
                countryCode: item.countryCode,
                countryName: item.countryName || resolveCountryName(item.countryCode) || item.countryCode,
                presenceStatus: item.presenceStatus || null,
            }))
            .sort((a, b) => {
                const left = a.countryName || a.countryCode || "";
                const right = b.countryName || b.countryCode || "";
                return left.localeCompare(right);
            });

        res.json({
            ...plant.toObject(),
            eppo: eppoLink
                ? {
                    code: eppoLink.eppoCode || null,
                    preferredName: eppoLink.eppoPreferredName || null,
                    matchedName: eppoLink.eppoMatchedName || null,
                    matchStatus: eppoLink.matchStatus || "unmatched",
                    matchStrategy: eppoLink.matchStrategy || "unmatched",
                    matchConfidence: eppoLink.matchConfidence || 0,
                    availableRecords: {
                        taxon: Boolean(eppoTaxon),
                        distribution: distributionCountries.length > 0,
                        pests: pests.length > 0,
                    },
                    taxon: eppoTaxon
                        ? {
                            preferredName: eppoTaxon.preferredName || null,
                            scientificName: eppoTaxon.scientificName || null,
                            taxonType: eppoTaxon.taxonType || null,
                            kingdom: eppoTaxon.kingdom
                                ? {
                                    code: eppoTaxon.kingdom.eppocode || null,
                                    name: eppoTaxon.kingdom.prefname || null,
                                    type: eppoTaxon.kingdom.type || null,
                                }
                                : null,
                            taxonomy: Array.isArray(eppoTaxon.taxonomy)
                                ? eppoTaxon.taxonomy.map((item) => ({
                                    code: item.eppocode || null,
                                    name: item.prefname || null,
                                    level: item.level ?? null,
                                    type: item.type || null,
                                }))
                                : [],
                            infoCounts: eppoTaxon.infoCounts || null,
                            syncedAt: eppoTaxon.syncedAt || null,
                        }
                        : null,
                    distribution: {
                        totalCountries: distributionCountries.length,
                        countries: distributionCountries,
                        syncedAt: distributions[0]?.syncedAt || null,
                    },
                    pestRisk,
                }
                : null,
            pests: pests.map((pest) => {
                const pestTaxon = pestTaxaByCode.get(pest.pestEppoCode);
                const photos = Array.isArray(pestTaxon?.photos) ? pestTaxon.photos : [];
                const primaryPhoto = photos[0] || null;

                return {
                    eppoCode: pest.pestEppoCode,
                    name: pest.pestPreferredName || pest.pestEppoCode,
                    classificationId: pest.classificationId ?? null,
                    classificationLabel:
                        pest.classificationLabel ||
                        (Array.isArray(pest.classificationLabels) ? pest.classificationLabels[0] : null) ||
                        null,
                    thumbnailUrl: primaryPhoto?.thumbnailUrl || null,
                    imageUrl: primaryPhoto?.imageUrl || null,
                    imageCaption: primaryPhoto?.caption || null,
                    imageCredit: primaryPhoto?.credit || null,
                    photoCount: photos.length,
                    presentInViewerCountry: presentPestCodeSet.has(pest.pestEppoCode),
                    viewerCountryCode: pestRisk?.countryCode || null,
                    viewerCountryName: pestRisk?.countryName || null,
                };
            }),
        });
    } catch (err) {
        console.error("Error fetching plant details:", err);
        res.status(500).json({ message: "Server error while fetching plant details." });
    }
};

export const getPlantGuides = async (req, res) => {
    try {
        const { id } = req.params;
        const plant = await PerenualPlant.findOne({ id: Number(id) }, { details: 1 }).lean();

        if (!plant) {
            return res.status(404).json({ message: "Plant not found" });
        }

        const section = buildPlantGuideSections(plant);
        res.json({
            data: section.length ? [{ section }] : [],
        });
    } catch (err) {
        console.error("Error fetching plant guides:", err);
        res.status(500).json({ message: "Server error while fetching plant guides." });
    }
};

export const getRegions = async (_req, res) => {
    try {
        const regions = await PerenualPlant.aggregate([
            { $unwind: "$details.origin" },
            {
                $group: {
                    _id: "$details.origin",
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                },
            },
        ]);

        const regionList = regions.map((region) => region.name).filter(Boolean);
        res.json(regionList);
    } catch (err) {
        console.error("Error fetching regions:", err);
        res.status(500).json({ message: "Server error while fetching regions." });
    }
};
