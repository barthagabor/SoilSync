const DATA_IMAGE_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;
const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\/\S+/i;
const CLOUDINARY_IMAGE_URL_PATTERN = /(?:^https?:\/\/)?(?:res\.)?cloudinary\.com\//i;

export const normalizeOptionValue = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
};

export const isInlineImageDataUrl = (value) => DATA_IMAGE_URL_PATTERN.test(String(value || "").trim());
export const isRemoteImageUrl = (value) => REMOTE_IMAGE_URL_PATTERN.test(String(value || "").trim());
export const isCloudinaryImageUrl = (value) => CLOUDINARY_IMAGE_URL_PATTERN.test(String(value || "").trim());

export const splitCommaSeparatedValues = (value) =>
    String(value || "")
        .split(",")
        .map((entry) => normalizeOptionValue(entry))
        .filter(Boolean);

export const buildPlantGuideSections = (plant) => {
    const details = plant?.details || {};
    const sections = [];

    if (details.watering) {
        sections.push({
            type: "watering",
            description: `Watering requirement: ${details.watering}.`,
        });
    }

    if (Array.isArray(details.sunlight) && details.sunlight.length) {
        sections.push({
            type: "sunlight",
            description: `Preferred light exposure: ${details.sunlight.join(", ")}.`,
        });
    }

    if (Array.isArray(details.pruning_month) && details.pruning_month.length) {
        sections.push({
            type: "pruning",
            description: `Recommended pruning months: ${details.pruning_month.join(", ")}.`,
        });
    }

    if (Array.isArray(details.propagation) && details.propagation.length) {
        sections.push({
            type: "propagation",
            description: `Propagation methods: ${details.propagation.join(", ")}.`,
        });
    }

    if (details.maintenance) {
        sections.push({
            type: "maintenance",
            description: `Maintenance level: ${details.maintenance}.`,
        });
    }

    return sections;
};

export const escapeRegexLiteral = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildStoredPlantImage = (source) => {
    const normalizedSource = normalizeOptionValue(source);
    if (!normalizedSource) return {};

    return {
        original_url: normalizedSource,
        regular_url: normalizedSource,
        medium_url: normalizedSource,
        small_url: normalizedSource,
        thumbnail: normalizedSource,
    };
};

const getStoredPlantImageCandidates = (image) => [
    image?.regular_url,
    image?.original_url,
    image?.medium_url,
    image?.small_url,
    image?.thumbnail,
].filter(Boolean);

export const detectPlantImageStorageProvider = (image) => {
    const candidates = getStoredPlantImageCandidates(image);
    if (!candidates.length) return "missing";
    if (candidates.some((value) => isCloudinaryImageUrl(value))) return "cloudinary";
    return "external";
};

const regionNameFormatter =
    typeof Intl?.DisplayNames === "function"
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

export const resolveCountryName = (countryCode) => {
    const normalizedCode = String(countryCode || "").trim().toUpperCase();
    if (!normalizedCode) return null;

    try {
        return regionNameFormatter?.of(normalizedCode) || null;
    } catch {
        return null;
    }
};

export const collectDistinctValues = (plants, extractor, { sort = true } = {}) => {
    const values = new Set();

    for (const plant of plants) {
        const extracted = extractor(plant);
        const list = Array.isArray(extracted) ? extracted : [extracted];

        for (const item of list) {
            const normalized = normalizeOptionValue(item);
            if (normalized) values.add(normalized);
        }
    }

    const result = [...values];
    return sort ? result.sort((a, b) => a.localeCompare(b)) : result;
};

export const canonicalizeSunlight = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("full sun")) return "full sun";
    if (text.includes("part shade") || text.includes("part sun") || text.includes("filtered")) return "part shade";
    if (text.includes("full shade") || text === "shade" || text.includes("partial shade")) return "full shade";
    return null;
};

export const canonicalizeWatering = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("frequent")) return "Frequent";
    if (text.includes("minimum") || text.includes("low")) return "Minimum";
    if (text.includes("average") || text.includes("medium") || text.includes("regular")) return "Average";
    return null;
};

export const canonicalizeCareLevel = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("low")) return "Low";
    if (text.includes("medium")) return "Medium";
    if (text.includes("high")) return "High";
    return null;
};

export const canonicalizeSoil = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("alkaline")) return "Alkaline";
    if (text.includes("acid")) return "Acidic";
    if (text.includes("bog")) return "Bog";
    if (text.includes("humus")) return "Humus";
    if (text.includes("clay")) return "Clay";
    if (text.includes("loam")) return "Loam";
    if (text.includes("rock")) return "Rocky";
    if (text.includes("sand")) return "Sand";
    return null;
};

export const canonicalizeType = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("tree")) return "Tree";
    if (text.includes("shrub") || text.includes("bush")) return "Shrub";
    if (text.includes("fern")) return "Fern";
    if (text.includes("grass") || text.includes("sedge") || text.includes("rush")) return "Grass or Sedge";
    if (text.includes("vine") || text.includes("climber")) return "Vine";
    if (text.includes("succulent")) return "Succulent";
    if (text.includes("cactus")) return "Cactus";
    if (text.includes("palm")) return "Palm";
    if (text.includes("orchid")) return "Orchid";
    if (text.includes("herb")) return "Herb";
    if (text.includes("flower")) return "Flower";
    return null;
};

const TYPE_FILTER_PATTERNS = {
    tree: ["tree", "needled evergreen"],
    flower: ["flower", "begonia", "coneflower", "chrysanthemum", "aster"],
    flowers: ["flower", "begonia", "coneflower", "chrysanthemum", "aster"],
    succulent: ["succulent"],
    shrub: ["shrub", "deciduous shrub", "broadleaf evergreen", "bush"],
    herb: ["herb", "herbs"],
    fern: ["fern"],
    "grass or sedge": ["ornamental grass", "rush or sedge", "grass"],
    vine: ["vine", "creeper", "climber"],
    bulb: ["bulb"],
    fruit: ["fruit"],
    vegetable: ["vegetable"],
    palm: ["palm", "palm or cycad"],
    orchid: ["orchid"],
    cactus: ["cactus"],
};

export const buildTypeFilterCondition = (value) => {
    const normalizedType = normalizeOptionValue(value)?.toLowerCase();
    if (!normalizedType) return null;

    const patterns = TYPE_FILTER_PATTERNS[normalizedType] || [normalizedType];
    const regexes = [...new Set(patterns)].map((pattern) => new RegExp(pattern, "i"));

    return {
        $or: [
            { "details.type": { $in: regexes } },
            { type: { $in: regexes } },
        ],
    };
};

export const buildCycleFilterCondition = (value) => {
    const normalizedCycle = normalizeOptionValue(value)?.toLowerCase();
    if (!normalizedCycle) return null;

    let patterns = [normalizedCycle];
    if (normalizedCycle.includes("perennial")) patterns = ["perennial"];
    if (normalizedCycle.includes("annual")) patterns = ["annual"];
    if (normalizedCycle.includes("biennial")) patterns = ["biennial"];

    const regexes = [...new Set(patterns)].map((pattern) => new RegExp(pattern, "i"));

    return {
        $or: [
            { "details.cycle": { $in: regexes } },
            { cycle: { $in: regexes } },
        ],
    };
};

export const canonicalizeCycle = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("annual")) return "Annual";
    if (text.includes("biennial")) return "Biennial";
    if (text.includes("perennial")) return "Perennial";
    return null;
};

const getPrimaryScientificName = (plant) =>
    Array.isArray(plant?.scientific_name)
        ? String(plant.scientific_name[0] || "").trim()
        : String(plant?.scientific_name || "").trim();

export const getPlantRecordId = (plant) => {
    const rawValue = plant?._doc?.id ?? plant?.id;
    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? null : numericValue;
};

export const getPlantDisplayName = (plant) =>
    String(plant?.common_name || getPrimaryScientificName(plant) || `Plant #${getPlantRecordId(plant) || "?"}`).trim();

export const REGION_MAPPING = {
    Europe: ["Europe", "Germany", "France", "Italy", "Spain", "United Kingdom", "Hungary", "Austria", "Romania", "Ukraine", "Poland"],
    Oceania: ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Samoa"],
    "North America": ["United States", "Canada", "Mexico"],
    Asia: ["China", "Japan", "India", "Thailand", "Vietnam", "Indonesia", "South Korea"],
    Africa: ["South Africa", "Egypt", "Nigeria", "Kenya", "Morocco"],
    "South America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru"],
};
