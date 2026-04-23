import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import PlantEppoLink from "./models/PlantEppoLink.js";
import EppoPlantPestRelation from "./models/EppoPlantPestRelation.js";
import EppoTaxon from "./models/EppoTaxon.js";
import EppoDistribution from "./models/EppoDistribution.js";
import { buildPestRiskForPlantCode, enrichRecommendationResultsWithPestRisk } from "./utils/pestRisk.js";
import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { GoogleGenAI, Modality, createPartFromBase64 } from "@google/genai";

// --- ÚJ IMPORTOK ---
import authRoutes from "./routes/authRoutes.js";
import { authenticateToken, requireAdmin, requireSuperAdmin } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();

app.use(cors());

// --- FONTOS: A JSON parsernek a Route-ok előtt kell lennie! ---
app.use(express.json({ limit: '25mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '25mb' }));

// Auth útvonalak bekötése
app.use("/", authRoutes);

mongoose
    .connect("mongodb://127.0.0.1:27017/soilsync")
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

const perenualPlantSchema = new mongoose.Schema({}, { strict: false });
const PerenualPlant = mongoose.model(
    "PerenualPlant",
    perenualPlantSchema,
    "Perenual_Plants"
);

const normalizeOptionValue = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
};

const splitCommaSeparatedValues = (value) =>
    String(value || "")
        .split(",")
        .map((entry) => normalizeOptionValue(entry))
        .filter(Boolean);

const escapeRegexLiteral = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildStoredPlantImage = (source) => {
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

const regionNameFormatter =
    typeof Intl?.DisplayNames === "function"
        ? new Intl.DisplayNames(["en"], { type: "region" })
        : null;

const resolveCountryName = (countryCode) => {
    const normalizedCode = String(countryCode || "").trim().toUpperCase();
    if (!normalizedCode) return null;

    try {
        return regionNameFormatter?.of(normalizedCode) || null;
    } catch {
        return null;
    }
};

const collectDistinctValues = (plants, extractor, { sort = true } = {}) => {
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

const canonicalizeSunlight = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("full sun")) return "full sun";
    if (text.includes("part shade") || text.includes("part sun") || text.includes("filtered")) return "part shade";
    if (text.includes("full shade") || text === "shade" || text.includes("partial shade")) return "full shade";
    return null;
};

const canonicalizeWatering = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("frequent")) return "Frequent";
    if (text.includes("minimum") || text.includes("low")) return "Minimum";
    if (text.includes("average") || text.includes("medium") || text.includes("regular")) return "Average";
    return null;
};

const canonicalizeCareLevel = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("low")) return "Low";
    if (text.includes("medium")) return "Medium";
    if (text.includes("high")) return "High";
    return null;
};

const canonicalizeSoil = (value) => {
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

const canonicalizeType = (value) => {
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

const buildTypeFilterCondition = (value) => {
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

const buildCycleFilterCondition = (value) => {
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

const canonicalizeCycle = (value) => {
    const text = normalizeOptionValue(value)?.toLowerCase();
    if (!text) return null;
    if (text.includes("annual")) return "Annual";
    if (text.includes("biennial")) return "Biennial";
    if (text.includes("perennial")) return "Perennial";
    return null;
};

const GARDEN_STYLE_PROFILES = {
    flowering_cottage: {
        label: "Flowering Cottage",
        summary: "romantic layered borders, abundant seasonal blooms, and relaxed home-garden charm",
        composition: "Use curving beds, mixed heights, soft edges, and colorful flowering drifts.",
    },
    stone_gravel: {
        label: "Stone & Gravel",
        summary: "architectural planting with gravel, stone accents, and a dry-garden feel",
        composition: "Show gravel or stone surfaces, restrained planting masses, and tactile hardscape transitions.",
    },
    modern_minimal: {
        label: "Modern Minimal",
        summary: "clean lines, restrained palette, structured planting, and contemporary styling",
        composition: "Keep the layout crisp, uncluttered, and balanced with strong geometry.",
    },
    mediterranean: {
        label: "Mediterranean",
        summary: "sunny, elegant, drought-aware planting with stone and warm outdoor materials",
        composition: "Use warm-toned stone, airy planting, and a bright, sun-washed atmosphere.",
    },
    japanese_zen: {
        label: "Japanese Zen",
        summary: "calm, sculpted composition with stone, texture contrast, and peaceful restraint",
        composition: "Focus on negative space, clipped forms, textural foliage, and meditative balance.",
    },
    wildlife_native: {
        label: "Wildlife Friendly",
        summary: "naturalistic planting that feels alive, pollinator-friendly, and low-fuss",
        composition: "Keep it believable and biodiverse with informal drifts, habitat-friendly planting, and soft transitions.",
    },
    edible_kitchen: {
        label: "Edible Kitchen",
        summary: "productive but beautiful home gardening with herbs, useful beds, and practical layout",
        composition: "Show neat, usable beds and paths with a productive home-garden rhythm.",
    },
    formal_ornamental: {
        label: "Formal Ornamental",
        summary: "decorative showcase planting with symmetry, neat edges, and polished structure",
        composition: "Use symmetry, deliberate repetition, and refined ornamental presentation.",
    },
    tropical_lush: {
        label: "Tropical Lush",
        summary: "dense, dramatic foliage with immersive greenery and a resort-like mood",
        composition: "Keep the planting rich and layered with immersive foliage massing.",
    },
};

const GARDEN_SPACE_PROFILES = {
    outdoor_home: {
        label: "Outdoor Home Garden",
        scene: "a residential outdoor garden beside a home",
        composition: "Include believable planting beds, circulation space, and a lived-in home-garden scale.",
    },
    front_yard: {
        label: "Front Yard",
        scene: "a polished front-yard garden for a home entrance",
        composition: "Keep curb appeal high with visible structure, access, and a welcoming composition.",
    },
    backyard: {
        label: "Backyard",
        scene: "a realistic backyard garden retreat",
        composition: "Balance planting with usable open space for a private home garden.",
    },
    courtyard: {
        label: "Courtyard",
        scene: "a contained courtyard garden",
        composition: "Use enclosure, layering, and intimate scale with well-defined edges.",
    },
    patio_terrace: {
        label: "Patio / Terrace",
        scene: "a planted patio or terrace garden",
        composition: "Use planters, bed edges, and hardscape integration suitable for a terrace-like space.",
    },
    balcony: {
        label: "Balcony",
        scene: "a realistic planted balcony garden",
        composition: "Keep plant scale compact and container-friendly with believable balcony proportions.",
    },
    indoor_corner: {
        label: "Indoor Corner",
        scene: "an indoor plant-styled garden corner in a home",
        composition: "Treat it as a design-forward interior plant corner with believable indoor lighting and containers.",
    },
    indoor_sunroom: {
        label: "Indoor Sunroom",
        scene: "a lush indoor sunroom garden",
        composition: "Blend interior architecture with plant styling that suits a bright indoor room.",
    },
};

const GARDEN_MOOD_PROFILES = {
    calm: "peaceful, soft, uncluttered, and restorative",
    vibrant: "colorful, joyful, fresh, and energetic",
    cozy: "welcoming, intimate, layered, and warm",
    elegant: "refined, polished, and upscale",
    natural: "organic, relaxed, and grounded in nature",
};

const GARDEN_HARDSCAPE_PROFILES = {
    lawn: "green lawn with simple planting edges",
    gravel: "gravel-based hardscape and dry-garden textures",
    stone: "stone paving, stone edging, and tactile masonry surfaces",
    deck: "decking or terrace boards integrated with planters",
    mixed: "a balanced mix of lawn, paths, stone, and planting beds",
};

const GARDEN_DENSITY_PROFILES = {
    airy: "airy planting with visible space between groups",
    balanced: "balanced planting with readable structure and moderate fullness",
    lush: "lush, layered planting with a rich planted feel",
};

const GARDEN_MAINTENANCE_PROFILES = {
    low: "prioritize low-maintenance planting and restrained upkeep",
    medium: "allow moderate maintenance with a polished but realistic result",
    high: "allow higher-detail planting and ornamental intensity",
};

const GARDEN_REALISM_PROFILES = {
    easy_to_recreate: "favor normal residential layouts, standard materials, restrained complexity, and a result that an average homeowner could realistically recreate",
    balanced: "keep the design believable and residential, but allow a more polished and editorial composition",
    concept_only: "allow a more aspirational concept image, while still keeping proportions and materials physically plausible",
};

const GARDEN_BUDGET_PROFILES = {
    budget_friendly: "favor simpler hardscape, fewer plant varieties, younger specimen sizes, and affordable residential materials over luxury finishes",
    mid_range: "allow a more composed material palette and moderate planting richness without drifting into luxury-showcase territory",
    premium: "allow a higher-end residential finish and more mature planting, but avoid resort-scale extravagance or unrealistic wealth signals",
};

const DEFAULT_GARDEN_DESIGN = {
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

const getPrimaryScientificName = (plant) =>
    Array.isArray(plant?.scientific_name)
        ? String(plant.scientific_name[0] || "").trim()
        : String(plant?.scientific_name || "").trim();

const getPlantRecordId = (plant) => {
    const rawValue = plant?._doc?.id ?? plant?.id;
    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? null : numericValue;
};

const getPlantDisplayName = (plant) =>
    String(plant?.common_name || getPrimaryScientificName(plant) || `Plant #${getPlantRecordId(plant) || "?"}`).trim();

const normalizeGardenDesignPreferences = (input = {}) => {
    const design = {
        ...DEFAULT_GARDEN_DESIGN,
        ...(input && typeof input === "object" ? input : {}),
    };

    if (!GARDEN_SPACE_PROFILES[design.spaceType]) design.spaceType = DEFAULT_GARDEN_DESIGN.spaceType;
    if (!GARDEN_STYLE_PROFILES[design.style]) design.style = DEFAULT_GARDEN_DESIGN.style;
    if (!GARDEN_MOOD_PROFILES[design.mood]) design.mood = DEFAULT_GARDEN_DESIGN.mood;
    if (!GARDEN_MAINTENANCE_PROFILES[design.maintenanceLevel]) design.maintenanceLevel = DEFAULT_GARDEN_DESIGN.maintenanceLevel;
    if (!GARDEN_HARDSCAPE_PROFILES[design.hardscape]) design.hardscape = DEFAULT_GARDEN_DESIGN.hardscape;
    if (!GARDEN_DENSITY_PROFILES[design.density]) design.density = DEFAULT_GARDEN_DESIGN.density;
    if (!GARDEN_REALISM_PROFILES[design.realismLevel]) design.realismLevel = DEFAULT_GARDEN_DESIGN.realismLevel;
    if (!GARDEN_BUDGET_PROFILES[design.budgetLevel]) design.budgetLevel = DEFAULT_GARDEN_DESIGN.budgetLevel;

    design.extraDirections =
        typeof design.extraDirections === "string"
            ? design.extraDirections.replace(/\s+/g, " ").trim().slice(0, 220)
            : DEFAULT_GARDEN_DESIGN.extraDirections;

    return design;
};

const COMPACT_SPACE_TYPES = new Set(["balcony", "patio_terrace", "indoor_corner", "indoor_sunroom", "courtyard"]);

const getSpaceConstraintGuidance = (spaceType) => {
    switch (spaceType) {
        case "balcony":
            return "This is a real balcony. Keep everything compact, container-grown, and balcony-safe. No full-size trees or deep in-ground planting.";
        case "patio_terrace":
            return "This is a patio or terrace. Prefer planters, raised containers, restrained root zones, and hardscape-integrated planting.";
        case "indoor_corner":
            return "This is an indoor corner. All plants must read as indoor-kept specimens in containers, with believable interior scale and no outdoor garden bed illusion.";
        case "indoor_sunroom":
            return "This is an indoor sunroom. Treat all plants as container-grown or conservatory-kept specimens with indoor architecture still dominant.";
        case "courtyard":
            return "This is a contained courtyard. Use intimate scale, restrained spread, and enclosed planting that respects the limited footprint.";
        case "front_yard":
            return "This is a front yard. Keep access and curb appeal clear, but the selected plants must still be visibly represented.";
        case "backyard":
            return "This is a backyard. Ground planting is allowed, but keep it residential and not estate-scale.";
        default:
            return "Keep the scene residential, believable, and sized for a normal home garden.";
    }
};

const getPlantRecognitionCue = (plant) => {
    const details = plant?.details || {};
    const haystack = [
        getPlantDisplayName(plant),
        getPrimaryScientificName(plant),
        details?.type,
        plant?.genus,
        plant?.family,
    ]
        .map((value) => normalizeOptionValue(value)?.toLowerCase())
        .filter(Boolean)
        .join(" ");

    if (!haystack) return null;
    if (/(pepper|capsicum|chili|cayenne)/.test(haystack)) return "show visible pepper fruits on the plant";
    if (/(banana|ensete|musa)/.test(haystack)) return "show unmistakable large banana-style foliage and keep the leaf form readable";
    if (/(tomato|solanum lycopersicum)/.test(haystack)) return "show visible tomato fruits or blossoms";
    if (/(apple|malus)/.test(haystack)) return "show a small apple tree form, ideally with visible apples if seasonally plausible";
    if (/(citrus|lemon|lime|orange|mandarin)/.test(haystack)) return "show a citrus-like canopy with visible fruit if seasonally plausible";
    if (/(tulip|tulipa)/.test(haystack)) return "show readable tulip flowers with the classic cup-shaped bloom";
    if (/(lavender|lavandula)/.test(haystack)) return "show lavender flower spikes and silvery foliage";
    if (/(rose|rosa)/.test(haystack)) return "show recognizable rose blooms or buds";
    if (/(sunflower|helianthus)/.test(haystack)) return "show clear sunflower heads";
    if (/(grape|vitis)/.test(haystack)) return "show a vine-trained grape habit rather than a generic shrub";
    if (/(palm)/.test(haystack)) return "show readable palm fronds";
    if (/(fern)/.test(haystack)) return "show distinct fern fronds";
    if (/(grass|miscanthus|pennisetum|carex|festuca)/.test(haystack)) return "show the fine arching grass habit clearly";
    return null;
};

const getPlantSpaceAdaptationHint = (plant, spaceType) => {
    const details = plant?.details || {};
    const haystack = [
        getPlantDisplayName(plant),
        getPrimaryScientificName(plant),
        details?.type,
        details?.cycle,
        plant?.genus,
    ]
        .map((value) => normalizeOptionValue(value)?.toLowerCase())
        .filter(Boolean)
        .join(" ");

    const compactSpace = COMPACT_SPACE_TYPES.has(spaceType);
    if (!compactSpace) return "show it in a realistic residential garden scale";

    if (/(tree|malus|citrus|banana|ensete|musa|palm|large shrub|bamboo)/.test(haystack)) {
        return "adapt it as a compact, container-grown, dwarf, pruned, espaliered, or juvenile specimen that still clearly reads as the same species";
    }

    if (/(vine|climber|grape|vitis)/.test(haystack)) {
        return "adapt it to a trellis, railing, or controlled vertical support that suits the limited space";
    }

    if (/(pepper|capsicum|tomato|herb|basil|mint|edible)/.test(haystack)) {
        return "show it as a productive container or raised-planter specimen with readable edible cues";
    }

    return "show it as a compact container-friendly planting that fits the limited space without losing species identity";
};

const buildPlantPromptLine = (plant, spaceType = DEFAULT_GARDEN_DESIGN.spaceType) => {
    const commonName = getPlantDisplayName(plant);
    const scientificName = getPrimaryScientificName(plant);
    const details = plant?.details || {};
    const sunlight = Array.isArray(details.sunlight)
        ? details.sunlight.map((item) => normalizeOptionValue(item)).filter(Boolean).slice(0, 2)
        : [];
    const hardiness = details.hardiness || {};
    const traits = [
        normalizeOptionValue(details.type),
        normalizeOptionValue(details.cycle),
        normalizeOptionValue(details.watering) ? `${normalizeOptionValue(details.watering)} watering` : null,
        sunlight.length ? `${sunlight.join(" / ")} light` : null,
        hardiness?.min || hardiness?.max
            ? `hardiness ${hardiness.min || "?"}-${hardiness.max || hardiness.min || "?"}`
            : null,
        getPlantRecognitionCue(plant),
        getPlantSpaceAdaptationHint(plant, spaceType),
    ].filter(Boolean);

    const label =
        scientificName && scientificName !== commonName ? `${commonName} (${scientificName})` : commonName;

    return `- ${label}: ${traits.join(", ") || "garden plant"}`;
};

const getPlantImageCandidates = (plant) => {
    const image = plant?.default_image || {};

    return [
        image.original_url,
        image.regular_url,
        image.medium_url,
        image.small_url,
        image.thumbnail,
    ]
        .map((value) => normalizeOptionValue(value))
        .filter((value, index, array) => value && /^https?:\/\//i.test(value) && array.indexOf(value) === index);
};

const buildPlantReferenceLabel = (plant) => {
    const commonName = getPlantDisplayName(plant);
    const scientificName = getPrimaryScientificName(plant);
    return scientificName && scientificName !== commonName ? `${commonName} (${scientificName})` : commonName;
};

const fetchReferenceImagePart = async (imageUrl) => {
    const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxContentLength: 8 * 1024 * 1024,
        headers: {
            Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
    });

    const mimeType = response.headers["content-type"] || "image/jpeg";
    const base64 = Buffer.from(response.data).toString("base64");
    return createPartFromBase64(base64, mimeType);
};

const buildPlantOnlyPromptVariants = ({
    plants,
    hasPlantReferenceImages = false,
    hasReferencePhoto = false,
    gardenStyle = DEFAULT_GARDEN_DESIGN.style,
}) => {
    const plantLines = plants.map((plant) => `- ${buildPlantReferenceLabel(plant)}`).join("\n");
    const plantNames = plants.map((plant) => getPlantDisplayName(plant)).filter(Boolean).join(", ");
    const styleKey = GARDEN_STYLE_PROFILES[gardenStyle] ? gardenStyle : DEFAULT_GARDEN_DESIGN.style;
    const styleProfile = GARDEN_STYLE_PROFILES[styleKey];
    const referenceLine = hasPlantReferenceImages
        ? "Reference plant photos are attached. Use them to understand what the selected plants look like."
        : "No reference plant photos are attached, so rely on the selected plant names.";
    const sceneInstruction = hasReferencePhoto
        ? `Edit the uploaded garden photo and place these selected plants naturally into that exact real scene.

Preserve the camera angle, architecture, paving, walls, fences, and overall layout.
Only change the planting so the selected plants fit naturally into the existing garden.

Use a ${styleProfile.label.toLowerCase()} direction: ${styleProfile.summary}. ${styleProfile.composition}`
        : `Create a realistic and beautiful ${styleProfile.label.toLowerCase()} home garden scene that uses these plants throughout the composition.

Style direction: ${styleProfile.summary}. ${styleProfile.composition}`;

    return [
        `Create one high-quality photorealistic garden image using these selected plants:

${plantLines}

${referenceLine}

${sceneInstruction}

Output one photorealistic image only.`,
        hasReferencePhoto
            ? `Edit the uploaded garden photo using ${plantNames} in a ${styleProfile.label.toLowerCase()} style. Preserve the real scene and place the selected plants into it naturally.`
            : `Create a photorealistic ${styleProfile.label.toLowerCase()} garden featuring ${plantNames}. Use the attached plant reference photos if available and output one image only.`,
    ];
};

const buildGardenPrompt = ({
    plants,
    design,
    hasReferencePhoto = false,
    hasPlantReferenceImages = false,
}) => {
    const styleProfile = GARDEN_STYLE_PROFILES[design.style];
    const spaceProfile = GARDEN_SPACE_PROFILES[design.spaceType];
    const moodProfile = GARDEN_MOOD_PROFILES[design.mood];
    const hardscapeProfile = GARDEN_HARDSCAPE_PROFILES[design.hardscape];
    const densityProfile = GARDEN_DENSITY_PROFILES[design.density];
    const maintenanceProfile = GARDEN_MAINTENANCE_PROFILES[design.maintenanceLevel];
    const realismProfile = GARDEN_REALISM_PROFILES[design.realismLevel];
    const budgetProfile = GARDEN_BUDGET_PROFILES[design.budgetLevel];
    const plantList = plants.map((plant) => buildPlantPromptLine(plant, design.spaceType)).join("\n");
    const spaceConstraintGuidance = getSpaceConstraintGuidance(design.spaceType);
    const extraDirectionsBlock = design.extraDirections
        ? `Additional user directions:
- ${design.extraDirections}

Treat these as preference hints only when they stay compatible with the selected plants, selected style, realistic home-garden scale, realism target, and budget target.`
        : `Additional user directions:
- none`;

    const editingBlock = hasReferencePhoto
        ? `You are editing the provided real garden photo. Preserve the original camera angle, architecture, fence lines, paving, walls, and lighting direction. Only redesign the planting beds, borders, pots, and soft landscaping. Integrate the selected plants naturally into the existing scene with correct scale, perspective, overlap, shadows, and depth.`
        : `Create a brand-new but believable home-garden scene from scratch. Keep the layout achievable for a real homeowner, with clear planting beds, realistic spacing, and coherent paths or material transitions.`;

    const plantReferenceBlock = hasPlantReferenceImages
        ? `Reference photos are also provided for some selected plants. Match the visible foliage shape, fruiting or flowering cues, growth habit, and overall species identity from those reference photos.`
        : `No extra plant reference photos are provided, so rely carefully on the exact selected species names and descriptors.`;

    return `Create one high-quality photorealistic image of ${spaceProfile.scene}.

Design brief:
- Style: ${styleProfile.label} (${styleProfile.summary})
- Mood: ${moodProfile}
- Maintenance target: ${maintenanceProfile}
- Planting density: ${densityProfile}
- Hardscape direction: ${hardscapeProfile}
- Realism target: ${realismProfile}
- Budget direction: ${budgetProfile}

Selected plants that must appear as the primary planting palette:
${plantList}

${editingBlock}
${plantReferenceBlock}
${extraDirectionsBlock}

Constraint priority:
1. Respect the physical limits of the selected space type.
2. Keep every selected species visibly present and recognizably faithful.
3. Keep the scene believable for the requested realism and budget level.
4. Apply the requested style, mood, and extra directions around those constraints.

Visual composition rules:
- ${styleProfile.composition}
- ${spaceProfile.composition}
- ${spaceConstraintGuidance}
- ${realismProfile}
- ${budgetProfile}
- Every selected plant must be visibly present and identifiable in the final image. Do not omit any selected species.
- Use the selected plants as the hero plants. Do not replace them with stylistically similar filler plants or unrelated signature species.
- Species fidelity is more important than perfect style purity. If the style conflicts with a selected plant, adapt the layout and composition instead of changing the plant.
- Ensure at least one clearly readable specimen or cluster of each selected plant is visible in the foreground or midground, not hidden entirely in the background.
- If a selected plant has a distinctive leaf shape, fruit, bloom, or silhouette, show that identifying trait clearly enough that a user could recognize it.
- If a selected plant is normally too large for the space, use a realistic young, compact, or container-friendly specimen instead of changing the species.
- Keep proportions realistic and residential, not fantasy-like.
- Avoid labels, captions, diagrams, text overlays, collages, and split-screen output.
- Avoid cloned repetition, floating plants, impossible shadows, or surreal architecture.
- Avoid fantasy landscaping, resort-scale luxury, or unrealistic cost signals unless the selected budget direction explicitly allows a more premium residential result.
- Prioritize believable planting, material transitions, depth, and natural light.

Output one photorealistic image only.`;
};

const buildGardenPromptVariants = ({
    plants,
    design,
    hasReferencePhoto = false,
    hasPlantReferenceImages = false,
}) => {
    const fullPrompt = buildGardenPrompt({ plants, design, hasReferencePhoto, hasPlantReferenceImages });
    const plantNames = plants.map((plant) => getPlantDisplayName(plant)).filter(Boolean).join(", ");
    const styleLabel = GARDEN_STYLE_PROFILES[design.style]?.label || "Garden";
    const spaceLabel = GARDEN_SPACE_PROFILES[design.spaceType]?.label || "Garden";
    const realismLabel = GARDEN_REALISM_PROFILES[design.realismLevel] || GARDEN_REALISM_PROFILES[DEFAULT_GARDEN_DESIGN.realismLevel];
    const budgetLabel = GARDEN_BUDGET_PROFILES[design.budgetLevel] || GARDEN_BUDGET_PROFILES[DEFAULT_GARDEN_DESIGN.budgetLevel];
    const extraDirectionsSuffix = design.extraDirections
        ? ` Additional user directions: ${design.extraDirections}. Follow them only if they stay compatible with the selected plants and realistic residential scale.`
        : "";

    const concisePrompt = hasReferencePhoto
        ? `Edit the uploaded ${spaceLabel.toLowerCase()} photo into a ${styleLabel.toLowerCase()} design using these plants: ${plantNames}. Preserve the real layout and camera angle, but make every selected plant clearly visible and identifiable. Do not swap the species for generic stylistic substitutes. Keep the result ${realismLabel} and ${budgetLabel}.${extraDirectionsSuffix}`
        : `Create a photorealistic ${styleLabel.toLowerCase()} ${spaceLabel.toLowerCase()} featuring ${plantNames}. Every selected plant must be clearly visible, identifiable, and faithful to the species instead of becoming a generic garden filler plant. Keep the result ${realismLabel} and ${budgetLabel}.${extraDirectionsSuffix}`;

    const styleFirstPrompt = `Photorealistic ${styleLabel.toLowerCase()} design, ${GARDEN_MOOD_PROFILES[design.mood]}, ${GARDEN_DENSITY_PROFILES[design.density]}, ${GARDEN_HARDSCAPE_PROFILES[design.hardscape]}, featuring ${plantNames}. Make all selected plants unmistakably visible and do not substitute them. Keep the result ${realismLabel} and ${budgetLabel}.${extraDirectionsSuffix}`;

    return [fullPrompt, concisePrompt, styleFirstPrompt];
};

const extractModelText = (response) =>
    (response?.candidates?.[0]?.content?.parts || [])
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("")
        .trim();

const parseJsonModelOutput = (response) => {
    const rawText = extractModelText(response);
    if (!rawText) return null;

    try {
        return JSON.parse(rawText);
    } catch {
        const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const jsonCandidate = fencedMatch?.[1] || rawText;
        try {
            return JSON.parse(jsonCandidate.trim());
        } catch {
            return null;
        }
    }
};

const buildGardenGuidePrompt = ({ plants, design }) => {
    const styleLabel = GARDEN_STYLE_PROFILES[design.style]?.label || "garden";
    const plantLines = plants
        .map((plant) => {
            const scientificName = getPrimaryScientificName(plant);
            const label = getPlantDisplayName(plant);
            const descriptor = buildPlantPromptLine(plant).replace(/^- /, "");
            return `- plantId: ${getPlantRecordId(plant)}; label: ${label}; scientificName: ${scientificName || "unknown"}; descriptor: ${descriptor}`;
        })
        .join("\n");

    return `You are analyzing one already-generated photorealistic garden image.

The image was intended to contain these selected plants inside a ${styleLabel.toLowerCase()} concept:
${plantLines}

Task:
- Estimate where each selected plant appears in the image.
- Return at most one marker per plant.
- Only include a plant if you are reasonably confident it is visible and identifiable.
- If a plant cannot be confidently located, omit it instead of guessing.

Return JSON only in this exact shape:
{
  "markers": [
    {
      "plantId": 123,
      "label": "Tulip",
      "x": 42.5,
      "y": 73.1,
      "confidence": 0.84,
      "note": "front left planter"
    }
  ]
}

Rules:
- x and y must be percentages from 0 to 100.
- confidence must be between 0 and 1.
- note must be short, under 8 words.
- No markdown, no commentary, no extra keys.`;
};

const normalizeGuideMarkers = (markers, plants) => {
    const plantById = new Map(plants.map((plant) => [getPlantRecordId(plant), plant]));
    const normalizedMarkers = (Array.isArray(markers) ? markers : [])
        .map((marker) => {
            const plantId = Number(marker?.plantId);
            const plant = plantById.get(plantId);
            const x = Number(marker?.x);
            const y = Number(marker?.y);
            const confidence = Number(marker?.confidence);

            if (!plant || Number.isNaN(x) || Number.isNaN(y)) return null;
            if (x < 0 || x > 100 || y < 0 || y > 100) return null;

            return {
                plantId,
                label: normalizeOptionValue(marker?.label) || getPlantDisplayName(plant),
                x: Number(x.toFixed(2)),
                y: Number(y.toFixed(2)),
                confidence: Number.isNaN(confidence)
                    ? 0.5
                    : Math.max(0, Math.min(1, Number(confidence.toFixed(2)))),
                note: normalizeOptionValue(marker?.note) || null,
            };
        })
        .filter(Boolean);

    const bestMarkerByPlantId = new Map();

    for (const marker of normalizedMarkers) {
        const existingMarker = bestMarkerByPlantId.get(marker.plantId);
        if (!existingMarker || marker.confidence > existingMarker.confidence) {
            bestMarkerByPlantId.set(marker.plantId, marker);
        }
    }

    return [...bestMarkerByPlantId.values()].sort((a, b) => b.confidence - a.confidence);
};

const resolvePythonExecutable = () => {
    const candidates = [
        normalizeOptionValue(process.env.PYTHON_EXECUTABLE),
        process.env.VIRTUAL_ENV ? path.join(process.env.VIRTUAL_ENV, "Scripts", "python.exe") : null,
        path.resolve(process.cwd(), "..", ".venv", "Scripts", "python.exe"),
        path.resolve(process.cwd(), ".venv", "Scripts", "python.exe"),
        "python",
    ];

    return candidates.find((candidate) => candidate && (candidate === "python" || existsSync(candidate))) || "python";
};

const PYTHON_EXECUTABLE = resolvePythonExecutable();

const spawnPythonScript = (scriptRelativePath, args = []) =>
    spawn(PYTHON_EXECUTABLE, [scriptRelativePath, ...args], { cwd: process.cwd() });

const buildXgbArgsFromPrefs = (prefs = {}, topK = 6) => {
    const args = ["--top-k", String(topK), "--queries", "20"];

    if (normalizeOptionValue(prefs.watering)) args.push("--watering", String(prefs.watering));
    if (normalizeOptionValue(prefs.care_level)) args.push("--care-level", String(prefs.care_level));
    if (normalizeOptionValue(prefs.type)) args.push("--type", String(prefs.type));
    if (normalizeOptionValue(prefs.cycle)) args.push("--cycle", String(prefs.cycle));
    if (prefs.hardiness_zone !== undefined && prefs.hardiness_zone !== null && prefs.hardiness_zone !== "") {
        args.push("--hardiness-zone", String(prefs.hardiness_zone));
    }
    if (prefs.low_maintenance) args.push("--low-maintenance");

    return args;
};

const buildXgbFitLabel = (score) => {
    if (score >= 85) return "Excellent";
    if (score >= 65) return "Good";
    return "Possible";
};

const normalizeXgbDisplayScore = (rawScore, index, rawScores = []) => {
    const safeScores = rawScores.filter((value) => Number.isFinite(value));
    const maxScore = safeScores.length ? Math.max(...safeScores) : rawScore;
    const minScore = safeScores.length ? Math.min(...safeScores) : rawScore;

    if (!Number.isFinite(rawScore)) return Math.max(45, 80 - index * 4);
    if (!Number.isFinite(maxScore) || !Number.isFinite(minScore) || Math.abs(maxScore - minScore) < 0.0001) {
        return Math.max(55, 95 - index * 4);
    }

    return Number((55 + ((rawScore - minScore) / (maxScore - minScore)) * 40).toFixed(2));
};

const buildXgbRiskFlags = (plant, prefs = {}) => {
    const flags = [];

    if (prefs.low_maintenance && normalizeOptionValue(plant.maintenance)?.toLowerCase() !== "low") {
        flags.push("Not strictly low maintenance");
    }

    if (
        normalizeOptionValue(prefs.care_level) &&
        normalizeOptionValue(plant.care_level) &&
        normalizeOptionValue(plant.care_level) !== normalizeOptionValue(prefs.care_level)
    ) {
        flags.push(`Care level differs from ${prefs.care_level}`);
    }

    if (
        prefs.hardiness_zone !== undefined &&
        prefs.hardiness_zone !== null &&
        prefs.hardiness_zone !== "" &&
        plant.hardiness_min !== null &&
        plant.hardiness_max !== null
    ) {
        const zone = Number(prefs.hardiness_zone);
        const zmin = Number(plant.hardiness_min);
        const zmax = Number(plant.hardiness_max);
        if (Number.isFinite(zone) && Number.isFinite(zmin) && Number.isFinite(zmax) && (zone < zmin || zone > zmax)) {
            flags.push("Outside your hardiness zone");
        }
    }

    return flags.slice(0, 3);
};

const adaptXgbSummaryToFrontendResults = (summary = {}, prefs = {}) => {
    const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations : [];
    const rawScores = recommendations.map((entry) => Number(entry.xgb_score));
    const supportedPreferences = Array.isArray(summary.supported_preferences) ? summary.supported_preferences : [];

    return recommendations.map((entry, index) => {
        const rawScore = Number(entry.xgb_score);
        const displayScore = normalizeXgbDisplayScore(rawScore, index, rawScores);
        const reasons =
            Array.isArray(entry.demo_reasons) && entry.demo_reasons.length
                ? entry.demo_reasons.map((reason) => String(reason).replace(/_/g, " "))
                : ["Ranked highly by the XGBoost demo model"];

        return {
            _id: `xgb-${entry.id || index}`,
            id: entry.id,
            common_name: entry.common_name || "Unknown",
            latin_name: entry.latin_name || "Unknown",
            image_url: entry.image_url || null,
            score: displayScore,
            fit_label: buildXgbFitLabel(displayScore),
            why_it_fits: reasons,
            risk_flags: buildXgbRiskFlags(entry, prefs),
            breakdown: {
                engine: "xgboost_demo",
                raw_model_score: Number.isFinite(rawScore) ? Number(rawScore.toFixed(6)) : null,
                supported_preferences: supportedPreferences,
                profile_used: summary.profile_used || {},
                normalization_notes: summary.normalization_notes || {},
            },
            similarity: null,
            watering: entry.watering || null,
            care_level: entry.care_level || null,
            type: entry.type || null,
            cycle: entry.cycle || null,
            maintenance: entry.maintenance || null,
            model_score: Number.isFinite(rawScore) ? Number(rawScore.toFixed(6)) : null,
            engine: "xgb_demo",
        };
    });
};

const runPlantRecommender = async (req, res, { topK = 6 } = {}) => {
    try {
        const allPlants = await PerenualPlant.find({});
        const userPrefs = req.body || {};
        const pythonProcess = spawnPythonScript("scripts/plant_recommender.py");

        let resultData = "";
        let errorData = "";

        pythonProcess.stdout.on("data", (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorData += data.toString();
            console.error(`Plant recommender stderr: ${data}`);
        });

        pythonProcess.on("close", async (code) => {
            if (code !== 0) {
                console.error("Plant recommender exit code:", code);
                return res.status(500).json({
                    message: "An error occurred while generating recommendations.",
                    error: errorData,
                });
            }

            try {
                const jsonResponse = JSON.parse(resultData);
                const enrichedResults = await enrichRecommendationResultsWithPestRisk(
                    jsonResponse,
                    userPrefs.viewer_location || userPrefs.location || null
                );
                res.json(enrichedResults);
            } catch (parseError) {
                console.error("Plant recommender parse error:", resultData);
                res.status(500).json({ message: "Invalid response from the recommender engine." });
            }
        });

        const payload = JSON.stringify({ plants: allPlants, prefs: userPrefs, top_k: topK });
        pythonProcess.stdin.write(payload);
        pythonProcess.stdin.end();
    } catch (err) {
        console.error("Plant recommender backend error:", err);
        res.status(500).json({ message: "Server error while starting recommendations." });
    }
};

// A GET /plants végpont elején definiáld a régiókat
const runXgbPlantRecommender = async (req, res, { topK = 6 } = {}) => {
    try {
        const userPrefs = req.body || {};
        const pythonProcess = spawnPythonScript(
            "scripts/xgboost_recommender_demo.py",
            buildXgbArgsFromPrefs(userPrefs, topK)
        );

        let resultData = "";
        let errorData = "";

        pythonProcess.stdout.on("data", (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorData += data.toString();
            console.error(`XGBoost recommender stderr: ${data}`);
        });

        pythonProcess.on("close", async (code) => {
            if (code !== 0) {
                console.error("XGBoost recommender exit code:", code);
                return res.status(500).json({
                    message: "An error occurred while generating XGBoost recommendations.",
                    error: errorData || resultData,
                });
            }

            try {
                const summary = JSON.parse(resultData);
                if (summary?.error) {
                    return res.status(500).json({
                        message: summary.error,
                        details: summary.details || null,
                    });
                }

                const frontendResults = adaptXgbSummaryToFrontendResults(summary, userPrefs);
                const enrichedResults = await enrichRecommendationResultsWithPestRisk(
                    frontendResults,
                    userPrefs.viewer_location || userPrefs.location || null
                );
                res.json(enrichedResults);
            } catch (parseError) {
                console.error("XGBoost recommender parse error:", resultData);
                res.status(500).json({ message: "Invalid response from the XGBoost recommender engine." });
            }
        });
    } catch (err) {
        console.error("XGBoost recommender backend error:", err);
        res.status(500).json({ message: "Server error while starting XGBoost recommendations." });
    }
};

const REGION_MAPPING = {
    "Europe": ["Europe", "Germany", "France", "Italy", "Spain", "United Kingdom", "Hungary", "Austria", "Romania", "Ukraine", "Poland"],
    "Oceania": ["Australia", "New Zealand", "Papua New Guinea", "Fiji", "Samoa"],
    "North America": ["United States", "Canada", "Mexico"],
    "Asia": ["China", "Japan", "India", "Thailand", "Vietnam", "Indonesia", "South Korea"],
    "Africa": ["South Africa", "Egypt", "Nigeria", "Kenya", "Morocco"],
    "South America": ["Brazil", "Argentina", "Chile", "Colombia", "Peru"]
};



// 🌱 Növények listázása szűréssel
app.get("/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find({})
            .select("name email profileImage verified role systemRole location createdAt favourites savedGardens")
            .sort({ createdAt: -1 });

        const normalizedUsers = users.map((user) => ({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImage: user.profileImage || "",
            verified: Boolean(user.verified),
            role: user.role || "Gardener",
            systemRole: user.systemRole || "user",
            location: user.location || "",
            createdAt: user.createdAt,
            favouritesCount: Array.isArray(user.favourites) ? user.favourites.length : 0,
            savedGardensCount: Array.isArray(user.savedGardens) ? user.savedGardens.length : 0,
        }));

        res.json({
            users: normalizedUsers,
            currentUserRole: req.currentUser?.systemRole || "user",
        });
    } catch (err) {
        console.error("Error fetching admin users:", err);
        res.status(500).json({ message: "Error fetching admin users." });
    }
});

app.patch("/admin/users/:userId/system-role", authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { systemRole } = req.body || {};
        const allowedRoles = ["user", "admin", "superadmin"];

        if (!allowedRoles.includes(systemRole)) {
            return res.status(400).json({ message: "Invalid system role." });
        }

        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }

        const isSelf = String(targetUser._id) === String(req.currentUser._id);
        if (isSelf && systemRole !== "superadmin") {
            return res.status(400).json({ message: "You cannot remove your own superadmin role." });
        }

        if (targetUser.systemRole === "superadmin" && systemRole !== "superadmin") {
            const superAdminCount = await User.countDocuments({ systemRole: "superadmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: "At least one superadmin must remain." });
            }
        }

        targetUser.systemRole = systemRole;
        await targetUser.save();

        res.json({
            message: "System role updated successfully.",
            user: {
                _id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                systemRole: targetUser.systemRole,
            },
        });
    } catch (err) {
        console.error("Error updating system role:", err);
        res.status(500).json({ message: "Error updating system role." });
    }
});

app.get("/admin/plants", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const search = normalizeOptionValue(req.query.search) || "";
        const pageNumber = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
        const limitNumber = Math.min(24, Math.max(1, parseInt(String(req.query.limit || "12"), 10) || 12));
        const skip = (pageNumber - 1) * limitNumber;
        const query = {};

        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { common_name: regex },
                { scientific_name: regex },
                { genus: regex },
                { family: regex },
            ];
        }

        const [total, plants] = await Promise.all([
            PerenualPlant.countDocuments(query),
            PerenualPlant.find(query)
                .sort({ common_name: 1 })
                .skip(skip)
                .limit(limitNumber),
        ]);

        const normalizedPlants = plants.map((plant) => ({
            id: getPlantRecordId(plant),
            common_name: plant.common_name || "",
            scientific_name: Array.isArray(plant.scientific_name)
                ? plant.scientific_name
                : plant.scientific_name
                    ? [plant.scientific_name]
                    : [],
            default_image: plant.default_image || {},
            details: plant.details || {},
            adminCatalogStatus: normalizeOptionValue(plant.adminCatalogStatus) || "unset",
        }));

        res.json({
            data: normalizedPlants,
            total,
            page: pageNumber,
            totalPages: Math.max(1, Math.ceil(total / limitNumber)),
        });
    } catch (err) {
        console.error("Error fetching admin plants:", err);
        res.status(500).json({ message: "Error fetching admin plants." });
    }
});

app.post("/admin/plants", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const commonName = normalizeOptionValue(req.body?.common_name);
        const scientificNames = splitCommaSeparatedValues(req.body?.scientific_name);
        const otherNames = splitCommaSeparatedValues(req.body?.other_name);
        const family = normalizeOptionValue(req.body?.family);
        const genus = normalizeOptionValue(req.body?.genus);
        const type = canonicalizeType(req.body?.type) || normalizeOptionValue(req.body?.type);
        const cycle = canonicalizeCycle(req.body?.cycle) || normalizeOptionValue(req.body?.cycle);
        const watering = canonicalizeWatering(req.body?.watering) || normalizeOptionValue(req.body?.watering);
        const careLevel = canonicalizeCareLevel(req.body?.care_level) || normalizeOptionValue(req.body?.care_level);
        const sunlight = splitCommaSeparatedValues(req.body?.sunlight);
        const origin = splitCommaSeparatedValues(req.body?.origin);
        const description = normalizeOptionValue(req.body?.description);
        const imageSource = normalizeOptionValue(req.body?.imageUrl) || normalizeOptionValue(req.body?.imageDataUrl);
        const nextStatus = normalizeOptionValue(req.body?.catalogStatus) || "recommendable";
        const allowedStatuses = ["unset", "recommendable", "excluded"];

        if (!commonName) {
            return res.status(400).json({ message: "Common name is required." });
        }

        if (!scientificNames.length) {
            return res.status(400).json({ message: "At least one scientific name is required." });
        }

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid catalog status." });
        }

        if (imageSource && !/^https?:\/\//i.test(imageSource) && !/^data:image\//i.test(imageSource)) {
            return res.status(400).json({ message: "Image must be a valid URL or uploaded image data." });
        }

        const exactCommonNameRegex = new RegExp(`^${escapeRegexLiteral(commonName)}$`, "i");
        const exactScientificNameRegex = new RegExp(`^${escapeRegexLiteral(scientificNames[0])}$`, "i");

        const existingPlant = await PerenualPlant.findOne({
            common_name: exactCommonNameRegex,
            scientific_name: exactScientificNameRegex,
        }).lean();

        if (existingPlant) {
            return res.status(409).json({
                message: "A plant with this common name and scientific name already exists.",
            });
        }

        const latestPlant = await PerenualPlant.findOne({ id: { $type: "number" } }, { id: 1 })
            .sort({ id: -1 })
            .lean();

        const nextId = Math.max(1, Number(latestPlant?.id || 0) + 1);
        const now = new Date();

        const plantPayload = {
            id: nextId,
            common_name: commonName,
            scientific_name: scientificNames,
            other_name: otherNames,
            family,
            genus,
            type,
            cycle,
            watering,
            sunlight,
            care_level: careLevel,
            default_image: buildStoredPlantImage(imageSource),
            details: {
                ...(type ? { type } : {}),
                ...(cycle ? { cycle } : {}),
                ...(watering ? { watering } : {}),
                ...(sunlight.length ? { sunlight } : {}),
                ...(careLevel ? { care_level: careLevel } : {}),
                ...(origin.length ? { origin } : {}),
                ...(description ? { description } : {}),
            },
            imported_at: now,
            updated_at: now,
            adminCatalogStatus: nextStatus,
        };

        const createdPlant = await PerenualPlant.create(plantPayload);

        res.status(201).json({
            message: "Plant created successfully.",
            plant: {
                id: getPlantRecordId(createdPlant),
                common_name: createdPlant.common_name || "",
                scientific_name: Array.isArray(createdPlant.scientific_name) ? createdPlant.scientific_name : [],
                default_image: createdPlant.default_image || {},
                details: createdPlant.details || {},
                adminCatalogStatus: normalizeOptionValue(createdPlant.adminCatalogStatus) || "unset",
            },
        });
    } catch (err) {
        console.error("Error creating admin plant:", err);
        res.status(500).json({ message: "Error creating plant." });
    }
});

app.patch("/admin/plants/:id/catalog-status", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const allowedStatuses = ["unset", "recommendable", "excluded"];
        const nextStatus = normalizeOptionValue(req.body?.catalogStatus) || "unset";

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid catalog status." });
        }

        const plantId = Number(req.params.id);
        if (Number.isNaN(plantId)) {
            return res.status(400).json({ message: "Invalid plant id." });
        }

        const plant = await PerenualPlant.findOne({ id: plantId });
        if (!plant) {
            return res.status(404).json({ message: "Plant not found." });
        }

        plant.adminCatalogStatus = nextStatus;
        await plant.save();

        res.json({
            message: "Catalog status updated successfully.",
            plant: {
                id: plantId,
                adminCatalogStatus: plant.adminCatalogStatus,
            },
        });
    } catch (err) {
        console.error("Error updating plant catalog status:", err);
        res.status(500).json({ message: "Error updating plant catalog status." });
    }
});

app.get("/saved-gardens", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("savedGardens");
        if (!user) return res.status(404).json({ message: "User not found." });

        const savedGardens = [...(user.savedGardens || [])].sort(
            (left, right) => new Date(right.savedAt || 0).getTime() - new Date(left.savedAt || 0).getTime()
        );

        res.json({ savedGardens });
    } catch (err) {
        console.error("Error fetching saved gardens:", err);
        res.status(500).json({ message: "Error fetching saved gardens." });
    }
});

app.post("/saved-gardens", authenticateToken, async (req, res) => {
    try {
        const {
            title,
            image,
            referenceImage,
            usedReferencePhoto,
            gardenStyle,
            variationIndex,
            selectedPlants,
        } = req.body || {};

        if (typeof image !== "string" || !image.startsWith("data:image/")) {
            return res.status(400).json({ message: "A valid generated garden image is required." });
        }

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const styleKey = GARDEN_STYLE_PROFILES[gardenStyle] ? gardenStyle : DEFAULT_GARDEN_DESIGN.style;
        const styleLabel = GARDEN_STYLE_PROFILES[styleKey]?.label || "Garden";
        const normalizedPlants = (Array.isArray(selectedPlants) ? selectedPlants : [])
            .map((plant) => ({
                plantId: Number.isFinite(Number(plant?.plantId)) ? Number(plant.plantId) : null,
                commonName: normalizeOptionValue(plant?.commonName) || "",
                scientificName: normalizeOptionValue(plant?.scientificName) || "",
                image: normalizeOptionValue(plant?.image) || "",
            }))
            .filter((plant) => plant.plantId || plant.commonName || plant.scientificName)
            .slice(0, 12);

        const savedGarden = {
            title: normalizeOptionValue(title) || `${styleLabel} Garden`,
            image,
            referenceImage: normalizeOptionValue(referenceImage) || "",
            usedReferencePhoto: Boolean(usedReferencePhoto),
            gardenStyle: styleKey,
            variationIndex: Number.isFinite(Number(variationIndex)) ? Number(variationIndex) : 0,
            plants: normalizedPlants,
            savedAt: new Date(),
        };

        user.savedGardens.unshift(savedGarden);
        user.savedGardens = user.savedGardens.slice(0, 40);
        await user.save();

        res.status(201).json({
            message: "Garden saved successfully.",
            savedGarden: user.savedGardens[0],
        });
    } catch (err) {
        console.error("Error saving garden:", err);
        res.status(500).json({ message: "Error saving garden." });
    }
});

app.delete("/saved-gardens/:gardenId", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const beforeCount = user.savedGardens.length;
        user.savedGardens = user.savedGardens.filter(
            (garden) => String(garden._id) !== String(req.params.gardenId)
        );

        if (user.savedGardens.length === beforeCount) {
            return res.status(404).json({ message: "Saved garden not found." });
        }

        await user.save();
        res.json({ message: "Saved garden removed." });
    } catch (err) {
        console.error("Error deleting saved garden:", err);
        res.status(500).json({ message: "Error deleting saved garden." });
    }
});

app.get("/plants", async (req, res) => {
    try {
        // !!! ITT ADTAM HOZZÁ AZ 'origin'-t a listához !!!
        let { page = 1, limit = 24, search = "", watering, sunlight, care_level, type, cycle, origin } = req.query;

        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 24;
        const skip = (pageNumber - 1) * limitNumber;

        const query = {};
        const andClauses = [];

        // Keresés (Search)
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

        // --- SZŰRŐK ---

        if (watering) query['details.watering'] = watering;
        if (care_level) query['details.care_level'] = care_level;
        if (type) {
            const typeCondition = buildTypeFilterCondition(type);
            if (typeCondition) andClauses.push(typeCondition);
        }
        if (cycle) {
            const cycleCondition = buildCycleFilterCondition(cycle);
            if (cycleCondition) andClauses.push(cycleCondition);
        }
        if (sunlight) query['details.sunlight'] = { $in: [new RegExp(sunlight, "i")] };

        // !!! ITT VAN A HIÁNYZÓ ORIGIN LOGIKA !!!
        if (origin) {
            // Megnézzük, hogy a választott origin (pl. "Oceania") szerepel-e a térképünkben
            const mappedCountries = REGION_MAPPING[origin];

            if (mappedCountries) {
                // Ha régió (pl. Oceania), akkor keressük bármelyik hozzá tartozó országot
                query['details.origin'] = {
                    $in: mappedCountries.map(c => new RegExp(c, "i"))
                };
            } else {
                // Ha nem régió (pl. "Australia"), akkor keressük simán a nevet
                query['details.origin'] = { $in: [new RegExp(origin, "i")] };
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
        console.error("❌ Error fetching plants:", err);
        res.status(500).json({ message: "Server error while fetching plants." });
    }
});

// 🌱 Egyetlen növény lekérése ID alapján
app.get("/plants/:id", async (req, res) => {
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
        console.error("❌ Error fetching plant details:", err);
        res.status(500).json({ message: "Server error while fetching plant details." });
    }
});

// 🌍 ÚJ VÉGPONT: Összes elérhető régió/ország lekérése az adatbázisból
app.get("/regions", async (req, res) => {
    try {
        // Aggregáció:
        // 1. $unwind: A növények 'details.origin' tömbjét szétszedjük külön dokumentumokra
        // 2. $group: Csoportosítjuk őket név szerint (így eltűnnek a duplikációk)
        // 3. $sort: ABC sorrendbe rendezzük
        const regions = await PerenualPlant.aggregate([
            { $unwind: "$details.origin" },
            {
                $group: {
                    _id: "$details.origin"
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    name: "$_id"
                }
            }
        ]);

        // Az eredmény egy tömb lesz: [{ name: "Afghanistan" }, { name: "Albania" }, ...]
        // Ezt egyszerűsítjük egy sima string tömbbé: ["Afghanistan", "Albania", ...]
        const regionList = regions.map(r => r.name).filter(Boolean); // filter(Boolean) kiszűri a null/üres értékeket

        res.json(regionList);

    } catch (err) {
        console.error("❌ Error fetching regions:", err);
        res.status(500).json({ message: "Server error while fetching regions." });
    }
});

app.get("/api/recommender/options", async (req, res) => {
    try {
        const plants = await PerenualPlant.find({}, { details: 1 });

        res.json({
            sunlight: collectDistinctValues(plants, (plant) =>
                (plant.details?.sunlight || []).map(canonicalizeSunlight)
            ),
            watering: collectDistinctValues(plants, (plant) =>
                canonicalizeWatering(plant.details?.watering)
            ),
            soil: collectDistinctValues(plants, (plant) =>
                (plant.details?.soil || []).map(canonicalizeSoil)
            ),
            care_level: collectDistinctValues(plants, (plant) =>
                canonicalizeCareLevel(plant.details?.care_level)
            ),
            type: collectDistinctValues(plants, (plant) =>
                canonicalizeType(plant.details?.type)
            ),
            cycle: collectDistinctValues(plants, (plant) =>
                canonicalizeCycle(plant.details?.cycle)
            ),
        });
    } catch (err) {
        console.error("Recommender options error:", err);
        res.status(500).json({ message: "Server error while loading recommender options." });
    }
});

app.post("/api/recommender/v2", async (req, res) => {
    const requestedTopK = Number(req.body?.limit);
    const topK = Number.isInteger(requestedTopK) && requestedTopK > 0 ? requestedTopK : 6;
    await runPlantRecommender(req, res, { topK });
});

app.post("/api/recommender/xgb", async (req, res) => {
    const requestedTopK = Number(req.body?.limit);
    const topK = Number.isInteger(requestedTopK) && requestedTopK > 0 ? requestedTopK : 6;
    await runXgbPlantRecommender(req, res, { topK });
});

app.post("/api/recommender", async (req, res) => {
    try {
        const allPlants = await PerenualPlant.find({});
        const userPrefs = req.body;

        // 1. Csak a fájlnevet adjuk meg, nincsenek hosszú argumentumok!
        const pythonProcess = spawn('python', ['scripts/plant_recommender.py']);

        let resultData = "";
        let errorData = "";

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            console.error(`Python hiba: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python kilépési kód:", code);
                return res.status(500).json({ message: "Hiba történt az AI ajánlás során.", error: errorData });
            }
            try {
                const jsonResponse = JSON.parse(resultData);
                res.json(jsonResponse);
            } catch (parseError) {
                console.error("JSON Parse hiba:", resultData);
                res.status(500).json({ message: "Hibás válasz az AI motortól." });
            }
        });

        // 2. AZ ADATOK ÁTKÜLDÉSE "CSÖVÖN" (stdin) KERESZTÜL
        const payload = JSON.stringify({ plants: allPlants, prefs: userPrefs });
        pythonProcess.stdin.write(payload);
        pythonProcess.stdin.end(); // Ezzel jelezzük a Pythonnak, hogy vége az adatnak

    } catch (err) {
        console.error("Backend hiba:", err);
        res.status(500).json({ message: "Szerver hiba az ajánlás indításakor." });
    }
});
// ─────────────────────────────────────────────
// 🔹 FAVOURITES VÉGPONTOK – add hozzá a server.js-hez az app.listen() elé
// ─────────────────────────────────────────────

// Toggle favourite (hozzáad vagy eltávolít)
app.post("/favourites/toggle", authenticateToken, async (req, res) => {
    try {
        const { plantId } = req.body;
        if (!plantId) return res.status(400).json({ message: "plantId is required." });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const id = Number(plantId);
        const index = user.favourites.indexOf(id);

        if (index === -1) {
            user.favourites.push(id);        // hozzáadás
        } else {
            user.favourites.splice(index, 1); // eltávolítás
        }

        await user.save();
        res.json({ favourites: user.favourites });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});

// Kedvenc növények lekérése (teljes plant objektumok)
app.get("/favourites", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("favourites");
        if (!user) return res.status(404).json({ message: "User not found." });

        const plants = await PerenualPlant.find({ id: { $in: user.favourites } });
        res.json({ favourites: user.favourites, plants });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});
// 🌱 Kert generálás AI-val
app.post("/api/generate-garden", async (req, res) => {
    try {
        const { plants } = req.body;

        if (!plants || plants.length === 0) {
            return res.status(400).json({ error: "Nincsenek növények megadva!" });
        }

        if (!process.env.GOOGLE_AI_API_KEY) {
            return res.status(500).json({ error: "Google AI API kulcs nincs beállítva!" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const plantList = plants
            .filter(p => p.name && p.name.trim())
            .map(p => `- ${p.name} (x: ${p.x}%, y: ${p.y}%)`)
            .join('\n');

        if (!plantList) {
            return res.status(400).json({ error: "Legalább egy érvényes növény szükséges!" });
        }

        const prompt = `
Hozz létre egy SVG képet egy kertről az alábbi jellemzőkkel:
- Méret: 800x600px
- Háttér: zöld fű mintázat
- Növények elhelyezkedése:
${plantList}

Minden növényt egyszerű szimbólumokkal jelölj meg (körök, háromszögek, virágok stb.).
Az SVG-t úgy formázd, hogy közvetlenül renderelhető legyen.
Csak az SVG-t adja vissza, semmi más.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const svgMatch = responseText.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);

        if (!svgMatch) {
            console.error("AI válasz:", responseText);
            return res.status(500).json({ error: "Az AI nem tudott SVG képet generálni. Próbáld meg újra!" });
        }

        res.json({ svg: svgMatch[0] });

    } catch (error) {
        console.error("Garden generálás hiba:", error);
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});

// A fájl tetejére (ha még nincs ott):
// import { GoogleGenAI } from "@google/genai";

// 🌱 ÚJ VÉGPONT: Fotórealisztikus kert generálása AI-val
app.post("/api/generate-photorealistic-garden", authenticateToken, async (req, res) => {
    try {
        const { selectedPlantIds, referenceGardenPhoto, gardenStyle, designPreferences, variationCount } = req.body || {};

        if (!selectedPlantIds || selectedPlantIds.length === 0) {
            return res.status(400).json({ error: "Nincsenek novenyek kivalasztva!" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "A GEMINI_API_KEY nincs beallitva." });
        }

        const plants = await PerenualPlant.find({ id: { $in: selectedPlantIds } });

        if (plants.length === 0) {
            return res.status(404).json({ error: "A megadott novenyek nem talalhatoak." });
        }

        const orderedPlants = selectedPlantIds
            .map((selectedId) => plants.find((plant) => getPlantRecordId(plant) === Number(selectedId)))
            .filter(Boolean);

        if (orderedPlants.length === 0) {
            return res.status(404).json({ error: "A kivalasztott novenyeket nem sikerult pontosan parositani." });
        }

        const design = normalizeGardenDesignPreferences({
            ...(designPreferences && typeof designPreferences === "object" ? designPreferences : {}),
            style: gardenStyle || designPreferences?.style || DEFAULT_GARDEN_DESIGN.style,
        });

        let uploadedGardenPhotoPart = null;
        const uploadedGardenPhoto =
            referenceGardenPhoto &&
            typeof referenceGardenPhoto === "object" &&
            typeof referenceGardenPhoto.data === "string" &&
            typeof referenceGardenPhoto.mimeType === "string"
                ? referenceGardenPhoto
                : null;

        if (uploadedGardenPhoto) {
            try {
                uploadedGardenPhotoPart = createPartFromBase64(
                    uploadedGardenPhoto.data,
                    uploadedGardenPhoto.mimeType
                );
            } catch {
                return res.status(400).json({ error: "Ervenytelen feltoltott kertfoto." });
            }
        }

        const referenceParts = [];

        for (const plant of orderedPlants) {
            const imageCandidates = getPlantImageCandidates(plant);
            const label = buildPlantReferenceLabel(plant);

            for (const imageUrl of imageCandidates) {
                try {
                    const imagePart = await fetchReferenceImagePart(imageUrl);
                    referenceParts.push({ text: `Reference plant photo: ${label}` });
                    referenceParts.push(imagePart);
                    break;
                } catch (imageError) {
                    console.warn(`Could not load reference image for ${label}:`, imageError.message);
                }
            }
        }

        const promptVariants = buildGardenPromptVariants({
            plants: orderedPlants,
            design,
            hasPlantReferenceImages: referenceParts.length > 0,
            hasReferencePhoto: Boolean(uploadedGardenPhotoPart),
        });
        const requestedVariationCount = Math.min(
            3,
            Math.max(1, Number.parseInt(String(variationCount || 1), 10) || 1)
        );
        const variationPrompts = [
            "Variation direction: balanced and straightforward home-garden composition.",
            "Variation direction: slightly different planting layout with a fresh visual arrangement.",
            "Variation direction: an alternative but still realistic composition using the same selected plants.",
        ];

        console.log(
            `\nImage generation started for plants: ${orderedPlants
                .map((plant) => getPlantDisplayName(plant))
                .join(", ")} | reference images: ${referenceParts.length / 2} | uploaded garden photo: ${uploadedGardenPhotoPart ? "yes" : "no"} | variations: ${requestedVariationCount}`
        );

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        let lastError = null;
        const generatedImages = [];

        for (let variationIndex = 0; variationIndex < requestedVariationCount; variationIndex += 1) {
            let base64Image = null;
            let mimeType = "image/png";

            for (const prompt of promptVariants) {
                const promptWithVariation = `${prompt}\n\n${variationPrompts[variationIndex] || variationPrompts[0]}`;

                for (let attempt = 1; attempt <= 2; attempt += 1) {
                    try {
                        const response = await ai.models.generateContent({
                            model: "gemini-3.1-flash-image-preview",
                            contents: [
                                {
                                    role: "user",
                                    parts: [
                                        { text: promptWithVariation },
                                        ...(uploadedGardenPhotoPart
                                            ? [{ text: "Base garden photo to edit:" }, uploadedGardenPhotoPart]
                                            : []),
                                        ...referenceParts,
                                    ],
                                },
                            ],
                            config: {
                                responseModalities: [Modality.TEXT, Modality.IMAGE],
                            },
                        });

                        const parts = response?.candidates?.[0]?.content?.parts || [];
                        const imagePart = parts.find((part) => part.inlineData?.data);

                        if (imagePart?.inlineData?.data) {
                            base64Image = imagePart.inlineData.data;
                            mimeType = imagePart.inlineData.mimeType || "image/png";
                            break;
                        }
                    } catch (apiError) {
                        lastError = apiError;
                        console.error(
                            `Garden generation attempt failed (variation ${variationIndex + 1}, attempt ${attempt}):`,
                            apiError
                        );

                        if (apiError?.status && apiError.status < 500) {
                            throw apiError;
                        }
                    }
                }

                if (base64Image) {
                    break;
                }
            }

            if (base64Image) {
                generatedImages.push(`data:${mimeType};base64,${base64Image}`);
            }
        }

        if (generatedImages.length === 0) {
            return res.status(500).json({
                error: lastError?.message || "Az AI nem adott vissza kepet.",
            });
        }

        console.log(`Image generation completed with ${generatedImages.length} variation(s).`);

        return res.json({
            message: "Kert sikeresen generalva!",
            imageBase64: generatedImages[0],
            images: generatedImages,
            variationCount: generatedImages.length,
            generationMode: "plant_only",
        });
    } catch (error) {
        console.error("Garden generation error:", error);
        return res.status(500).json({ error: error.message || "Szerver hiba a generalas soran." });
    }
});

app.post("/api/garden-plant-guide", authenticateToken, async (req, res) => {
    try {
        const { selectedPlantIds, imageData, designPreferences } = req.body || {};

        if (!Array.isArray(selectedPlantIds) || selectedPlantIds.length === 0) {
            return res.status(400).json({ error: "Nincsenek novenyek kivalasztva a guide modhoz." });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "A GEMINI_API_KEY nincs beallitva." });
        }

        const imageMatch = String(imageData || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!imageMatch) {
            return res.status(400).json({ error: "Ervenytelen vagy hianyzo kepadat." });
        }

        const [, imageMimeType, imageBase64] = imageMatch;

        const plants = await PerenualPlant.find({ id: { $in: selectedPlantIds } });
        if (plants.length === 0) {
            return res.status(404).json({ error: "A guide modhoz megadott novenyek nem talalhatoak." });
        }

        const orderedPlants = selectedPlantIds
            .map((selectedId) => plants.find((plant) => getPlantRecordId(plant) === Number(selectedId)))
            .filter(Boolean);

        const design = normalizeGardenDesignPreferences(designPreferences);
        const prompt = buildGardenGuidePrompt({ plants: orderedPlants, design });

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        createPartFromBase64(imageBase64, imageMimeType),
                    ],
                },
            ],
            config: {
                responseMimeType: "application/json",
            },
        });

        const parsed = parseJsonModelOutput(response);
        const markers = normalizeGuideMarkers(parsed?.markers, orderedPlants);

        return res.json({
            markers,
            unresolvedCount: Math.max(0, orderedPlants.length - markers.length),
        });
    } catch (error) {
        console.error("Garden guide error:", error);
        return res.status(500).json({ error: error.message || "Szerver hiba a guide generalasa soran." });
    }
});

/* app.post("/api/generate-photorealistic-garden-legacy", authenticateToken, async (req, res) => {
    try {
        // 1. Megkapjuk a frontendről a kiválasztott növények ID-jait tömbként
        const { selectedPlantIds } = req.body;

        if (!selectedPlantIds || selectedPlantIds.length === 0) {
            return res.status(400).json({ error: "Nincsenek növények kiválasztva!" });
        }

        // 2. Lekérjük a növényeket a MongoDB-ből
        const plants = await PerenualPlant.find({ id: { $in: selectedPlantIds } });

        if (plants.length === 0) {
            return res.status(404).json({ error: "A megadott növények nem találhatóak." });
        }

        // 3. Kinyerjük a neveket (pl. "Basil, Cherry Tomato, Mint")
        const plantNames = plants.map(p => p.common_name).join(", ");

        // 4. Összerakjuk a tökéletes promptot az Imagen 3-nak
        const prompt = `Create a highly detailed, photorealistic garden scene featuring these specific plants: ${plantNames}. Show realistic foliage, natural lighting, rich textures, and a visually coherent garden composition.`;

        console.log(`\n🎨 Kép generálása folyamatban a következő növényekkel: ${plantNames}`);

        // 5. AI inicializálása (Ellenőrizd, hogy a .env-ben van-e GOOGLE_AI_API_KEY)
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // 6. Generálás a Google csúcsmodelljével (Imagen 3)
        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-image-preview",
            contents: prompt,
                numberOfImages: 1, // Hány képet kérünk
                outputMimeType: 'image/jpeg',
                aspectRatio: "4:3" // Lehet "1:1" vagy "16:9" is

        });
 * /
        // 7. Kép kinyerése a válaszból (Az SDK alapból base64 formátumban adja vissza!)
        const base64Image = response.generatedImages?.[0]?.image?.imageBytes;

        if (!base64Image) {
            return res.status(500).json({ error: "Az AI nem tudta legenerálni a képet." });
        }

        console.log("✅ Kert sikeresen legenerálva!");

        // 8. Visszaküldjük a frontendnek Data URL formátumban, így egyből mehet az <img> src-be!
        res.json({
            message: "Kert sikeresen generálva!",
            imageBase64: `data:image/jpeg;base64,${base64Image}`
        });

    } catch (error) {
        console.error("❌ Hiba a kert generálása során:", error);
        res.status(500).json({ error: "Szerver hiba a generálás során." });
    }
});
app.listen(5000, () => console.log("✅ Server running on port 5000"));
*/
app.listen(5000, () => console.log("Server running on port 5000"));
