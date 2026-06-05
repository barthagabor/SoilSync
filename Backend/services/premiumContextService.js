import User from "../models/User.js";
import Plant from "../models/Plant.js";

export const normalizeText = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

const escapeRegexLiteral = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const STOP_WORDS = new Set([
    "the",
    "and",
    "that",
    "with",
    "this",
    "have",
    "from",
    "into",
    "your",
    "about",
    "there",
    "their",
    "would",
    "could",
    "should",
    "what",
    "which",
    "does",
    "tell",
    "show",
    "selected",
    "context",
    "garden",
    "plants",
    "plant",
]);

export const getPrimaryScientificName = (plant) => {
    if (Array.isArray(plant?.scientific_name) && plant.scientific_name.length > 0) {
        return normalizeText(plant.scientific_name[0]);
    }

    return normalizeText(plant?.scientific_name);
};

const getPlantImage = (plant) =>
    plant?.default_image?.regular_url ||
    plant?.default_image?.medium_url ||
    plant?.default_image?.small_url ||
    plant?.default_image?.thumbnail ||
    "";

export const summarizePlant = (plant) => ({
    id: Number(plant?.id),
    commonName: normalizeText(plant?.common_name) || "Unknown plant",
    scientificName: getPrimaryScientificName(plant),
    type: normalizeText(plant?.details?.type || plant?.type),
    cycle: normalizeText(plant?.details?.cycle || plant?.cycle),
    watering: normalizeText(plant?.details?.watering || plant?.watering),
    careLevel: normalizeText(plant?.details?.care_level),
    sunlight: Array.isArray(plant?.details?.sunlight || plant?.sunlight)
        ? (plant.details?.sunlight || plant.sunlight).map((item) => normalizeText(item)).filter(Boolean)
        : [],
    soil: Array.isArray(plant?.details?.soil)
        ? plant.details.soil.map((item) => normalizeText(item)).filter(Boolean)
        : [],
    origin: Array.isArray(plant?.details?.origin)
        ? plant.details.origin.map((item) => normalizeText(item)).filter(Boolean)
        : [],
    hardiness: plant?.details?.hardiness || null,
    image: getPlantImage(plant),
    description: normalizeText(plant?.details?.description),
});

const summarizeSavedGarden = (garden) => ({
    title: normalizeText(garden?.title) || "Saved Garden",
    gardenStyle: normalizeText(garden?.gardenStyle),
    savedAt: garden?.savedAt ? new Date(garden.savedAt).toISOString() : null,
    plantCount: Array.isArray(garden?.plants) ? garden.plants.length : 0,
    plants: Array.isArray(garden?.plants)
        ? garden.plants.slice(0, 8).map((plant) => ({
              plantId: Number.isFinite(Number(plant?.plantId)) ? Number(plant.plantId) : null,
              commonName: normalizeText(plant?.commonName),
              scientificName: normalizeText(plant?.scientificName),
          }))
        : [],
});

const buildUserProfileSummary = (user) => ({
    id: String(user?._id || ""),
    name: normalizeText(user?.name) || "Unknown user",
    email: normalizeText(user?.email),
    location: normalizeText(user?.location),
    role: normalizeText(user?.role) || "Gardener",
    subscriptionPlan: normalizeText(user?.subscriptionPlan) || "free",
    premiumStatus: normalizeText(user?.premiumStatus) || "inactive",
    favouritesCount: Array.isArray(user?.favourites) ? user.favourites.length : 0,
    savedGardensCount: Array.isArray(user?.savedGardens) ? user.savedGardens.length : 0,
});

const buildMessageTerms = (message) => {
    const text = normalizeText(message).toLowerCase();
    if (!text) return [];

    const quoted = [...text.matchAll(/"([^"]+)"|'([^']+)'/g)]
        .map((match) => normalizeText(match[1] || match[2]))
        .filter(Boolean);

    const tokens = text
        .split(/[^a-z0-9-]+/i)
        .map((token) => normalizeText(token))
        .filter((token) => token.length >= 4 && !STOP_WORDS.has(token.toLowerCase()));

    return [...new Set([...quoted, ...tokens])].slice(0, 8);
};

const fetchPlantsByIds = async (ids) => {
    const numericIds = ids
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);

    if (!numericIds.length) return [];

    const plants = await Plant.find({ id: { $in: numericIds } }).lean();
    const plantMap = new Map(plants.map((plant) => [Number(plant.id), summarizePlant(plant)]));
    return numericIds.map((id) => plantMap.get(id)).filter(Boolean);
};

const searchPlantsByMessageTerms = async (terms, excludedIds = []) => {
    const safeTerms = Array.isArray(terms) ? terms.filter(Boolean) : [];
    if (!safeTerms.length) return [];

    const regexes = safeTerms.map((term) => new RegExp(escapeRegexLiteral(term), "i"));
    const plants = await Plant.find({
        id: { $nin: excludedIds },
        $or: regexes.flatMap((regex) => [
            { common_name: regex },
            { scientific_name: regex },
            { other_name: regex },
            { genus: regex },
            { family: regex },
            { "details.type": regex },
            { "details.origin": regex },
        ]),
    })
        .limit(6)
        .lean();

    return plants.map(summarizePlant);
};

export const buildPremiumAssistantContext = async ({
    userId,
    message = "",
    selectedPlantIds = [],
    includeFavourites = true,
    includeSavedGardens = true,
}) => {
    const user = await User.findById(userId)
        .select(
            "name email location role subscriptionPlan premiumStatus favourites savedGardens.title savedGardens.gardenStyle savedGardens.savedAt savedGardens.plants"
        )
        .lean();

    if (!user) {
        throw new Error("User not found.");
    }

    const explicitSelectedIds = [...new Set(
        (Array.isArray(selectedPlantIds) ? selectedPlantIds : [])
            .map((rawId) => Number(rawId))
            .filter((plantId) => Number.isFinite(plantId) && plantId > 0)
    )].slice(0, 8);

    const favouriteIds = includeFavourites
        ? (Array.isArray(user.favourites) ? user.favourites : [])
              .map((rawId) => Number(rawId))
              .filter((plantId) => Number.isFinite(plantId) && plantId > 0 && !explicitSelectedIds.includes(plantId))
              .slice(0, 10)
        : [];

    const selectedPlants = await fetchPlantsByIds(explicitSelectedIds);
    const favouritePlants = await fetchPlantsByIds(favouriteIds);

    const excludedIds = [...new Set([...explicitSelectedIds, ...favouriteIds])];
    const messageTerms = buildMessageTerms(message);
    const messageMatchedPlants = await searchPlantsByMessageTerms(messageTerms, excludedIds);

    return {
        userProfile: buildUserProfileSummary(user),
        selectedPlants,
        favouritePlants,
        messageMatchedPlants,
        savedGardens: includeSavedGardens
            ? (Array.isArray(user.savedGardens) ? user.savedGardens.slice(0, 5).map(summarizeSavedGarden) : [])
            : [],
    };
};

export const formatPremiumContextForPrompt = (context) => {
    const profile = context?.userProfile || {};
    const selectedPlants = Array.isArray(context?.selectedPlants) ? context.selectedPlants : [];
    const favouritePlants = Array.isArray(context?.favouritePlants) ? context.favouritePlants : [];
    const messageMatchedPlants = Array.isArray(context?.messageMatchedPlants) ? context.messageMatchedPlants : [];
    const gardens = Array.isArray(context?.savedGardens) ? context.savedGardens : [];

    const profileLines = [
        `Name: ${profile.name || "Unknown"}`,
        `Location: ${profile.location || "Not provided"}`,
        `Gardener role label: ${profile.role || "Gardener"}`,
        `Subscription: ${profile.subscriptionPlan || "free"} (${profile.premiumStatus || "inactive"})`,
        `Favourite plant count: ${profile.favouritesCount || 0}`,
        `Saved garden count: ${profile.savedGardensCount || 0}`,
    ];

    const plantLines = (plants) =>
        plants.length
            ? plants.map((plant) => {
                  const sunlight = Array.isArray(plant.sunlight) && plant.sunlight.length ? plant.sunlight.join(", ") : "unknown";
                  const soil = Array.isArray(plant.soil) && plant.soil.length ? plant.soil.join(", ") : "unknown";
                  const origin = Array.isArray(plant.origin) && plant.origin.length ? plant.origin.join(", ") : "unknown";
                  const hardiness =
                      plant.hardiness && (plant.hardiness.min || plant.hardiness.max)
                          ? `${plant.hardiness.min || "?"} to ${plant.hardiness.max || "?"}`
                          : "unknown";

                  return [
                      `Plant #${plant.id}: ${plant.commonName}${plant.scientificName ? ` (${plant.scientificName})` : ""}`,
                      `  type=${plant.type || "unknown"} | cycle=${plant.cycle || "unknown"} | watering=${plant.watering || "unknown"} | care=${plant.careLevel || "unknown"}`,
                      `  sunlight=${sunlight} | soil=${soil} | origin=${origin} | hardiness=${hardiness}`,
                      plant.description ? `  description=${plant.description}` : "",
                  ]
                      .filter(Boolean)
                      .join("\n");
              })
            : ["None."];

    const gardenLines = gardens.length
        ? gardens.map((garden) => {
              const plantSummary = Array.isArray(garden.plants) && garden.plants.length
                  ? garden.plants
                        .map((plant) => plant.commonName || plant.scientificName || `Plant ${plant.plantId || ""}`.trim())
                        .filter(Boolean)
                        .join(", ")
                  : "No stored plant list";

              return `Saved garden: ${garden.title} | style=${garden.gardenStyle || "unknown"} | plants=${garden.plantCount} | recent=${garden.savedAt || "unknown"} | selection=${plantSummary}`;
          })
        : ["None."];

    return [
        "USER PROFILE",
        ...profileLines,
        "",
        "SELECTED CONTEXT PLANTS (HIGHEST PRIORITY)",
        ...plantLines(selectedPlants),
        "",
        "FAVOURITE PLANTS",
        ...plantLines(favouritePlants),
        "",
        "MESSAGE-MATCHED DATABASE PLANTS",
        ...plantLines(messageMatchedPlants),
        "",
        "SAVED GARDEN CONTEXT",
        ...gardenLines,
    ].join("\n");
};
