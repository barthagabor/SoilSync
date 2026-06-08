import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import PerenualPlant from "./models/PerenualPlant.js";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import { Modality, createPartFromBase64 } from "@google/genai";
import { createGoogleGenAIClient, getGoogleGenAIConfigError } from "./services/googleGenAIClient.js";
import {
    getPlantDisplayName,
    getPlantRecordId,
    isCloudinaryImageUrl,
    isInlineImageDataUrl,
    isRemoteImageUrl,
    normalizeOptionValue,
} from "./utils/plantCatalog.js";


import authRoutes from "./routes/authRoutes.js";
import premiumRoutes from "./routes/premiumRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import plantsRoutes from "./routes/plantsRoutes.js";
import recommenderRoutes from "./routes/recommenderRoutes.js";
import { authenticateToken } from "./middlewares/authMiddleware.js";

dotenv.config();

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

const app = express();

app.use(cors());

// --- FONTOS: A JSON parsernek a Route-ok elÅ‘tt kell lennie! ---
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Auth Ãºtvonalak bekÃ¶tÃ©se
app.use("/", authRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/community", communityRoutes);
app.use("/admin", adminRoutes);
app.use("/", plantsRoutes);
app.use("/api/recommender", recommenderRoutes);

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("âœ… MongoDB connected"))
    .catch((err) => console.error("âŒ MongoDB error:", err));

const isCloudinaryConfigured = () =>
    Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const uploadSavedGardenImageToCloudinary = async (imageValue, { userId, kind }) => {
    const normalizedImageValue = normalizeOptionValue(imageValue) || "";
    if (!normalizedImageValue) return "";
    if (isRemoteImageUrl(normalizedImageValue)) return normalizedImageValue;

    if (!isInlineImageDataUrl(normalizedImageValue)) {
        throw new Error(`Invalid ${kind} image payload.`);
    }

    if (!isCloudinaryConfigured()) {
        throw new Error("Cloudinary is not configured for saved garden image uploads.");
    }

    const uploadResult = await cloudinary.uploader.upload(normalizedImageValue, {
        folder: `soilsync/saved-gardens/${userId}`,
        public_id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        resource_type: "image",
        overwrite: false,
    });

    return normalizeOptionValue(uploadResult?.secure_url || uploadResult?.url) || "";
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
    const mandatoryPlantChecklist = plants
        .map((plant, index) => {
            const label = buildPlantReferenceLabel(plant);
            const recognitionCue = getPlantRecognitionCue(plant);
            return `${index + 1}. ${label}${recognitionCue ? ` — visible cue: ${recognitionCue}` : ""}`;
        })
        .join("\n");
    const spaceConstraintGuidance = getSpaceConstraintGuidance(design.spaceType);
    const extraDirectionsBlock = design.extraDirections
        ? `Additional user directions:
- ${design.extraDirections}

Treat these as preference hints only when they stay compatible with the selected plants, selected style, realistic home-garden scale, realism target, and budget target.`
        : `Additional user directions:
- none`;

    const editingBlock = hasReferencePhoto
        ? `You are editing the provided real garden photo. Preserve the original camera angle, architecture, fence lines, paving, walls, and lighting direction. Only redesign the planting beds, borders, pots, and soft landscaping. Integrate the selected plants naturally into the existing scene with correct scale, perspective, overlap, shadows, and depth.

You may replace or restyle existing non-architectural vegetation, shrubs, perennials, and small ornamental trees as needed so every selected species is visibly present. Existing generic planting is not mandatory to preserve if it blocks the selected species.`
        : `Create a brand-new but believable home-garden scene from scratch. Keep the layout achievable for a real homeowner, with clear planting beds, realistic spacing, and coherent paths or material transitions.`;

    const plantReferenceBlock = hasPlantReferenceImages
        ? `Reference photos are also provided for some selected plants. Match the visible foliage shape, fruiting or flowering cues, growth habit, and overall species identity from those reference photos.`
        : `No extra plant reference photos are provided, so rely carefully on the exact selected species names and descriptors.`;
    const sparsePaletteBlock = plants.length <= 2
        ? `Selected palette guidance:
- Only ${plants.length} selected plant species are available, so build the design mainly by repeating, grouping, and placing those selected plants intelligently.
- Do not solve the scene by introducing a new dominant signature species that was not selected.
- If subtle supporting greenery is absolutely necessary, keep it visually secondary, generic, and non-dominant so the selected plants still define the garden identity.
- For Japanese Zen specifically, use stone, gravel, spacing, asymmetry, clipping, rhythm, negative space, and composition to create the zen feeling before adding any strong extra species identity.`
        : `Selected palette guidance:
- Use the selected plants as the unmistakable hero palette throughout the design.
- Any subtle supporting greenery must remain secondary and must never visually replace the selected plants.
- If the scene needs more fullness, solve it by repeating the selected species, using harder materials, mulch, gravel, stone, containers, spacing, or negative space, not by adding extra plant species.`;
    const forbiddenSpeciesBlock = `Forbidden species policy:
- No clearly identifiable plant species outside the mandatory species checklist may appear in the final image.
- Do not add extra ornamental trees, shrubs, hydrangeas, maples, grasses, hedges, perennials, filler flowers, or tropical substitutes unless they are explicitly part of the selected list.
- Do not "correct" the palette by swapping tender plants for hardier lookalikes, or by replacing unusual selections with more common garden species.
- If a fuller composition is needed, repeat the selected species or use non-plant structure instead of inventing new species.`;

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

Mandatory species checklist:
${mandatoryPlantChecklist}

${editingBlock}
${plantReferenceBlock}
${sparsePaletteBlock}
${forbiddenSpeciesBlock}
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
- The image is unsuccessful if any item from the mandatory species checklist is missing, too tiny to identify, replaced by a generic substitute, or visually drowned out by unselected species.
- Every selected plant must be visibly present and identifiable in the final image. Do not omit any selected species.
- Use the selected plants as the hero plants. Do not replace them with stylistically similar filler plants or unrelated signature species.
- Do not introduce any new visually dominant species that were not selected, especially not iconic style shorthand plants such as Japanese maples, olive trees, lavender, palms, or similar substitutes, unless they were explicitly selected by the user.
- Do not include any other clearly identifiable plant species outside the selected list, even in the background, borders, or containers.
- If the scene would otherwise feel empty, use repeated specimens of the selected species, simpler planting masses made from the selected species, or more hardscape and open space.
- If one selected species looks difficult, unusual, tender, or stylistically awkward, still keep that same species rather than silently replacing it with a more familiar garden plant.
- Species fidelity is more important than perfect style purity. If the style conflicts with a selected plant, adapt the layout and composition instead of changing the plant.
- Ensure at least one clearly readable specimen or cluster of each selected plant is visible in the foreground or midground, not hidden entirely in the background.
- If there are many selected species, organize them into clearly separated drifts, clusters, or specimens so each one remains readable instead of blending into generic mixed planting.
- For selected woody plants such as magnolias, dogwoods, maples, or similar ornamental trees and shrubs, ensure they appear as distinct visible specimens rather than disappearing into the background tree mass.
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
    const sparsePaletteSuffix = plants.length <= 2
        ? " Build the composition mainly from repeated groupings of the selected plants and do not introduce a new dominant unselected signature species or any other clearly identifiable extra species."
        : " Do not introduce any clearly identifiable unselected species anywhere in the scene.";

    const concisePrompt = hasReferencePhoto
        ? `Edit the uploaded ${spaceLabel.toLowerCase()} photo into a ${styleLabel.toLowerCase()} design using exactly these ${plants.length} selected species: ${plantNames}. Preserve the real layout and camera angle, but replace existing non-architectural planting as needed so every selected plant is clearly visible, identifiable, and not omitted. Do not swap the species for generic stylistic substitutes or add any other identifiable plant species.${sparsePaletteSuffix} Keep the result ${realismLabel} and ${budgetLabel}.${extraDirectionsSuffix}`
        : `Create a photorealistic ${styleLabel.toLowerCase()} ${spaceLabel.toLowerCase()} featuring exactly these ${plants.length} selected species: ${plantNames}. Every selected plant must be clearly visible, identifiable, and faithful to the species instead of becoming a generic garden filler plant. No other identifiable plant species may appear.${sparsePaletteSuffix} Keep the result ${realismLabel} and ${budgetLabel}.${extraDirectionsSuffix}`;

    const styleFirstPrompt = `Photorealistic ${styleLabel.toLowerCase()} design, ${GARDEN_MOOD_PROFILES[design.mood]}, ${GARDEN_DENSITY_PROFILES[design.density]}, ${GARDEN_HARDSCAPE_PROFILES[design.hardscape]}, featuring exactly these ${plants.length} selected species: ${plantNames}. Make every selected plant unmistakably visible, do not omit any species, do not substitute them, and do not add any other identifiable species.${sparsePaletteSuffix} Keep the result ${realismLabel} and ${budgetLabel}.${extraDirectionsSuffix}`;

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

        const normalizedImage = normalizeOptionValue(image) || "";
        const normalizedReferenceImage = normalizeOptionValue(referenceImage) || "";

        if (!normalizedImage || (!isInlineImageDataUrl(normalizedImage) && !isRemoteImageUrl(normalizedImage))) {
            return res.status(400).json({ message: "A valid generated garden image is required." });
        }

        if (
            normalizedReferenceImage &&
            !isInlineImageDataUrl(normalizedReferenceImage) &&
            !isRemoteImageUrl(normalizedReferenceImage)
        ) {
            return res.status(400).json({ message: "The reference garden photo must be an image data URL or remote URL." });
        }

        const storedImageUrl = await uploadSavedGardenImageToCloudinary(normalizedImage, {
            userId: req.user.userId,
            kind: "generated-garden",
        });
        const storedReferenceImageUrl = normalizedReferenceImage
            ? await uploadSavedGardenImageToCloudinary(normalizedReferenceImage, {
                  userId: req.user.userId,
                  kind: "reference-garden",
              })
            : "";

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
            image: storedImageUrl,
            referenceImage: storedReferenceImageUrl,
            usedReferencePhoto: Boolean(usedReferencePhoto),
            gardenStyle: styleKey,
            variationIndex: Number.isFinite(Number(variationIndex)) ? Number(variationIndex) : 0,
            plants: normalizedPlants,
            savedAt: new Date(),
        };

        const updateResult = await User.updateOne(
            { _id: req.user.userId },
            {
                $push: {
                    savedGardens: {
                        $each: [savedGarden],
                        $position: 0,
                        $slice: 40,
                    },
                },
            },
            { runValidators: true }
        );

        if (!updateResult?.matchedCount) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(201).json({
            message: "Garden saved successfully.",
            savedGarden,
        });
    } catch (err) {
        console.error("Error saving garden:", err);
        res.status(500).json({ message: err.message || "Error saving garden." });
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

// Toggle favourite (hozzÃ¡ad vagy eltÃ¡volÃ­t)
app.post("/favourites/toggle", authenticateToken, async (req, res) => {
    try {
        const { plantId } = req.body;
        if (!plantId) return res.status(400).json({ message: "plantId is required." });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const id = Number(plantId);
        const index = user.favourites.indexOf(id);

        if (index === -1) {
            user.favourites.push(id);        // hozzÃ¡adÃ¡s
        } else {
            user.favourites.splice(index, 1); // eltÃ¡volÃ­tÃ¡s
        }

        await user.save();
        res.json({ favourites: user.favourites });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error." });
    }
});

// Kedvenc nÃ¶vÃ©nyek lekÃ©rÃ©se (teljes plant objektumok)
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
// ðŸŒ± Kert generÃ¡lÃ¡s AI-val
app.post("/api/generate-garden", async (req, res) => {
    try {
        const { plants } = req.body;

        if (!plants || plants.length === 0) {
            return res.status(400).json({ error: "Nincsenek nÃ¶vÃ©nyek megadva!" });
        }

        const googleGenAIConfigError = getGoogleGenAIConfigError();
        if (googleGenAIConfigError) {
            return res.status(500).json({ error: googleGenAIConfigError });
        }

        const plantList = plants
            .filter(p => p.name && p.name.trim())
            .map(p => `- ${p.name} (x: ${p.x}%, y: ${p.y}%)`)
            .join('\n');

        if (!plantList) {
            return res.status(400).json({ error: "LegalÃ¡bb egy Ã©rvÃ©nyes nÃ¶vÃ©ny szÃ¼ksÃ©ges!" });
        }

        const prompt = `
Hozz lÃ©tre egy SVG kÃ©pet egy kertrÅ‘l az alÃ¡bbi jellemzÅ‘kkel:
- MÃ©ret: 800x600px
- HÃ¡ttÃ©r: zÃ¶ld fÅ± mintÃ¡zat
- NÃ¶vÃ©nyek elhelyezkedÃ©se:
${plantList}

Minden nÃ¶vÃ©nyt egyszerÅ± szimbÃ³lumokkal jelÃ¶lj meg (kÃ¶rÃ¶k, hÃ¡romszÃ¶gek, virÃ¡gok stb.).
Az SVG-t Ãºgy formÃ¡zd, hogy kÃ¶zvetlenÃ¼l renderelhetÅ‘ legyen.
Csak az SVG-t adja vissza, semmi mÃ¡s.`;

        const ai = createGoogleGenAIClient();
        const modelName = process.env.GARDEN_SVG_MODEL || process.env.PREMIUM_ASSISTANT_MODEL || "gemini-2.5-flash";
        const result = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "text/plain",
            },
        });
        const responseText = extractModelText(result);

        const svgMatch = responseText.match(/<svg[^>]*>[\s\S]*?<\/svg>/i);

        if (!svgMatch) {
            console.error("AI vÃ¡lasz:", responseText);
            return res.status(500).json({ error: "Az AI nem tudott SVG kÃ©pet generÃ¡lni. PrÃ³bÃ¡ld meg Ãºjra!" });
        }

        res.json({ svg: svgMatch[0] });

    } catch (error) {
        console.error("Garden generÃ¡lÃ¡s hiba:", error);
        res.status(500).json({ error: `Hiba: ${error.message}` });
    }
});


app.post("/api/generate-photorealistic-garden", authenticateToken, async (req, res) => {
    try {
        const { selectedPlantIds, referenceGardenPhoto, gardenStyle, designPreferences, variationCount } = req.body || {};
        const plannerImageModelName =
            normalizeOptionValue(process.env.PLANNER_IMAGE_MODEL) || "gemini-3.1-flash-image-preview";

        if (!selectedPlantIds || selectedPlantIds.length === 0) {
            return res.status(400).json({ error: "Nincsenek novenyek kivalasztva!" });
        }

        const googleGenAIConfigError = getGoogleGenAIConfigError();
        if (googleGenAIConfigError) {
            return res.status(500).json({ error: googleGenAIConfigError });
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

        const uploadedGardenPhoto =
            referenceGardenPhoto &&
            typeof referenceGardenPhoto === "object" &&
            typeof referenceGardenPhoto.data === "string" &&
            typeof referenceGardenPhoto.mimeType === "string"
                ? referenceGardenPhoto
                : null;
        const maxSelectedPlantCount = 10;

        if (selectedPlantIds.length > maxSelectedPlantCount) {
            return res.status(400).json({
                error: `Planner generation supports up to ${maxSelectedPlantCount} selected plants.`,
            });
        }
        const requestedVariationCount = Math.min(
            3,
            Math.max(1, Number.parseInt(String(variationCount || 1), 10) || 1)
        );
        const variationPrompts = [
            "Variation direction: balanced and straightforward home-garden composition.",
            "Variation direction: slightly different planting layout with a fresh visual arrangement.",
            "Variation direction: an alternative but still realistic composition using the same selected plants.",
        ];
        let lastError = null;
        const generatedImages = [];
        const ai = createGoogleGenAIClient();
        let uploadedGardenPhotoPart = null;

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

        console.log(
            `\nGemini planner image generation started for plants: ${orderedPlants
                .map((plant) => getPlantDisplayName(plant))
                .join(", ")} | model: ${plannerImageModelName} | reference images: ${referenceParts.length / 2} | uploaded garden photo: ${uploadedGardenPhotoPart ? "yes" : "no"} | variations: ${requestedVariationCount}`
        );

        for (let variationIndex = 0; variationIndex < requestedVariationCount; variationIndex += 1) {
            let base64Image = null;
            let mimeType = "image/png";

            for (const prompt of promptVariants) {
                const promptWithVariation = `${prompt}\n\n${variationPrompts[variationIndex] || variationPrompts[0]}`;

                for (let attempt = 1; attempt <= 2; attempt += 1) {
                    try {
                        const response = await ai.models.generateContent({
                            model: plannerImageModelName,
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

        const googleGenAIConfigError = getGoogleGenAIConfigError();
        if (googleGenAIConfigError) {
            return res.status(500).json({ error: googleGenAIConfigError });
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

        const ai = createGoogleGenAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
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

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
