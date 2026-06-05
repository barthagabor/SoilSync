import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Plant from "../models/Plant.js";
import CommunityPost from "../models/CommunityPost.js";
import CommunityComment from "../models/CommunityComment.js";
import { ensureCommunityIdentity } from "../services/communityIdentityService.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";
const DEFAULT_PASSWORD = "Garden123!";
const MIN_DEMO_SAVED_GARDENS = 3;

const DEMO_USERS = [
    {
        name: "Andreea Popescu",
        email: "andreea.community@soilsync.local",
        location: "Cluj-Napoca, Romania",
        bio: "Courtyard gardener focused on realistic Mediterranean planting, dry summer care, and cleaner maintenance routines.",
        subscriptionPlan: "premium",
        premiumStatus: "active",
        systemRole: "user",
    },
    {
        name: "Marton Kovacs",
        email: "marton.community@soilsync.local",
        location: "Targu Mures, Romania",
        bio: "Small-space gardener who shares pet-safe combinations, compact front-yard ideas, and low-fuss layouts.",
        subscriptionPlan: "premium",
        premiumStatus: "active",
        systemRole: "admin",
    },
    {
        name: "Elena Marin",
        email: "elena.community@soilsync.local",
        location: "Constanta, Romania",
        bio: "Warm-climate gardener interested in terrace planting, sun-tolerant species, and Mediterranean mood with real-world constraints.",
        subscriptionPlan: "free",
        premiumStatus: "inactive",
        systemRole: "user",
    },
    {
        name: "Luca Bianchi",
        email: "luca.community@soilsync.local",
        location: "Trieste, Italy",
        bio: "Design-minded gardener who keeps refining planner outputs until they feel buildable, calm, and worth maintaining.",
        subscriptionPlan: "premium",
        premiumStatus: "active",
        systemRole: "user",
    },
    {
        name: "Sofia Dobre",
        email: "sofia.community@soilsync.local",
        location: "Brasov, Romania",
        bio: "Likes seasonal local notes, plant-health observations, and practical explanations that home gardeners can trust.",
        subscriptionPlan: "premium",
        premiumStatus: "active",
        systemRole: "superadmin",
    },
    {
        name: "Nora Keller",
        email: "nora.community@soilsync.local",
        location: "Munich, Germany",
        bio: "Community-oriented gardener interested in structure, perennial rhythm, and how gardens age through the season.",
        subscriptionPlan: "free",
        premiumStatus: "inactive",
        systemRole: "user",
    },
];

const POST_BLUEPRINTS = [
    {
        type: "discussion",
        title: "Do you keep planner outputs aspirational first, or realistic from the start?",
        body: "I still like using the planner for mood and spatial direction first, then I scale the result back into something I would actually build. Curious whether others start from a realistic maintenance budget immediately or allow the first iteration to stay a bit more ambitious.",
        tags: ["planner", "budget", "design"],
        region: "Romania & Central Europe",
        isLocal: false,
        plantIndexes: [0, 1, 2],
    },
    {
        type: "discussion",
        title: "What usually improves a garden concept more: fewer species or better spacing?",
        body: "When I revisit saved concepts, the biggest gains usually come from reducing the species count and repeating stronger forms. But I know some people get more improvement from adjusting spacing alone. Interested in what makes the biggest difference for other SoilSync users.",
        tags: ["design", "realism", "planner-share"],
        region: "Cluj-Napoca, Romania",
        isLocal: false,
        plantIndexes: [3, 4, 5],
    },
    {
        type: "discussion",
        title: "How much local climate should influence the aesthetic direction of a garden?",
        body: "I love the look of warmer Mediterranean palettes, but the local climate where I work does not always reward forcing that look too literally. I would rather adapt the mood than fight the site. How far do you usually go before aesthetic intent becomes impractical?",
        tags: ["local-notes", "design", "mediterranean"],
        region: "Constanta, Romania",
        isLocal: false,
        plantIndexes: [6, 7, 8],
    },
    {
        type: "discussion",
        title: "Do you save multiple concept versions, or prefer refining just one?",
        body: "I am starting to think that keeping three to four versions of a concept is healthier than over-attaching to the first one. It makes tradeoffs much easier to see. Interested whether others compare variations side by side or mostly keep iterating a single saved garden.",
        tags: ["planner-share", "workflow", "design"],
        region: "Trieste, Italy",
        isLocal: false,
        plantIndexes: [9, 10, 11],
    },
    {
        type: "discussion",
        title: "At what point do you stop adding accents and call the layout finished?",
        body: "I notice that many layouts look strongest one decision before the final accent plant. After that, the composition can become noisy fast. Curious how others decide that the design already has enough rhythm and does not need one more color or shape.",
        tags: ["design", "restraint", "progress"],
        region: "Brasov, Romania",
        isLocal: false,
        plantIndexes: [12, 13, 14],
    },
    {
        type: "question",
        title: "Pet-safe planting ideas for a sunny entry with medium watering?",
        body: "I have a bright entry area and a dog that inspects everything. I need plant suggestions that stay visually clean, can handle sun, and will not become high maintenance halfway through summer. If you already tested a combination like this in real life, I would love specific recommendations.",
        tags: ["pet-safe", "front-yard", "zone-6"],
        region: "Targu Mures, Romania",
        isLocal: false,
        plantIndexes: [0, 4, 8],
        solved: true,
        solvedByOffset: 4,
    },
    {
        type: "question",
        title: "Would you use Japanese maple in a calmer gravel courtyard in Zone 7?",
        body: "The planner keeps surfacing Japanese maple for one of my calmer courtyard concepts, and aesthetically it makes sense. My hesitation is long-term maintenance and whether it becomes too precious compared with the rest of the layout. Would you keep it, or swap it for something sturdier?",
        tags: ["design", "gravel", "japanese-maple"],
        region: "Munich, Germany",
        isLocal: false,
        plantIndexes: [2, 9, 11],
        solved: true,
        solvedByOffset: 1,
    },
    {
        type: "question",
        title: "How do you keep a planner concept realistic when the site is smaller than the render suggests?",
        body: "I often like the overall direction of a generated concept, but the actual site ends up being much tighter once I stand in it. Do you usually reduce plant count first, shrink canopy expectations, or just rethink the circulation pattern entirely? I am looking for the cleanest reduction strategy.",
        tags: ["planner-share", "small-space", "realism"],
        region: "London, United-Kingdom",
        isLocal: false,
        plantIndexes: [5, 6, 10],
        solved: false,
    },
    {
        type: "question",
        title: "Best way to attach local notes to pest observations without alarming everyone?",
        body: "I want to post more local plant-health notes, but I do not want every warning to sound like a disaster. How do you phrase pest awareness posts in a way that is useful and calm instead of dramatic? Examples from your own community writing would help.",
        tags: ["plant-health", "local-notes", "discussion"],
        region: "Brasov, Romania",
        isLocal: true,
        plantIndexes: [3, 7, 12],
        solved: true,
        solvedByOffset: 0,
    },
    {
        type: "question",
        title: "Would you mark a post as local if the issue is regional but not city-specific?",
        body: "Sometimes I notice broader seasonal patterns that apply to several nearby regions, not just my own city. In that case, do you still treat the post as local, or would you frame it more like a general observation with regional context? I am trying to keep community categorization clean.",
        tags: ["local-notes", "workflow", "community"],
        region: "Romania & Central Europe",
        isLocal: true,
        plantIndexes: [1, 6, 14],
        solved: false,
    },
    {
        type: "plant-tip",
        title: "If a concept looks too busy, reduce species before changing the whole style",
        body: "The fastest way I improve an overworked concept is by reducing species count and repeating fewer structural forms. The style usually does not need to change. More often, the idea was fine and only the plant palette was too crowded to read clearly in a real garden.",
        tags: ["design-tip", "planner-share", "realism"],
        region: "Trieste, Italy",
        isLocal: false,
        plantIndexes: [2, 5, 8],
    },
    {
        type: "plant-tip",
        title: "Check maintenance rhythm, not just maintenance level",
        body: "Two plants may both look moderate-care on paper, but the real problem is when their care rhythm peaks at the same time. I try to spread maintenance pressure across the season instead of only chasing low-care labels. That makes the garden feel more manageable in practice.",
        tags: ["maintenance", "plant-tip", "workflow"],
        region: "Munich, Germany",
        isLocal: false,
        plantIndexes: [0, 6, 9],
    },
    {
        type: "plant-tip",
        title: "Use repeated shrubs to calm a mixed perennial bed",
        body: "When a perennial-heavy bed feels visually noisy, a repeated shrub or evergreen shape can stabilize the whole composition. It gives the eye somewhere to rest and makes color accents feel intentional instead of scattered. I rely on this especially in medium-sized entry gardens.",
        tags: ["design", "structure", "plant-tip"],
        region: "Cluj-Napoca, Romania",
        isLocal: false,
        plantIndexes: [4, 10, 13],
    },
    {
        type: "plant-tip",
        title: "Treat planner images as composition guides, not shopping lists",
        body: "The image can be excellent for understanding atmosphere, spacing, and hierarchy, but it should not automatically become a one-to-one planting list. I use the render to understand the feeling, then I rebuild the actual palette with fewer, stronger choices.",
        tags: ["planner-share", "workflow", "design"],
        region: "London, United-Kingdom",
        isLocal: false,
        plantIndexes: [1, 7, 11],
    },
    {
        type: "plant-tip",
        title: "If the site is exposed, leave more visual breathing room than the render suggests",
        body: "Open and windy sites often make dense concepts feel cluttered faster than sheltered courtyards do. Leaving more void, wider gravel zones, or cleaner path edges usually makes the final result feel stronger outdoors. The screen can tolerate density that the site cannot.",
        tags: ["progress", "gravel", "plant-tip"],
        region: "Constanta, Romania",
        isLocal: true,
        plantIndexes: [3, 9, 14],
    },
    {
        type: "garden-showcase",
        title: "Shared a Mediterranean courtyard concept after simplifying it for real maintenance",
        body: "I kept the main stone path and the warm planting mood, but reduced the palette to a tighter set of species and larger planting blocks. It still feels close to the planner version, only far more realistic for a home courtyard that has to survive summer without constant intervention.",
        tags: ["planner-share", "mediterranean", "low-water"],
        region: "Cluj-Napoca, Romania",
        isLocal: false,
        plantIndexes: [0, 1, 7],
        gardenKey: 0,
    },
    {
        type: "garden-showcase",
        title: "A calmer modern minimal entry worked better once I removed the decorative filler",
        body: "The initial concept had the right mood, but too many small accents competing near the path. I removed the decorative filler, widened the structural moves, and kept only the shapes that helped the entry read clearly from a distance. The result finally feels composed instead of just styled.",
        tags: ["planner-share", "modern-minimal", "design"],
        region: "Munich, Germany",
        isLocal: false,
        plantIndexes: [3, 8, 10],
        gardenKey: 1,
    },
    {
        type: "garden-showcase",
        title: "Japanese-style courtyard concept now feels quieter after spacing adjustments",
        body: "I did not change the whole palette, only the spacing and the amount of gravel breathing room. That alone made the garden feel calmer and less decorative. It is a good reminder that harmony sometimes comes from restraint rather than adding more Japanese-style cues.",
        tags: ["planner-share", "japanese-zen", "design"],
        region: "Trieste, Italy",
        isLocal: false,
        plantIndexes: [2, 5, 9],
        gardenKey: 2,
    },
    {
        type: "garden-showcase",
        title: "Shared a dry stone-and-gravel walk concept that survived the first hot stretch well",
        body: "This one was built around making the path and voids do more of the work, so the plants did not need to carry the whole visual load. After the first hotter spell, the composition still looked stable and legible. That reinforced my preference for fewer stronger moves.",
        tags: ["planner-share", "stone-gravel", "low-water"],
        region: "Brasov, Romania",
        isLocal: false,
        plantIndexes: [4, 6, 11],
        gardenKey: 3,
    },
    {
        type: "garden-showcase",
        title: "A flowering courtyard concept finally felt real once I matched bloom intensity to maintenance",
        body: "I used to chase richer flower color everywhere, but that usually increased upkeep in ways the site could not support. This version keeps a softer bloom rhythm and lets the structure carry more of the scene. It feels less dramatic on screen, but much more believable as a lived garden.",
        tags: ["planner-share", "flowering-cottage", "realism"],
        region: "London, United-Kingdom",
        isLocal: false,
        plantIndexes: [5, 12, 13],
        gardenKey: 4,
    },
    {
        type: "progress-update",
        title: "Before and after: reducing the species count made the gravel court feel intentional",
        body: "The earlier version had more visual excitement, but the composition lacked calm and maintenance clarity. After removing several accent plants and repeating the stronger forms, the space finally started to feel like a coherent courtyard rather than a collection of good individual choices.",
        tags: ["before-after", "gravel", "progress"],
        region: "Brasov, Romania",
        isLocal: false,
        plantIndexes: [4, 7, 10],
        beforeGardenKey: 5,
        afterGardenKey: 3,
        gardenKey: 3,
    },
    {
        type: "progress-update",
        title: "The entry garden improved once I widened the circulation and simplified the edges",
        body: "Most of the improvement came from clarifying movement through the space. Once the path edges became cleaner and the planting stopped pressing into every corner, the garden looked more expensive and calmer without needing any dramatic plant swap.",
        tags: ["progress", "entry-garden", "design"],
        region: "Munich, Germany",
        isLocal: false,
        plantIndexes: [3, 8, 11],
        beforeGardenKey: 6,
        afterGardenKey: 1,
        gardenKey: 1,
    },
    {
        type: "progress-update",
        title: "A warm courtyard layout got stronger after I repeated the same shrub forms",
        body: "Instead of introducing more variety, I repeated the shrub structure and let the flowering accents become supporting notes. The garden now reads much more confidently from the seating area and feels easier to maintain because the decisions are more disciplined.",
        tags: ["progress", "mediterranean", "structure"],
        region: "Constanta, Romania",
        isLocal: false,
        plantIndexes: [0, 6, 12],
        beforeGardenKey: 7,
        afterGardenKey: 0,
        gardenKey: 0,
    },
    {
        type: "progress-update",
        title: "Removing one ornamental tree made the whole concept feel more balanced",
        body: "I was reluctant to simplify at first because every individual feature looked attractive. But once I removed one ornamental tree and gave the remaining forms more room, the scene stopped competing with itself. It became the same idea, only easier to understand and live with.",
        tags: ["progress", "restraint", "realism"],
        region: "Cluj-Napoca, Romania",
        isLocal: false,
        plantIndexes: [2, 8, 13],
        beforeGardenKey: 4,
        afterGardenKey: 2,
        gardenKey: 2,
    },
    {
        type: "progress-update",
        title: "The planner concept felt better once I adapted it to the actual slope of the site",
        body: "The render flattened the feeling of the place more than I realized. After adapting the spacing and the planting sequence to the real slope, the garden felt much less forced. It is still recognizably the same concept, but now it sits in the site instead of fighting it.",
        tags: ["progress", "site-fit", "planner-share"],
        region: "Targu Mures, Romania",
        isLocal: false,
        plantIndexes: [1, 5, 14],
        beforeGardenKey: 2,
        afterGardenKey: 8,
        gardenKey: 8,
    },
    {
        type: "local-note",
        title: "Cluj area note: soil stayed colder longer than usual this spring",
        body: "Several gardens around me still feel a bit behind even when sunlight looks adequate. If herbs or sun-loving perennials seem stalled, I would check soil warmth and drainage first before overcorrecting with fertilizer or extra watering. The delay feels more climatic than nutritional right now.",
        tags: ["local", "cluj", "spring-soil"],
        region: "Cluj-Napoca, Romania",
        isLocal: true,
        plantIndexes: [0, 1, 7],
    },
    {
        type: "local-note",
        title: "Dobrogea note: exposed sites are drying faster than the planner mood suggests",
        body: "Some of the softer lush concepts can still work here, but exposed sites are burning through moisture faster than the image implies. I would either simplify the palette or widen the structural voids so the maintenance load stays realistic once the heat settles in.",
        tags: ["local", "dobrogea", "summer-prep"],
        region: "Constanta, Romania",
        isLocal: true,
        plantIndexes: [4, 6, 11],
    },
    {
        type: "local-note",
        title: "Brasov gardeners: cool nights are still affecting new planting momentum",
        body: "If fresh planting feels slower than expected, the issue may be night temperature rather than site failure. I would stay patient before redesigning the whole palette. Some layouts only look underwhelming for a short stretch before the season catches up properly.",
        tags: ["local", "brasov", "seasonal-note"],
        region: "Brasov, Romania",
        isLocal: true,
        plantIndexes: [2, 9, 12],
    },
    {
        type: "local-note",
        title: "Munich note: sheltered courtyards are advancing faster than open front gardens",
        body: "I am seeing a clear difference between protected inner courtyards and exposed street-facing gardens. If your front layout still feels behind, I would compare it to the site exposure before assuming the plant choice itself is the problem. Microclimate is doing real work right now.",
        tags: ["local", "munich", "microclimate"],
        region: "Munich, Germany",
        isLocal: true,
        plantIndexes: [3, 10, 13],
    },
    {
        type: "local-note",
        title: "London-style dampness note: watch circulation in dense planting blocks",
        body: "Where conditions stay damp and still for longer, dense massing that looked beautiful in the render can become harder to keep clean and healthy. I am not against layered planting, but I would leave more circulation and airflow than a purely visual concept might suggest.",
        tags: ["local", "humidity", "airflow"],
        region: "London, United-Kingdom",
        isLocal: true,
        plantIndexes: [5, 8, 14],
    },
    {
        type: "pest-alert",
        title: "Watch dogwood foliage closely after this damp spell",
        body: "Not every garden will have an issue, but several recent conditions line up with the kind of stress that makes dogwood foliage start looking rough quickly. I would check airflow first, remove obviously damaged material, and avoid escalating to panic before you confirm the pattern.",
        tags: ["plant-health", "dogwood", "humidity"],
        region: "Brasov, Romania",
        isLocal: true,
        plantIndexes: [4, 10, 12],
    },
    {
        type: "pest-alert",
        title: "Mediterranean herbs are looking uneven where drainage stayed too slow",
        body: "Some rosemary and thyme combinations are not failing because of drought but because the drainage pattern stayed weaker than expected. If the bed still holds moisture longer than the visual concept suggested, I would solve that before blaming the species themselves.",
        tags: ["plant-health", "rosemary", "thyme"],
        region: "Cluj-Napoca, Romania",
        isLocal: true,
        plantIndexes: [0, 1, 7],
    },
    {
        type: "pest-alert",
        title: "Early magnolia leaf stress is showing up more in exposed paved entries",
        body: "I am noticing stress patterns more in hard-edged, reflective entry spaces than in softer garden interiors. The issue may not be a direct pest problem in every case, but the exposure is clearly amplifying plant pressure. Worth checking before the symptom spreads further.",
        tags: ["plant-health", "magnolia", "entry-garden"],
        region: "Munich, Germany",
        isLocal: true,
        plantIndexes: [3, 8, 11],
    },
    {
        type: "pest-alert",
        title: "Lavender blocks are fine overall, but crowded bases are trapping too much humidity",
        body: "The flowers may still look attractive from a distance, but the lower structure can stay wetter than it should if spacing collapsed over time. I would rather thin a block early than wait for visible decline later. This is mostly a maintenance-spacing issue, not a reason to abandon the planting style.",
        tags: ["plant-health", "lavender", "maintenance"],
        region: "Constanta, Romania",
        isLocal: true,
        plantIndexes: [0, 6, 13],
    },
    {
        type: "pest-alert",
        title: "Keep an eye on iris clumps where air movement is poor",
        body: "I am not seeing widespread failure, but I am seeing enough weak pockets to justify a calm warning. If the clumps are packed tightly near hard edges or enclosed corners, I would inspect early and improve airflow before assuming the whole planting needs replacement.",
        tags: ["plant-health", "iris", "airflow"],
        region: "Trieste, Italy",
        isLocal: true,
        plantIndexes: [2, 8, 14],
    },
];

const COMMENT_BANK = {
    discussion: [
        "I usually keep the first version aspirational, then reduce the palette once I understand the mood I actually want to preserve.",
        "For me spacing matters first, but fewer species makes the spacing decisions easier to read and maintain.",
        "Local climate always edits the concept in the end, even when the inspiration starts somewhere warmer or calmer.",
    ],
    question: [
        "I would keep the recommendation list short and test the maintenance rhythm before adding more accents.",
        "The safest choice is usually the one that still looks convincing after you remove a third of the planting.",
        "If the site conditions are pushing back, I would trust the site and adjust the concept rather than forcing the first render.",
    ],
    "plant-tip": [
        "This is a really good rule of thumb and it matches what I keep seeing in real gardens too.",
        "Completely agree. The render often survives simplification better than people expect.",
        "That maintenance-rhythm point is underrated. Timing matters as much as difficulty.",
    ],
    "garden-showcase": [
        "This still keeps the original atmosphere, but it reads much more confidently now.",
        "The cleaner palette makes the whole concept look more expensive and more believable.",
        "Really good example of using the planner as a starting point instead of treating it like a fixed blueprint.",
    ],
    "progress-update": [
        "The after version feels calmer immediately. The extra space helped more than another plant would have.",
        "Great example of why subtraction can improve both maintenance and visual clarity.",
        "The circulation change is subtle, but it probably did as much work as the planting edits.",
    ],
    "local-note": [
        "Seeing something similar here as well. Good reminder not to overreact too early.",
        "Helpful to hear this framed calmly instead of as a dramatic warning.",
        "This kind of local note is exactly what makes the community useful.",
    ],
    "pest-alert": [
        "Appreciate the measured tone here. It is useful without creating panic.",
        "I would also check spacing and airflow first before assuming the worst.",
        "Good catch. This kind of early note helps people inspect the right places sooner.",
    ],
};

const buildUsernameFromEmail = (email) =>
    String(email || "")
        .split("@")[0]
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .toLowerCase();

const normalizeText = (value) => String(value || "").trim();
const hasGardenImage = (garden) => Boolean(normalizeText(garden?.image));

const getValidSavedGardens = (user) =>
    Array.isArray(user?.savedGardens) ? user.savedGardens.filter((garden) => hasGardenImage(garden)) : [];

const cloneSavedGarden = (garden, index, ownerName) => ({
    title: normalizeText(garden.title) || `${ownerName} Saved Garden ${index + 1}`,
    image: normalizeText(garden.image),
    referenceImage: normalizeText(garden.referenceImage),
    usedReferencePhoto: Boolean(garden.usedReferencePhoto),
    gardenStyle: normalizeText(garden.gardenStyle) || "flowering_cottage",
    variationIndex: Number.isFinite(Number(garden.variationIndex)) ? Number(garden.variationIndex) : index,
    plants: Array.isArray(garden.plants)
        ? garden.plants.slice(0, 6).map((plant) => ({
              plantId: Number.isFinite(Number(plant?.plantId)) ? Number(plant.plantId) : null,
              commonName: normalizeText(plant?.commonName),
              scientificName: normalizeText(plant?.scientificName),
              image: normalizeText(plant?.image),
          }))
        : [],
    savedAt: new Date(Date.now() - (index + 1) * 86400000),
});

const toGardenTemplateSnapshot = (garden) => ({
    title: normalizeText(garden?.title),
    image: normalizeText(garden?.image),
    referenceImage: normalizeText(garden?.referenceImage),
    usedReferencePhoto: Boolean(garden?.usedReferencePhoto),
    gardenStyle: normalizeText(garden?.gardenStyle),
    variationIndex: Number.isFinite(Number(garden?.variationIndex)) ? Number(garden.variationIndex) : 0,
    plants: Array.isArray(garden?.plants)
        ? garden.plants.slice(0, 6).map((plant) => ({
              plantId: Number.isFinite(Number(plant?.plantId)) ? Number(plant.plantId) : null,
              commonName: normalizeText(plant?.commonName),
              scientificName: normalizeText(plant?.scientificName),
              image: normalizeText(plant?.image),
          }))
        : [],
});

const makeFallbackGarden = (title, style, image, plants = []) => ({
    title,
    image,
    referenceImage: "",
    usedReferencePhoto: false,
    gardenStyle: style,
    variationIndex: 0,
    plants: plants.map((plant) => ({
        plantId: Number.isFinite(Number(plant?.id)) ? Number(plant.id) : null,
        commonName: normalizeText(plant?.common_name),
        scientificName: normalizeText(Array.isArray(plant?.scientific_name) ? plant.scientific_name[0] : plant?.scientific_name),
        image:
            normalizeText(
                plant?.default_image?.regular_url ||
                    plant?.default_image?.original_url ||
                    plant?.default_image?.medium_url ||
                    plant?.default_image?.small_url
            ) || "",
    })),
    savedAt: new Date(),
});

const getPlantImage = (plant) =>
    normalizeText(
        plant?.default_image?.regular_url ||
            plant?.default_image?.original_url ||
            plant?.default_image?.medium_url ||
            plant?.default_image?.small_url ||
            plant?.default_image?.thumbnail
    );

const getPrimaryScientificName = (plant) =>
    normalizeText(Array.isArray(plant?.scientific_name) ? plant.scientific_name[0] : plant?.scientific_name);

const getPlantCategory = (plant) =>
    normalizeText(plant?.details?.type || plant?.type || plant?.category || "Plant") || "Plant";

const serializePlantSnapshot = (plant) => ({
    id: String(plant?.id || plant?._id || ""),
    plantId: Number.isFinite(Number(plant?.id)) ? Number(plant.id) : null,
    name: normalizeText(plant?.common_name) || getPrimaryScientificName(plant) || "Plant",
    latinName: getPrimaryScientificName(plant),
    category: getPlantCategory(plant),
    image: getPlantImage(plant),
});

const serializeSavedGardenSnapshot = (garden) => ({
    id: String(garden?._id || ""),
    title: normalizeText(garden?.title) || "Saved Garden",
    style: normalizeText(garden?.gardenStyle) || "flowering_cottage",
    image: normalizeText(garden?.image),
    note: "Shared from the SoilSync planner.",
    plants: Array.isArray(garden?.plants)
        ? garden.plants
              .map((plant) => normalizeText(plant?.commonName || plant?.scientificName))
              .filter(Boolean)
              .slice(0, 6)
        : [],
});

const getLikeUsers = (allUsers, seedIndex) => {
    const sample = [];
    const likeTarget = 1 + (seedIndex % Math.min(4, allUsers.length || 1));

    for (let offset = 0; offset < likeTarget; offset += 1) {
        const user = allUsers[(seedIndex + offset) % allUsers.length];
        if (user && !sample.find((entry) => String(entry._id) === String(user._id))) {
            sample.push(user);
        }
    }

    return sample;
};

const getCommentBodies = (type) => COMMENT_BANK[type] || COMMENT_BANK.discussion;

const buildGardenPool = (users, plants) => {
    const savedGardenPool = users
        .flatMap((user) => (Array.isArray(user.savedGardens) ? user.savedGardens : []))
        .filter((garden) => normalizeText(garden?.image));

    if (savedGardenPool.length >= 9) {
        return savedGardenPool;
    }

    const fallbackGardens = [
        makeFallbackGarden("Mediterranean Courtyard", "mediterranean", getPlantImage(plants[0]), [plants[0], plants[1], plants[2]]),
        makeFallbackGarden("Modern Minimal Entry", "modern_minimal", getPlantImage(plants[3]), [plants[3], plants[4], plants[5]]),
        makeFallbackGarden("Japanese Calm Court", "japanese_zen", getPlantImage(plants[6]), [plants[6], plants[7], plants[8]]),
        makeFallbackGarden("Stone and Gravel Walk", "stone_gravel", getPlantImage(plants[9]), [plants[9], plants[10], plants[11]]),
        makeFallbackGarden("Flowering Courtyard", "flowering_cottage", getPlantImage(plants[12]), [plants[12], plants[13], plants[14]]),
        makeFallbackGarden("Dry Border Draft", "stone_gravel", getPlantImage(plants[15]), [plants[15], plants[16], plants[17]]),
        makeFallbackGarden("Entry Garden Draft", "modern_minimal", getPlantImage(plants[18]), [plants[18], plants[19], plants[20]]),
        makeFallbackGarden("Warm Courtyard Draft", "mediterranean", getPlantImage(plants[21]), [plants[21], plants[22], plants[23]]),
        makeFallbackGarden("Slope Garden Draft", "japanese_zen", getPlantImage(plants[24]), [plants[24], plants[25], plants[26]]),
    ].filter((garden) => normalizeText(garden.image));

    return [...savedGardenPool, ...fallbackGardens];
};

const buildOwnedSavedGardens = (templateGardens, seed, seedIndex) => {
    if (!Array.isArray(templateGardens) || !templateGardens.length) {
        return [];
    }

    return Array.from({ length: MIN_DEMO_SAVED_GARDENS }, (_, gardenIndex) => {
        const template = templateGardens[(seedIndex + gardenIndex * 2) % templateGardens.length];
        if (!template) return null;
        const snapshot = toGardenTemplateSnapshot(template);

        return cloneSavedGarden(
            {
                ...snapshot,
                title: `${seed.name.split(" ")[0]}'s ${snapshot.title || `Garden ${gardenIndex + 1}`}`,
            },
            gardenIndex,
            seed.name
        );
    }).filter((garden) => hasGardenImage(garden));
};

const ensureDemoUsers = async (gardenTemplates) => {
    const createdUsers = [];

    for (let index = 0; index < DEMO_USERS.length; index += 1) {
        const seed = DEMO_USERS[index];
        let user = await User.findOne({ email: seed.email });

        if (!user) {
            user = new User({
                name: seed.name,
                email: seed.email,
                password: DEFAULT_PASSWORD,
                verified: true,
            });
        }

        user.name = seed.name;
        user.verified = true;
        user.bio = seed.bio;
        user.location = seed.location;
        user.role = "Gardener";
        user.systemRole = seed.systemRole;
        user.subscriptionPlan = seed.subscriptionPlan;
        user.premiumStatus = seed.premiumStatus;
        user.communityUsername = buildUsernameFromEmail(seed.email);

        const existingOwnedGardens = getValidSavedGardens(user);
        if (existingOwnedGardens.length < MIN_DEMO_SAVED_GARDENS) {
            user.savedGardens = buildOwnedSavedGardens(gardenTemplates, seed, index);
            user.markModified("savedGardens");
        }

        await ensureCommunityIdentity(user);
        await user.save();
        createdUsers.push(user);
    }

    return createdUsers;
};

const resolveGardenFromPool = (gardenPool, requestedIndex) => {
    if (!Array.isArray(gardenPool) || !gardenPool.length || !Number.isInteger(requestedIndex)) {
        return null;
    }

    const normalizedIndex = ((requestedIndex % gardenPool.length) + gardenPool.length) % gardenPool.length;
    return gardenPool[normalizedIndex] || null;
};

const buildPostImages = (blueprint, gardenPool) => {
    const images = [];
    const beforeGarden = resolveGardenFromPool(gardenPool, blueprint.beforeGardenKey);
    const afterGarden = resolveGardenFromPool(gardenPool, blueprint.afterGardenKey);
    const mainGarden = resolveGardenFromPool(gardenPool, blueprint.gardenKey);

    if (beforeGarden) {
        images.push({
            id: `before-${blueprint.beforeGardenKey}`,
            src: normalizeText(beforeGarden.image),
            alt: `${blueprint.title} before`,
            isBefore: true,
            isAfter: false,
        });
    }

    if (afterGarden) {
        images.push({
            id: `after-${blueprint.afterGardenKey}`,
            src: normalizeText(afterGarden.image),
            alt: `${blueprint.title} after`,
            isBefore: false,
            isAfter: true,
        });
    }

    if (!images.length && mainGarden) {
        images.push({
            id: `garden-${blueprint.gardenKey}`,
            src: normalizeText(mainGarden.image),
            alt: blueprint.title,
            isBefore: false,
            isAfter: false,
        });
    }

    return images.filter((image) => normalizeText(image.src));
};

const buildPlantsForBlueprint = (plants, indexes = []) =>
    indexes
        .map((index) => plants[index])
        .filter(Boolean)
        .map(serializePlantSnapshot);

const blueprintNeedsGardenAssets = (blueprint) =>
    [blueprint.gardenKey, blueprint.beforeGardenKey, blueprint.afterGardenKey].some((value) => Number.isInteger(value));

const seedPostsAndComments = async (users, plants) => {
    let createdPosts = 0;
    let updatedPosts = 0;
    let createdComments = 0;
    const gardenCapableUsers = users.filter((user) => getValidSavedGardens(user).length);

    for (let index = 0; index < POST_BLUEPRINTS.length; index += 1) {
        const blueprint = POST_BLUEPRINTS[index];
        const authorSource =
            blueprintNeedsGardenAssets(blueprint) && gardenCapableUsers.length ? gardenCapableUsers : users;
        const author = authorSource[index % authorSource.length];
        const authorGardenPool = getValidSavedGardens(author);
        const solvedBy = blueprint.solved ? users[(index + (blueprint.solvedByOffset || 1)) % users.length] : null;
        const likes = getLikeUsers(users, index).map((user) => user._id);
        const resolvedSavedGarden = resolveGardenFromPool(authorGardenPool, blueprint.gardenKey);
        const savedGarden = resolvedSavedGarden ? serializeSavedGardenSnapshot(resolvedSavedGarden) : null;
        const images = buildPostImages(blueprint, authorGardenPool);
        const plantsForPost = buildPlantsForBlueprint(plants, blueprint.plantIndexes);
        const createdAt = new Date(Date.now() - (index * 11 + 3) * 3600000);

        let post = await CommunityPost.findOne({ title: blueprint.title });
        if (!post) {
            post = new CommunityPost();
            createdPosts += 1;
        } else {
            updatedPosts += 1;
        }

        post.type = blueprint.type;
        post.title = blueprint.title;
        post.body = blueprint.body;
        post.author = author._id;
        post.images = images;
        post.plants = plantsForPost;
        post.savedGarden = savedGarden;
        post.tags = blueprint.tags;
        post.region = blueprint.region;
        post.isLocal = Boolean(blueprint.isLocal);
        post.solved = Boolean(blueprint.solved);
        post.solvedBy = blueprint.solved ? solvedBy?._id || null : null;
        post.likes = likes;
        post.likesCount = likes.length;
        post.commentsCount = 0;
        post.createdAt = createdAt;
        post.updatedAt = new Date(createdAt.getTime() + 1800000);

        await post.save();

        await CommunityComment.deleteMany({ post: post._id });

        const commentBodies = getCommentBodies(blueprint.type);
        const commentCountTarget = blueprint.type === "discussion" || blueprint.type === "question" ? 3 : 2;
        const rootComments = [];

        for (let commentIndex = 0; commentIndex < commentCountTarget; commentIndex += 1) {
            const commenter = users[(index + commentIndex + 1) % users.length];
            const comment = await CommunityComment.create({
                post: post._id,
                author: commenter._id,
                body: commentBodies[commentIndex % commentBodies.length],
                likes: getLikeUsers(users, index + commentIndex + 20).map((user) => user._id),
                likesCount: getLikeUsers(users, index + commentIndex + 20).length,
                createdAt: new Date(createdAt.getTime() + (commentIndex + 1) * 3600000),
                updatedAt: new Date(createdAt.getTime() + (commentIndex + 1) * 3600000),
            });

            rootComments.push(comment);
            createdComments += 1;
        }

        if (rootComments.length && (blueprint.type === "question" || blueprint.type === "discussion")) {
            const replyAuthor = users[(index + 4) % users.length];
            const reply = await CommunityComment.create({
                post: post._id,
                author: replyAuthor._id,
                parentComment: rootComments[0]._id,
                body: "This is exactly the kind of tradeoff where site reality should probably win over the first render.",
                likes: getLikeUsers(users, index + 44).map((user) => user._id),
                likesCount: getLikeUsers(users, index + 44).length,
                createdAt: new Date(createdAt.getTime() + 5 * 3600000),
                updatedAt: new Date(createdAt.getTime() + 5 * 3600000),
            });

            if (reply) createdComments += 1;
        }

        post.commentsCount = await CommunityComment.countDocuments({ post: post._id });
        await post.save();
    }

    return {
        createdPosts,
        updatedPosts,
        createdComments,
    };
};

try {
    await mongoose.connect(MONGO_URI);

    const existingUsers = await User.find({})
        .select("name email savedGardens communityUsername verified bio location systemRole subscriptionPlan premiumStatus")
        .exec();

    for (const user of existingUsers) {
        await ensureCommunityIdentity(user, { save: true });
    }

    const plantPool = await Plant.find({
        common_name: { $exists: true, $ne: "" },
        "default_image.regular_url": { $exists: true, $ne: "" },
    })
        .sort({ common_name: 1 })
        .limit(80)
        .exec();

    if (plantPool.length < 30) {
        throw new Error("Not enough plant records with images were found to seed community content.");
    }

    const gardenTemplates = buildGardenPool(existingUsers, plantPool);
    if (!gardenTemplates.length) {
        throw new Error("No suitable saved-garden or fallback garden images were found for seeding.");
    }

    const demoUsers = await ensureDemoUsers(gardenTemplates);
    const allCommunityUsers = await User.find({
        email: {
            $in: [
                ...DEMO_USERS.map((entry) => entry.email),
                "barthagabor56@gmail.com",
                "soilsync.app@gmail.com",
            ],
        },
    })
        .select("name email savedGardens communityUsername verified bio location systemRole subscriptionPlan premiumStatus")
        .exec();

    const seedResult = await seedPostsAndComments(allCommunityUsers, plantPool);
    const totalPosts = await CommunityPost.countDocuments();
    const totalComments = await CommunityComment.countDocuments();

    console.log(
        JSON.stringify(
            {
                message: "Community demo data seeded successfully.",
                demoUsers: demoUsers.length,
                communityUsers: allCommunityUsers.length,
                createdPosts: seedResult.createdPosts,
                updatedPosts: seedResult.updatedPosts,
                createdComments: seedResult.createdComments,
                totalPosts,
                totalComments,
            },
            null,
            2
        )
    );

    await mongoose.disconnect();
} catch (error) {
    console.error("Failed to seed community demo data:", error);
    try {
        await mongoose.disconnect();
    } catch {
        // no-op
    }
    process.exit(1);
}
