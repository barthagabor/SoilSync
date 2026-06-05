import Plant from "../models/Plant.js";
import { normalizeText, summarizePlant } from "./premiumContextService.js";

const PLANNER_STYLE_VALUES = [
    "flowering_cottage",
    "stone_gravel",
    "modern_minimal",
    "mediterranean",
    "japanese_zen",
];

const SPACE_TYPE_VALUES = [
    "outdoor_home",
    "front_yard",
    "backyard",
    "courtyard",
    "patio_terrace",
    "balcony",
    "indoor_corner",
    "indoor_sunroom",
];

const MOOD_VALUES = ["natural", "calm", "vibrant", "cozy", "elegant"];
const MAINTENANCE_VALUES = ["low", "medium", "high"];
const HARDSCAPE_VALUES = ["mixed", "lawn", "gravel", "stone", "deck"];
const DENSITY_VALUES = ["airy", "balanced", "lush"];
const REALISM_VALUES = ["easy_to_recreate", "balanced", "concept_only"];
const BUDGET_VALUES = ["budget_friendly", "mid_range", "premium"];
const CYCLE_VALUES = ["Perennial", "Annual", "Biennial"];
const WATERING_VALUES = ["Minimum", "Average", "Frequent"];
const CARE_LEVEL_VALUES = ["Low", "Medium", "High"];
const GROWTH_VALUES = ["Low", "Medium", "High"];
const PLANNER_ACTION_PLANT_LIMIT = 10;

const DEFAULT_DESIGN_BRIEF = {
    spaceType: "outdoor_home",
    style: "flowering_cottage",
    mood: "natural",
    maintenanceLevel: "medium",
    hardscape: "mixed",
    density: "balanced",
    realismLevel: "easy_to_recreate",
    budgetLevel: "budget_friendly",
    extraDirections: "",
};

const STYLE_LABELS = {
    flowering_cottage: "Flowering Cottage",
    stone_gravel: "Stone & Gravel",
    modern_minimal: "Modern Minimal",
    mediterranean: "Mediterranean",
    japanese_zen: "Japanese Zen",
};

const STYLE_TYPE_PREFERENCES = {
    flowering_cottage: ["flower", "shrub", "vine", "herb"],
    stone_gravel: ["ornamental grass", "herb", "shrub", "flower"],
    modern_minimal: ["ornamental grass", "shrub", "tree"],
    mediterranean: ["herb", "shrub", "tree", "fruit"],
    japanese_zen: ["tree", "shrub", "ornamental grass", "vine"],
};

const TYPE_ALIASES = {
    flowers: "flower",
    flowering: "flower",
    grasses: "ornamental grass",
    grass: "ornamental grass",
    herbs: "herb",
    shrubs: "shrub",
    trees: "tree",
    fruits: "fruit",
    fruit_tree: "fruit",
    fruit_trees: "fruit",
    vegetables: "vegetable",
    veggies: "vegetable",
    climber: "vine",
    climbers: "vine",
    vines: "vine",
};

const STYLE_ALIASES = {
    "flowering cottage": "flowering_cottage",
    cottage: "flowering_cottage",
    "stone gravel": "stone_gravel",
    gravel: "stone_gravel",
    stone: "stone_gravel",
    "modern minimal": "modern_minimal",
    modern: "modern_minimal",
    minimal: "modern_minimal",
    mediterranean: "mediterranean",
    "japanese zen": "japanese_zen",
    zen: "japanese_zen",
    japanese: "japanese_zen",
};

const SPACE_TYPE_ALIASES = {
    "outdoor home": "outdoor_home",
    "front yard": "front_yard",
    backyard: "backyard",
    courtyard: "courtyard",
    patio: "patio_terrace",
    terrace: "patio_terrace",
    balcony: "balcony",
    "indoor corner": "indoor_corner",
    sunroom: "indoor_sunroom",
};

const REALISM_ALIASES = {
    realistic: "easy_to_recreate",
    "easy to recreate": "easy_to_recreate",
    balanced: "balanced",
    concept: "concept_only",
    aspirational: "concept_only",
};

const BUDGET_ALIASES = {
    cheap: "budget_friendly",
    affordable: "budget_friendly",
    budget: "budget_friendly",
    "budget friendly": "budget_friendly",
    "low cost": "budget_friendly",
    "low costs": "budget_friendly",
    "low budget": "budget_friendly",
    inexpensive: "budget_friendly",
    olcso: "budget_friendly",
    "alacsony koltseg": "budget_friendly",
    "koltseghatekony": "budget_friendly",
    "mid range": "mid_range",
    premium: "premium",
    luxury: "premium",
};

const MAINTENANCE_ALIASES = {
    low: "low",
    easy: "low",
    "low maintenance": "low",
    "easy to maintain": "low",
    "easy care": "low",
    "easy to care for": "low",
    "alacsony karbantartas": "low",
    "keves gondozas": "low",
    medium: "medium",
    moderate: "medium",
    high: "high",
};

const PLANNER_MESSAGE_HINTS = {
    spaceType: {
        balcony: ["balcony", "erkely"],
        patio_terrace: ["patio", "terrace", "terasz"],
        courtyard: ["courtyard", "inner court", "belso udvar", "udvar"],
        front_yard: ["front yard", "front garden", "elokert"],
        backyard: ["backyard", "back garden", "hatso kert", "kert"],
        indoor_corner: ["indoor corner", "inside corner", "beltéri sarok", "benti sarok"],
        indoor_sunroom: ["sunroom", "conservatory", "telikert"],
        outdoor_home: ["home garden", "residential garden", "otthoni kert"],
    },
    mood: {
        calm: ["calm", "peaceful", "quiet", "serene", "zen", "nyugodt", "bekes", "letisztult"],
        vibrant: ["vibrant", "colorful", "bold", "élénk", "színes"],
        cozy: ["cozy", "warm", "inviting", "otthonos", "meleg"],
        elegant: ["elegant", "refined", "clean", "sophisticated", "elegans"],
        natural: ["natural", "organic", "soft", "termeszetes"],
    },
    hardscape: {
        stone: ["stone", "rock", "ko", "koves"],
        gravel: ["gravel", "kavics", "murva"],
        lawn: ["lawn", "grass lawn", "gyep", "pazsit"],
        deck: ["deck", "wood deck", "fapadlo"],
        mixed: ["mixed", "vegyes"],
    },
    density: {
        airy: ["airy", "open", "minimal clutter", "sparse", "szellos", "ritkas"],
        balanced: ["balanced", "even", "rendezett", "kiegyensulyozott"],
        lush: ["lush", "full", "dense", "buja", "dus"],
    },
    realismLevel: {
        easy_to_recreate: ["easy to recreate", "easy to build", "realistic", "believable", "practical", "kivitelezheto", "konnyen kivitelezheto", "realisztikus"],
        balanced: ["balanced realism", "semi realistic", "kiegyensulyozott"],
        concept_only: ["concept only", "aspirational", "dreamy", "csak koncepcio"],
    },
    budgetLevel: {
        budget_friendly: ["budget friendly", "budget-friendly", "low cost", "low costs", "affordable", "cheap", "olcso", "alacsony koltseg", "koltseghatekony"],
        mid_range: ["mid range", "mid-range", "kozepes koltseg"],
        premium: ["premium", "luxury", "high end", "luxus"],
    },
    maintenanceLevel: {
        low: ["low maintenance", "easy care", "easy to maintain", "low effort", "kevés gondozás", "alacsony karbantartas"],
        medium: ["medium maintenance", "moderate maintenance", "kozepes karbantartas"],
        high: ["high maintenance", "detailed care", "magas karbantartas"],
    },
};

const STYLE_DESIGN_DEFAULTS = {
    flowering_cottage: { mood: "vibrant", hardscape: "mixed", density: "lush" },
    stone_gravel: { mood: "calm", hardscape: "gravel", density: "airy" },
    modern_minimal: { mood: "elegant", hardscape: "stone", density: "airy" },
    mediterranean: { mood: "natural", hardscape: "stone", density: "balanced" },
    japanese_zen: { mood: "calm", hardscape: "stone", density: "airy" },
};

const SOIL_ALIASES = {
    sandy: "Sandy",
    sand: "Sandy",
    loamy: "Loamy",
    loam: "Loamy",
    clay: "Clay",
    chalky: "Chalky",
    silt: "Silty",
    silty: "Silty",
    peat: "Peaty",
    peaty: "Peaty",
    welldrained: "Well-drained",
    "well drained": "Well-drained",
};

const SUNLIGHT_ALIASES = {
    sun: "full sun",
    sunny: "full sun",
    "full sun": "full sun",
    partial: "part shade",
    "part sun": "part shade",
    "part shade": "part shade",
    shade: "full shade",
    "full shade": "full shade",
};

const getPlantImage = (plant) =>
    plant?.default_image?.regular_url ||
    plant?.default_image?.medium_url ||
    plant?.default_image?.small_url ||
    plant?.default_image?.thumbnail ||
    "";

const titleCase = (value) =>
    normalizeText(value)
        .toLowerCase()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const normalizeBoolean = (value, defaultValue = false) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    const text = normalizeText(value).toLowerCase();
    if (["true", "yes", "y", "1"].includes(text)) return true;
    if (["false", "no", "n", "0"].includes(text)) return false;
    return defaultValue;
};

const uniqueNumbers = (values = []) =>
    [...new Set((Array.isArray(values) ? values : []).map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))];

const toList = (value) => {
    if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
    const text = normalizeText(value);
    if (!text) return [];
    return text
        .split(/[,/]| and /i)
        .map((item) => normalizeText(item))
        .filter(Boolean);
};

const includesValue = (source, expected) =>
    normalizeText(source).toLowerCase().includes(normalizeText(expected).toLowerCase());

const listIncludesValue = (values = [], expected) => values.some((value) => includesValue(value, expected));

const normalizeEnumValue = (value, allowedValues = [], aliases = {}) => {
    const text = normalizeText(value).toLowerCase();
    if (!text) return "";

    if (aliases[text]) return aliases[text];

    const exact = allowedValues.find((candidate) => candidate.toLowerCase() === text);
    if (exact) return exact;

    const fuzzy = allowedValues.find((candidate) => text.includes(candidate.toLowerCase()) || candidate.toLowerCase().includes(text));
    return fuzzy || "";
};

const normalizeTypeValue = (value) => {
    const text = normalizeText(value).toLowerCase();
    if (!text) return "";
    return TYPE_ALIASES[text] || text;
};

const normalizeSoilValue = (value) => {
    const text = normalizeText(value).toLowerCase();
    if (!text) return "";
    return SOIL_ALIASES[text] || titleCase(text);
};

const normalizeSunlightValue = (value) => {
    const text = normalizeText(value).toLowerCase();
    if (!text) return "";
    return SUNLIGHT_ALIASES[text] || text;
};

const normalizeWateringValue = (value) => normalizeEnumValue(value, WATERING_VALUES);
const normalizeCareLevelValue = (value) => normalizeEnumValue(value, CARE_LEVEL_VALUES);
const normalizeCycleValue = (value) => normalizeEnumValue(value, CYCLE_VALUES);
const normalizeGrowthValue = (value) => normalizeEnumValue(value, GROWTH_VALUES);

const messageIncludesAny = (message, phrases = []) => {
    const normalized = normalizeText(message).toLowerCase();
    if (!normalized) return false;
    return phrases.some((phrase) => normalized.includes(normalizeText(phrase).toLowerCase()));
};

const inferPlannerFieldFromMessage = (message, mapping = {}) => {
    const normalizedMessage = normalizeText(message);
    if (!normalizedMessage) return "";

    for (const [value, phrases] of Object.entries(mapping)) {
        if (messageIncludesAny(normalizedMessage, phrases)) return value;
    }

    return "";
};

const normalizeZoneNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.min(13, Math.max(1, Math.round(value)));
    const match = normalizeText(value).match(/(\d{1,2})/);
    if (!match) return null;
    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(13, Math.max(1, parsed));
};

const parseHardinessRangeFromMessage = (text) => {
    const raw = normalizeText(text).toLowerCase();
    if (!raw) return { min: null, max: null };

    const rangeMatch = raw.match(/zone(?:s)?\s*(\d{1,2})\s*(?:to|-)\s*(\d{1,2})/i);
    if (rangeMatch) {
        return {
            min: normalizeZoneNumber(rangeMatch[1]),
            max: normalizeZoneNumber(rangeMatch[2]),
        };
    }

    const singleMatch = raw.match(/zone(?:s)?\s*(\d{1,2})/i);
    if (singleMatch) {
        const zone = normalizeZoneNumber(singleMatch[1]);
        return { min: zone, max: zone };
    }

    return { min: null, max: null };
};

const plantMatchesHardinessRange = (plantSummary, minZone, maxZone) => {
    if (!minZone && !maxZone) return true;

    const hardinessMin = normalizeZoneNumber(plantSummary?.hardiness?.min);
    const hardinessMax = normalizeZoneNumber(plantSummary?.hardiness?.max);

    if (!hardinessMin && !hardinessMax) return false;

    const candidateMin = hardinessMin || hardinessMax;
    const candidateMax = hardinessMax || hardinessMin;
    const wantedMin = minZone || maxZone;
    const wantedMax = maxZone || minZone;

    return candidateMin <= wantedMax && candidateMax >= wantedMin;
};

const summarizeRawPlant = (plant) => summarizePlant(plant);

const buildPlantCard = (plantSummary, extra = {}) => {
    const badges = [
        plantSummary.type ? titleCase(plantSummary.type) : "",
        plantSummary.watering || "",
        plantSummary.careLevel || "",
        ...(Array.isArray(extra.badges) ? extra.badges : []),
    ].filter(Boolean);

    return {
        type: "plant",
        id: Number(plantSummary.id),
        commonName: plantSummary.commonName,
        scientificName: plantSummary.scientificName,
        image: plantSummary.image || "",
        badges: [...new Set(badges)].slice(0, 5),
        note: normalizeText(extra.note),
        rationale: normalizeText(extra.rationale),
        isSuggested: Boolean(extra.isSuggested),
        plantType: plantSummary.type || "",
        meta: {
            cycle: plantSummary.cycle || "",
            watering: plantSummary.watering || "",
            careLevel: plantSummary.careLevel || "",
            sunlight: plantSummary.sunlight || [],
            soil: plantSummary.soil || [],
            hardiness: plantSummary.hardiness || null,
        },
    };
};

const buildSavedGardenCard = (garden, extra = {}) => ({
    type: "savedGarden",
    gardenId: String(garden?._id || garden?.id || ""),
    title: normalizeText(garden?.title) || "Saved Garden",
    gardenStyle: normalizeText(garden?.gardenStyle),
    plantCount: Number(garden?.plantCount || (Array.isArray(garden?.plants) ? garden.plants.length : 0) || 0),
    savedAt: garden?.savedAt || null,
    score: Number(extra.score || 0),
    scoreLabel: normalizeText(extra.scoreLabel),
    reasons: Array.isArray(extra.reasons) ? extra.reasons.map((item) => normalizeText(item)).filter(Boolean) : [],
    note: normalizeText(extra.note),
    plants: Array.isArray(garden?.plants) ? garden.plants.slice(0, 6) : [],
});

const buildRegexQuery = (field, value) => ({ [field]: new RegExp(normalizeText(value), "i") });

const buildPlantQuery = (filters = {}) => {
    const clauses = [];

    if (filters.sunlight) {
        clauses.push({
            $or: [buildRegexQuery("details.sunlight", filters.sunlight), buildRegexQuery("sunlight", filters.sunlight)],
        });
    }

    if (filters.watering) {
        clauses.push({
            $or: [buildRegexQuery("details.watering", filters.watering), buildRegexQuery("watering", filters.watering)],
        });
    }

    if (filters.soil) {
        clauses.push(buildRegexQuery("details.soil", filters.soil));
    }

    if (filters.type) {
        clauses.push({
            $or: [buildRegexQuery("details.type", filters.type), buildRegexQuery("type", filters.type)],
        });
    }

    if (filters.cycle) {
        clauses.push({
            $or: [buildRegexQuery("details.cycle", filters.cycle), buildRegexQuery("cycle", filters.cycle)],
        });
    }

    if (filters.careLevel) {
        clauses.push(buildRegexQuery("details.care_level", filters.careLevel));
    }

    if (filters.medicinal) {
        clauses.push({ "details.medicinal": true });
    }

    if (filters.petSafe) {
        clauses.push({ "details.toxicity.pets": false });
    }

    return clauses.length ? { $and: clauses } : {};
};

const matchesStringCriterion = (actualValue, expectedValue) => {
    if (!expectedValue) return true;
    if (Array.isArray(actualValue)) return listIncludesValue(actualValue, expectedValue);
    return includesValue(actualValue, expectedValue);
};

const matchesPlantFilterStrictly = (plantSummary, filters) => {
    if (!matchesStringCriterion(plantSummary.sunlight, filters.sunlight)) return false;
    if (!matchesStringCriterion(plantSummary.watering, filters.watering)) return false;
    if (!matchesStringCriterion(plantSummary.soil, filters.soil)) return false;
    if (!matchesStringCriterion(plantSummary.type, filters.type)) return false;
    if (!matchesStringCriterion(plantSummary.cycle, filters.cycle)) return false;
    if (!matchesStringCriterion(plantSummary.careLevel, filters.careLevel)) return false;

    if (!plantMatchesHardinessRange(plantSummary, filters.hardinessZoneMin, filters.hardinessZoneMax)) {
        return false;
    }

    const petsSafe = plantSummary?.raw?.details?.toxicity?.pets === false;
    if (filters.petSafe && !petsSafe) return false;

    const medicinal = plantSummary?.raw?.details?.medicinal === true;
    if (filters.medicinal && !medicinal) return false;

    const lowMaintenance = includesValue(plantSummary.careLevel, "Low") || includesValue(plantSummary.watering, "Minimum");
    if (filters.lowMaintenance && !lowMaintenance) return false;

    const fastGrowth = includesValue(plantSummary?.raw?.details?.growth_rate, "High");
    if (filters.fastGrowth && !fastGrowth) return false;

    return true;
};

const scorePlantAgainstFilters = (plantSummary, filters, targetTypes = []) => {
    let score = 0;
    const reasons = [];

    if (filters.sunlight && matchesStringCriterion(plantSummary.sunlight, filters.sunlight)) {
        score += 16;
        reasons.push(`Fits ${filters.sunlight} light.`);
    }

    if (filters.soil && matchesStringCriterion(plantSummary.soil, filters.soil)) {
        score += 16;
        reasons.push(`Handles ${filters.soil.toLowerCase()} soil.`);
    }

    if (filters.watering && matchesStringCriterion(plantSummary.watering, filters.watering)) {
        score += 12;
        reasons.push(`Matches ${filters.watering.toLowerCase()} watering.`);
    }

    if (filters.careLevel && matchesStringCriterion(plantSummary.careLevel, filters.careLevel)) {
        score += 12;
        reasons.push(`Care level is ${filters.careLevel.toLowerCase()}.`);
    }

    if (filters.type && matchesStringCriterion(plantSummary.type, filters.type)) {
        score += 14;
        reasons.push(`It is a ${filters.type}.`);
    }

    if (filters.cycle && matchesStringCriterion(plantSummary.cycle, filters.cycle)) {
        score += 10;
        reasons.push(`Its cycle matches ${filters.cycle.toLowerCase()}.`);
    }

    if (plantMatchesHardinessRange(plantSummary, filters.hardinessZoneMin, filters.hardinessZoneMax)) {
        if (filters.hardinessZoneMin || filters.hardinessZoneMax) {
            score += 18;
            reasons.push("Its hardiness range overlaps the requested zone.");
        }
    }

    if (filters.petSafe && plantSummary?.raw?.details?.toxicity?.pets === false) {
        score += 16;
        reasons.push("Marked as pet safe.");
    }

    if (filters.medicinal && plantSummary?.raw?.details?.medicinal === true) {
        score += 10;
        reasons.push("Has medicinal use.");
    }

    if (filters.lowMaintenance && (includesValue(plantSummary.careLevel, "Low") || includesValue(plantSummary.watering, "Minimum"))) {
        score += 10;
        reasons.push("Leans low maintenance.");
    }

    if (filters.fastGrowth && includesValue(plantSummary?.raw?.details?.growth_rate, "High")) {
        score += 8;
        reasons.push("Fast growth matches your request.");
    }

    if (targetTypes.length && targetTypes.includes(normalizeTypeValue(plantSummary.type))) {
        score += 10;
    }

    return { score, reasons };
};

const getStylePreferredTypes = (style) => STYLE_TYPE_PREFERENCES[style] || [];

const normalizeFilterRequest = (input = {}, message = "") => {
    const messageRange = parseHardinessRangeFromMessage(message);

    return {
        sunlight: normalizeSunlightValue(input.sunlight),
        watering: normalizeWateringValue(input.watering),
        careLevel: normalizeCareLevelValue(input.careLevel || input.care_level),
        hardinessZone: normalizeZoneNumber(input.hardinessZone || input.hardiness_zone),
        hardinessZoneMin: normalizeZoneNumber(input.hardinessZoneMin || input.hardiness_zone_min) || messageRange.min,
        hardinessZoneMax: normalizeZoneNumber(input.hardinessZoneMax || input.hardiness_zone_max) || messageRange.max,
        soil: normalizeSoilValue(input.soil),
        type: normalizeTypeValue(input.type),
        cycle: normalizeCycleValue(input.cycle),
        lowMaintenance: normalizeBoolean(input.lowMaintenance || input.low_maintenance),
        fastGrowth: normalizeBoolean(input.fastGrowth || input.fast_growth),
        petSafe: normalizeBoolean(input.petSafe || input.pet_safe),
        medicinal: normalizeBoolean(input.medicinal),
    };
};

const normalizePlannerRequest = (input = {}, message = "") => {
    const style =
        normalizeEnumValue(input.style || input.gardenStyle, PLANNER_STYLE_VALUES, STYLE_ALIASES) ||
        normalizeEnumValue(message, PLANNER_STYLE_VALUES, STYLE_ALIASES) ||
        DEFAULT_DESIGN_BRIEF.style;
    const styleDefaults = STYLE_DESIGN_DEFAULTS[style] || {};

    return {
        style,
        spaceType:
            normalizeEnumValue(input.spaceType || input.space_type, SPACE_TYPE_VALUES, SPACE_TYPE_ALIASES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.spaceType) ||
            DEFAULT_DESIGN_BRIEF.spaceType,
        mood:
            normalizeEnumValue(input.mood, MOOD_VALUES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.mood) ||
            styleDefaults.mood ||
            DEFAULT_DESIGN_BRIEF.mood,
        maintenanceLevel:
            normalizeEnumValue(input.maintenanceLevel || input.maintenance_level, MAINTENANCE_VALUES, MAINTENANCE_ALIASES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.maintenanceLevel) ||
            DEFAULT_DESIGN_BRIEF.maintenanceLevel,
        hardscape:
            normalizeEnumValue(input.hardscape, HARDSCAPE_VALUES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.hardscape) ||
            styleDefaults.hardscape ||
            DEFAULT_DESIGN_BRIEF.hardscape,
        density:
            normalizeEnumValue(input.density, DENSITY_VALUES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.density) ||
            styleDefaults.density ||
            DEFAULT_DESIGN_BRIEF.density,
        realismLevel:
            normalizeEnumValue(input.realismLevel || input.realism_level, REALISM_VALUES, REALISM_ALIASES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.realismLevel) ||
            DEFAULT_DESIGN_BRIEF.realismLevel,
        budgetLevel:
            normalizeEnumValue(input.budgetLevel || input.budget_level, BUDGET_VALUES, BUDGET_ALIASES) ||
            inferPlannerFieldFromMessage(message, PLANNER_MESSAGE_HINTS.budgetLevel) ||
            DEFAULT_DESIGN_BRIEF.budgetLevel,
        extraDirections: normalizeText(input.extraDirections || input.extra_directions),
        variationCount: Math.min(3, Math.max(1, Number.parseInt(String(input.variationCount || input.variation_count || 1), 10) || 1)),
    };
};

const normalizeRecommenderRequest = (input = {}, message = "") => {
    const filters = normalizeFilterRequest(input, message);
    const exactZone = filters.hardinessZone || (
        filters.hardinessZoneMin && filters.hardinessZoneMax
            ? Math.round((filters.hardinessZoneMin + filters.hardinessZoneMax) / 2)
            : filters.hardinessZoneMin || filters.hardinessZoneMax || null
    );

    return {
        sunlight: filters.sunlight,
        watering: filters.watering,
        care_level: filters.careLevel,
        hardiness_zone: exactZone,
        soil: filters.soil,
        type: filters.type,
        cycle: filters.cycle,
        low_maintenance: filters.lowMaintenance,
        fast_growth: filters.fastGrowth,
        pet_safe: filters.petSafe,
        medicinal: filters.medicinal,
    };
};

const normalizeSavedGardenReviewRequest = (input = {}, message = "") => ({
    focus: normalizeText(input.focus) || (message.toLowerCase().includes("maintenance") ? "maintenance" : "general"),
    preferredStyle: normalizeEnumValue(input.preferredStyle || input.preferred_style, PLANNER_STYLE_VALUES, STYLE_ALIASES) || normalizeEnumValue(message, PLANNER_STYLE_VALUES, STYLE_ALIASES),
    maintenanceLevel: normalizeEnumValue(input.maintenanceLevel || input.maintenance_level, MAINTENANCE_VALUES, MAINTENANCE_ALIASES),
});

const normalizeCombinationRequest = (input = {}, message = "") => ({
    ...normalizeFilterRequest(input, message),
    style: normalizeEnumValue(input.style, PLANNER_STYLE_VALUES, STYLE_ALIASES) || normalizeEnumValue(message, PLANNER_STYLE_VALUES, STYLE_ALIASES),
    maintenanceLevel: normalizeEnumValue(input.maintenanceLevel || input.maintenance_level, MAINTENANCE_VALUES, MAINTENANCE_ALIASES),
});

const hasActiveFilterRequest = (filters) =>
    Boolean(
        filters.sunlight ||
            filters.watering ||
            filters.careLevel ||
            filters.hardinessZone ||
            filters.hardinessZoneMin ||
            filters.hardinessZoneMax ||
            filters.soil ||
            filters.type ||
            filters.cycle ||
            filters.lowMaintenance ||
            filters.fastGrowth ||
            filters.petSafe ||
            filters.medicinal
    );

const buildFilterBadges = (filters = {}) => {
    const badges = [];
    if (filters.sunlight) badges.push(filters.sunlight);
    if (filters.soil) badges.push(filters.soil);
    if (filters.watering) badges.push(filters.watering);
    if (filters.careLevel) badges.push(`${filters.careLevel} care`);
    if (filters.type) badges.push(titleCase(filters.type));
    if (filters.cycle) badges.push(filters.cycle);
    if (filters.petSafe) badges.push("Pet Safe");
    if (filters.lowMaintenance) badges.push("Low Maintenance");
    if (filters.fastGrowth) badges.push("Fast Growth");
    if (filters.hardinessZoneMin || filters.hardinessZoneMax) {
        const min = filters.hardinessZoneMin || filters.hardinessZoneMax;
        const max = filters.hardinessZoneMax || filters.hardinessZoneMin;
        badges.push(min === max ? `Zone ${min}` : `Zone ${min}-${max}`);
    }
    return badges;
};

export const runPlantFilterTool = async ({ filterRequest = {}, context, message = "" }) => {
    const filters = normalizeFilterRequest(filterRequest, message);

    if (!hasActiveFilterRequest(filters)) {
        return {
            action: null,
            resultCards: [],
            toolSummary: {
                headline: "No strict plant filter was extracted yet.",
                badges: [],
            },
        };
    }

    const query = buildPlantQuery(filters);
    const rawPlants = await Plant.find(query).limit(120).lean();
    const candidates = rawPlants.map((plant) => {
        const summary = summarizeRawPlant(plant);
        summary.raw = plant;
        return summary;
    });

    const strictMatches = candidates.filter((candidate) => matchesPlantFilterStrictly(candidate, filters));
    const rankedPool = strictMatches.length ? strictMatches : candidates;

    const ranked = rankedPool
        .map((candidate) => {
            const scoring = scorePlantAgainstFilters(candidate, filters);
            return {
                candidate,
                score: scoring.score,
                reasons: scoring.reasons,
            };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 6);

    return {
        action: null,
        resultCards: ranked.map(({ candidate, reasons }) =>
            buildPlantCard(candidate, {
                badges: buildFilterBadges(filters),
                note: strictMatches.length
                    ? "Matches the current chat filter closely."
                    : "Closest match found from the current database.",
                rationale: reasons.slice(0, 2).join(" "),
            })
        ),
        toolSummary: {
            headline: strictMatches.length
                ? `I found ${strictMatches.length} close plant matches in the database.`
                : "I could not find exact matches, so I ranked the closest plants instead.",
            badges: buildFilterBadges(filters),
        },
    };
};

export const buildRecommenderActionTool = ({ recommenderRequest = {}, context, message = "" }) => {
    const payload = normalizeRecommenderRequest(recommenderRequest, message);
    const requestBody = {
        ...payload,
        limit: 18,
    };

    if (context?.userProfile?.location) {
        requestBody.viewer_location = context.userProfile.location;
    }

    Object.keys(requestBody).forEach((key) => {
        if (requestBody[key] === "" || requestBody[key] === false || requestBody[key] === null || requestBody[key] === undefined) {
            delete requestBody[key];
        }
    });

    return {
        action: {
            type: "runRecommender",
            title: "Build a recommender shortlist",
            description: "Use the existing SoilSync recommender with the constraints extracted from your message.",
            requiresConfirmation: false,
            autoExecute: true,
            payload: {
                endpoint: "/api/recommender/xgb",
                requestBody,
            },
            previewBadges: buildFilterBadges(normalizeFilterRequest(recommenderRequest, message)),
        },
        resultCards: [],
        toolSummary: {
            headline: "I can run the existing recommender with these constraints.",
            badges: buildFilterBadges(normalizeFilterRequest(recommenderRequest, message)),
        },
    };
};

export const buildPlannerActionTool = ({
    plannerRequest = {},
    context,
    message = "",
    uploadedGardenPhotoMeta = null,
}) => {
    const designPreferences = normalizePlannerRequest(plannerRequest, message);
    const explicitPlannerPlants = (context?.selectedPlants || []).slice(0, PLANNER_ACTION_PLANT_LIMIT);
    const fallbackPlannerPlants = explicitPlannerPlants.length
        ? []
        : [...(context?.messageMatchedPlants || []), ...(context?.favouritePlants || [])].slice(0, PLANNER_ACTION_PLANT_LIMIT);
    const plannerPlants = explicitPlannerPlants.length ? explicitPlannerPlants : fallbackPlannerPlants;
    const selectedPlantIds = uniqueNumbers(plannerPlants.map((plant) => plant.id)).slice(0, PLANNER_ACTION_PLANT_LIMIT);
    const plannerPlantIdSet = new Set(selectedPlantIds);
    const suggestedPlants = explicitPlannerPlants.length
        ? [...(context?.messageMatchedPlants || []), ...(context?.favouritePlants || [])]
              .filter((plant) => !plannerPlantIdSet.has(Number(plant.id)))
              .slice(0, PLANNER_ACTION_PLANT_LIMIT)
        : [];

    if (!selectedPlantIds.length) {
        return {
            action: null,
            resultCards: [],
            toolSummary: {
                headline: "I need at least one selected or clearly mentioned plant before I can build a planner action.",
                badges: [],
            },
        };
    }

    return {
        action: {
            type: "generatePlannerImage",
            title: `Generate a ${STYLE_LABELS[designPreferences.style] || "garden"} concept`,
            description: uploadedGardenPhotoMeta
                ? "This will edit your uploaded garden photo with the selected context plants and planner direction."
                : "This will call the existing planner and image-generation flow with your selected context plants.",
            requiresConfirmation: true,
            autoExecute: false,
            confirmLabel: "Generate concept",
            hasReferenceGardenPhoto: Boolean(uploadedGardenPhotoMeta),
            payload: {
                endpoint: "/api/generate-photorealistic-garden",
                requestBody: {
                    selectedPlantIds,
                    gardenStyle: designPreferences.style,
                    designPreferences,
                    variationCount: designPreferences.variationCount,
                },
            },
            previewBadges: [
                STYLE_LABELS[designPreferences.style] || "Planner",
                titleCase(designPreferences.maintenanceLevel),
                titleCase(designPreferences.realismLevel.replaceAll("_", " ")),
                ...(uploadedGardenPhotoMeta ? ["Photo Edit"] : []),
            ],
            selectedPlantNames: plannerPlants.map((plant) => plant.commonName || plant.scientificName).filter(Boolean),
            suggestedPlantNames: suggestedPlants.map((plant) => plant.commonName || plant.scientificName).filter(Boolean),
            referenceGardenPhotoName: uploadedGardenPhotoMeta?.fileName || "",
        },
        resultCards: [
            ...plannerPlants.map((plant) =>
                buildPlantCard(plant, {
                    badges: ["Planner context"],
                    note: "Will be sent to the planner as explicit plant context.",
                    isSuggested: false,
                })
            ),
            ...suggestedPlants.map((plant) =>
                buildPlantCard(plant, {
                    badges: ["Suggested addition"],
                    note:
                        "Suggested because it matches the garden direction and your prompt. It will not be sent to the planner unless you add it to context.",
                    rationale:
                        designPreferences.style === "japanese_zen"
                            ? "Suggested because Japanese maples and similar structured plants often fit a Japanese zen direction."
                            : "Suggested because it aligns with the style cues in your message.",
                    isSuggested: true,
                })
            ),
        ],
        toolSummary: {
            headline: uploadedGardenPhotoMeta
                ? "I am ready to edit your uploaded garden photo with these plants."
                : "I am ready to hand these plants to the planner.",
            badges: [STYLE_LABELS[designPreferences.style] || "Planner"],
        },
    };
};

export const reviewSavedGardensTool = ({ reviewRequest = {}, context, message = "" }) => {
    const request = normalizeSavedGardenReviewRequest(reviewRequest, message);
    const gardens = Array.isArray(context?.savedGardens) ? context.savedGardens : [];
    const selectedNames = new Set(
        [...(context?.selectedPlants || []), ...(context?.messageMatchedPlants || [])]
            .map((plant) => normalizeText(plant.commonName || plant.scientificName).toLowerCase())
            .filter(Boolean)
    );

    if (!gardens.length) {
        return {
            action: null,
            resultCards: [],
            toolSummary: {
                headline: "There are no saved gardens to review yet.",
                badges: [],
            },
        };
    }

    const ranked = gardens
        .map((garden) => {
            let score = 50;
            const reasons = [];

            if (request.preferredStyle && normalizeText(garden.gardenStyle) === request.preferredStyle) {
                score += 22;
                reasons.push(`Style already matches ${STYLE_LABELS[request.preferredStyle] || request.preferredStyle}.`);
            }

            if (request.maintenanceLevel === "low") {
                if (garden.plantCount <= 4) {
                    score += 16;
                    reasons.push("Smaller plant palette leans lower maintenance.");
                } else if (garden.plantCount <= 7) {
                    score += 8;
                    reasons.push("Plant count still looks manageable.");
                } else {
                    score -= 6;
                    reasons.push("Denser palette may be higher effort to maintain.");
                }
            }

            const overlapCount = (garden.plants || []).filter((plant) =>
                selectedNames.has(normalizeText(plant.commonName || plant.scientificName).toLowerCase())
            ).length;

            if (overlapCount > 0) {
                score += 8 + overlapCount * 2;
                reasons.push(`Includes ${overlapCount} plant(s) from your current premium context.`);
            }

            if (request.focus === "romania_fit" && context?.userProfile?.location) {
                score += 6;
                reasons.push(`Reviewed with ${context.userProfile.location} in mind.`);
            }

            if (!reasons.length) {
                reasons.push("Good baseline candidate for further refinement.");
            }

            const scoreLabel = score >= 76 ? "Best fit" : score >= 62 ? "Strong candidate" : "Needs refinement";

            return {
                garden,
                score,
                scoreLabel,
                reasons,
            };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 5);

    return {
        action: null,
        resultCards: ranked.map(({ garden, score, scoreLabel, reasons }) =>
            buildSavedGardenCard(garden, {
                score,
                scoreLabel,
                reasons,
                note: reasons[0],
            })
        ),
        toolSummary: {
            headline: "I ranked your saved gardens against the current request.",
            badges: [request.preferredStyle ? STYLE_LABELS[request.preferredStyle] : "", request.maintenanceLevel ? `${titleCase(request.maintenanceLevel)} maintenance` : ""].filter(Boolean),
        },
    };
};

export const runPlantCombinationTool = async ({ combinationRequest = {}, context, message = "" }) => {
    const request = normalizeCombinationRequest(combinationRequest, message);
    const basePlants = [...(context?.selectedPlants || []), ...(context?.messageMatchedPlants || []), ...(context?.favouritePlants || [])].slice(0, 4);

    if (!basePlants.length) {
        return {
            action: null,
            resultCards: [],
            toolSummary: {
                headline: "Select or mention at least one plant first, and I can suggest compatible companions.",
                badges: [],
            },
        };
    }

    const basePlantIds = uniqueNumbers(basePlants.map((plant) => plant.id));
    const targetTypes = request.type ? [request.type] : getStylePreferredTypes(request.style);
    const query = buildPlantQuery({
        ...request,
        type: targetTypes[0] || request.type,
    });

    const rawPlants = await Plant.find({
        ...query,
        id: { $nin: basePlantIds },
    })
        .limit(120)
        .lean();

    const candidates = rawPlants.map((plant) => {
        const summary = summarizeRawPlant(plant);
        summary.raw = plant;
        return summary;
    });

    const ranked = candidates
        .map((candidate) => {
            const scoring = scorePlantAgainstFilters(candidate, request, targetTypes);
            const overlappingSunlight = basePlants.some((plant) => listIncludesValue(candidate.sunlight, plant.sunlight?.[0] || ""));
            const overlappingSoil = basePlants.some((plant) => listIncludesValue(candidate.soil, plant.soil?.[0] || ""));

            let score = scoring.score;
            const reasons = [...scoring.reasons];

            if (overlappingSunlight) {
                score += 10;
                reasons.push("Shares a similar light profile with your selected plants.");
            }

            if (overlappingSoil) {
                score += 8;
                reasons.push("Looks compatible with the same soil conditions.");
            }

            return { candidate, score, reasons };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, 6);

    return {
        action: null,
        resultCards: ranked.map(({ candidate, reasons }) =>
            buildPlantCard(candidate, {
                badges: [request.style ? STYLE_LABELS[request.style] : "Combination", ...buildFilterBadges(request)].filter(Boolean),
                note: "Suggested as a companion plant for the current context.",
                rationale: reasons.slice(0, 2).join(" "),
            })
        ),
        toolSummary: {
            headline: `I suggested companion plants for ${basePlants.map((plant) => plant.commonName || plant.scientificName).join(", ")}.`,
            badges: [request.style ? STYLE_LABELS[request.style] : "", request.maintenanceLevel ? `${titleCase(request.maintenanceLevel)} maintenance` : ""].filter(Boolean),
        },
    };
};
