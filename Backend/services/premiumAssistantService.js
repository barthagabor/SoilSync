import {
    buildPremiumAssistantContext,
    formatPremiumContextForPrompt,
    normalizeText,
} from "./premiumContextService.js";
import { createPartFromBase64 } from "@google/genai";
import {
    buildPlannerActionTool,
    buildRecommenderActionTool,
    reviewSavedGardensTool,
    runPlantCombinationTool,
    runPlantFilterTool,
} from "./premiumAssistantTools.js";
import { createGoogleGenAIClient, getGoogleGenAIConfigError } from "./googleGenAIClient.js";

const INTENT_VALUES = [
    "plant_filter",
    "recommender_run",
    "planner_generate",
    "saved_garden_review",
    "plant_combination_help",
    "general_chat",
];

const extractModelText = (response) =>
    (response?.candidates?.[0]?.content?.parts || [])
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .join("")
        .trim();

const parseJsonOutput = (rawText) => {
    const text = normalizeText(rawText);
    if (!text) return null;

    try {
        return JSON.parse(text);
    } catch {
        const arrayMatch = text.match(/\[[\s\S]*\]$/);
        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch {
                return null;
            }
        }

        const objectMatch = text.match(/\{[\s\S]*\}$/);
        if (!objectMatch) return null;

        try {
            return JSON.parse(objectMatch[0]);
        } catch {
            return null;
        }
    }
};

const buildConversationTranscript = (conversation = []) =>
    (Array.isArray(conversation) ? conversation : [])
        .slice(-8)
        .map((entry) => {
            const role = normalizeText(entry?.role).toLowerCase() === "assistant" ? "Assistant" : "User";
            const content = normalizeText(entry?.content);
            return content ? `${role}: ${content}` : "";
        })
        .filter(Boolean)
        .join("\n");

const buildContextSnapshotForIntentPrompt = (context) => {
    const selectedPlants = (context?.selectedPlants || [])
        .map((plant) => `${plant.commonName}${plant.scientificName ? ` (${plant.scientificName})` : ""}`)
        .slice(0, 8)
        .join(", ");
    const favouritePlants = (context?.favouritePlants || [])
        .map((plant) => plant.commonName || plant.scientificName)
        .slice(0, 8)
        .join(", ");
    const messageMatchedPlants = (context?.messageMatchedPlants || [])
        .map((plant) => plant.commonName || plant.scientificName)
        .slice(0, 8)
        .join(", ");

    return [
        `Selected context plants: ${selectedPlants || "none"}`,
        `Favourite plants available: ${favouritePlants || "none"}`,
        `Plants matched from the latest message: ${messageMatchedPlants || "none"}`,
        `Saved gardens count: ${Array.isArray(context?.savedGardens) ? context.savedGardens.length : 0}`,
        `User location: ${context?.userProfile?.location || "unknown"}`,
    ].join("\n");
};

const normalizeUploadedGardenPhotoMeta = (uploadedGardenPhotoMeta) =>
    uploadedGardenPhotoMeta &&
    typeof uploadedGardenPhotoMeta === "object" &&
    typeof uploadedGardenPhotoMeta.mimeType === "string" &&
    typeof uploadedGardenPhotoMeta.fileName === "string"
        ? {
              fileName: normalizeText(uploadedGardenPhotoMeta.fileName),
              mimeType: normalizeText(uploadedGardenPhotoMeta.mimeType),
          }
        : null;

const normalizeUploadedChatImage = (uploadedChatImage) =>
    uploadedChatImage &&
    typeof uploadedChatImage === "object" &&
    typeof uploadedChatImage.mimeType === "string" &&
    typeof uploadedChatImage.fileName === "string" &&
    typeof uploadedChatImage.data === "string"
        ? {
              fileName: normalizeText(uploadedChatImage.fileName),
              mimeType: normalizeText(uploadedChatImage.mimeType),
              data: normalizeText(uploadedChatImage.data),
              width: Number.isFinite(Number(uploadedChatImage.width)) ? Number(uploadedChatImage.width) : null,
              height: Number.isFinite(Number(uploadedChatImage.height)) ? Number(uploadedChatImage.height) : null,
          }
        : null;

const buildVisionModelContents = ({ prompt, uploadedChatImage }) => {
    if (!uploadedChatImage?.data || !uploadedChatImage?.mimeType) {
        return prompt;
    }

    return [
        {
            role: "user",
            parts: [
                { text: prompt },
                {
                    text: `Attached user image: ${uploadedChatImage.fileName || uploadedChatImage.mimeType || "image"}. Use it when the latest request asks you to identify a plant, inspect visible symptoms, or comment on plant health.`,
                },
                createPartFromBase64(uploadedChatImage.data, uploadedChatImage.mimeType),
            ],
        },
    ];
};

const buildIntentPrompt = ({ message, conversation, context, uploadedGardenPhotoMeta, uploadedChatImage }) => {
    const transcript = buildConversationTranscript(conversation);
    const uploadedPhotoLine = uploadedGardenPhotoMeta
        ? `Uploaded real garden photo available for planner editing: yes (${uploadedGardenPhotoMeta.fileName || uploadedGardenPhotoMeta.mimeType || "image"}).`
        : "Uploaded real garden photo available for planner editing: no.";
    const uploadedChatImageLine = uploadedChatImage
        ? `Latest chat image attached: yes (${uploadedChatImage.fileName || uploadedChatImage.mimeType || "image"}).`
        : "Latest chat image attached: no.";

    return `
You are the intent-routing layer for SoilSync Premium AI Assistant.
Messages may mix English and Hungarian. Return only JSON.

Pick exactly one intent from:
- plant_filter
- recommender_run
- planner_generate
- saved_garden_review
- plant_combination_help
- general_chat

Use these intent rules:
- plant_filter: the user asks for plants matching explicit criteria like soil, hardiness zone, pet safety, sunlight, care level, type, cycle, watering, medicinal, or low maintenance.
- recommender_run: the user wants the app's recommender to build a shortlist from natural-language garden constraints.
- planner_generate: the user wants selected or mentioned plants turned into a planner concept or image.
- saved_garden_review: the user asks to evaluate or compare saved gardens.
- plant_combination_help: the user asks what goes well with selected or mentioned plants.
- general_chat: everything else, including image-based plant identification and visible disease or stress questions from an attached chat image.

Planner styles allowed: flowering_cottage, stone_gravel, modern_minimal, mediterranean, japanese_zen
Planner moods allowed: natural, calm, vibrant, cozy, elegant
Planner maintenance levels allowed: low, medium, high
Planner hardscape allowed: mixed, lawn, gravel, stone, deck
Planner density allowed: airy, balanced, lush
Planner realism allowed: easy_to_recreate, balanced, concept_only
Planner budget allowed: budget_friendly, mid_range, premium

Return JSON in this shape:
{
  "intent": "plant_filter",
  "confidence": 0.84,
  "filterRequest": {
    "sunlight": "",
    "watering": "",
    "careLevel": "",
    "hardinessZone": null,
    "hardinessZoneMin": null,
    "hardinessZoneMax": null,
    "soil": "",
    "type": "",
    "cycle": "",
    "lowMaintenance": false,
    "fastGrowth": false,
    "petSafe": false,
    "medicinal": false
  },
  "recommenderRequest": {
    "sunlight": "",
    "watering": "",
    "careLevel": "",
    "hardinessZone": null,
    "hardinessZoneMin": null,
    "hardinessZoneMax": null,
    "soil": "",
    "type": "",
    "cycle": "",
    "lowMaintenance": false,
    "fastGrowth": false,
    "petSafe": false,
    "medicinal": false
  },
  "plannerRequest": {
    "style": "",
    "spaceType": "",
    "mood": "",
    "maintenanceLevel": "",
    "hardscape": "",
    "density": "",
    "realismLevel": "",
    "budgetLevel": "",
    "extraDirections": "",
    "variationCount": 1
  },
  "savedGardenReviewRequest": {
    "focus": "",
    "preferredStyle": "",
    "maintenanceLevel": ""
  },
  "combinationRequest": {
    "style": "",
    "maintenanceLevel": "",
    "sunlight": "",
    "soil": "",
    "hardinessZoneMin": null,
    "hardinessZoneMax": null,
    "petSafe": false,
    "type": ""
  }
}

Context snapshot:
${buildContextSnapshotForIntentPrompt(context)}
${uploadedPhotoLine}
${uploadedChatImageLine}

Recent conversation:
${transcript || "No earlier conversation."}

Latest user message:
${normalizeText(message)}
`.trim();
};

const buildAnswerPrompt = ({ message, conversation, context, intent, toolOutcome, uploadedGardenPhotoMeta, uploadedChatImage }) => {
    const transcript = buildConversationTranscript(conversation);
    const contextBlock = formatPremiumContextForPrompt(context);
    const toolSummary = JSON.stringify(
        {
            intent,
            toolSummary: toolOutcome?.toolSummary || {},
            action: toolOutcome?.action || null,
            resultCards: toolOutcome?.resultCards || [],
            uploadedGardenPhoto: uploadedGardenPhotoMeta
                ? {
                      fileName: uploadedGardenPhotoMeta.fileName,
                      mimeType: uploadedGardenPhotoMeta.mimeType,
                  }
                : null,
            uploadedChatImage: uploadedChatImage
                ? {
                      fileName: uploadedChatImage.fileName,
                      mimeType: uploadedChatImage.mimeType,
                      width: uploadedChatImage.width,
                      height: uploadedChatImage.height,
                  }
                : null,
        },
        null,
        2
    );

    return `
You are SoilSync Premium AI Assistant, a practical premium garden consultant inside a plant-planning web app.

You must stay grounded in the provided context and tool output.
Do not invent database records.
Do not claim an action already happened if the action still requires confirmation.
If there is a planner action with requiresConfirmation=true, clearly ask the user to confirm before any image generation.
If there are result cards, use them directly in your explanation.
Keep the answer practical, concise, and useful for a home gardener in Romania or broader Europe when relevant.
If a chat image is attached, you may identify the plant or comment on visible disease-like symptoms, stress, discoloration, pests, or damage from visual cues and general model knowledge only.
Never pretend you used a specialist disease database, lab test, or custom detection tool.
When the image is ambiguous, say so clearly and phrase plant-health conclusions with appropriate caution like "looks like", "may be", or "could indicate".

Return only JSON in this shape:
{
  "answer": "Main grounded reply in plain English.",
  "followUpQuestion": "One short follow-up question, or an empty string if not needed."
}

Available context:
${contextBlock}

Recent conversation:
${transcript || "No earlier conversation."}

Intent and tool outcome:
${toolSummary}

Latest user message:
${normalizeText(message)}
`.trim();
};

const buildFallbackIntent = (message) => {
    const text = normalizeText(message).toLowerCase();
    const hasPlannerWord = /(planner|plan it|generate|image|concept|render|visual|kertterv|plannerbe)/i.test(text);
    const hasSavedGardenWord = /(saved garden|saved gardens|saved plan|mentett kert|mentett tervek)/i.test(text);
    const hasCombinationWord = /(goes well|pair|combine|companion|match with|mi illik|mivel kombin)/i.test(text);
    const hasRecommenderWord = /(recommend|shortlist|recommender|suggest plants|ajanl)/i.test(text);
    const hasFilterWord = /(pet safe|hardiness|zone|soil|sunlight|watering|care level|low maintenance|medicinal|sandy|loamy|agyagos|napos|arnyek)/i.test(text);
    const hasPlannerStyleWord = /(japanese zen|zen garden|mediterranean|modern minimal|stone gravel|flowering cottage)/i.test(text);
    const hasUseSelectedGardenPattern =
        /(use (my |the )?selected|use these|use this|selected context|selected plants?)/i.test(text) &&
        /\bgarden\b/i.test(text);
    const hasDesignRequestWord = /(design|style|layout|turn it into|make it|epitsd|alakit(sd|s))/i.test(text);

    if (hasPlannerWord || hasUseSelectedGardenPattern || (hasPlannerStyleWord && hasDesignRequestWord)) return "planner_generate";
    if (hasSavedGardenWord) return "saved_garden_review";
    if (hasCombinationWord) return "plant_combination_help";
    if (hasRecommenderWord && !hasFilterWord) return "recommender_run";
    if (hasFilterWord || hasRecommenderWord) return "plant_filter";
    return "general_chat";
};

const normalizeIntentPayload = (payload, message) => {
    const intent = INTENT_VALUES.includes(normalizeText(payload?.intent)) ? normalizeText(payload.intent) : buildFallbackIntent(message);

    return {
        intent,
        confidence:
            typeof payload?.confidence === "number" && Number.isFinite(payload.confidence)
                ? Math.max(0, Math.min(1, payload.confidence))
                : 0.45,
        filterRequest: payload?.filterRequest || {},
        recommenderRequest: payload?.recommenderRequest || {},
        plannerRequest: payload?.plannerRequest || {},
        savedGardenReviewRequest: payload?.savedGardenReviewRequest || {},
        combinationRequest: payload?.combinationRequest || {},
    };
};

const getUsedContext = (context, intent, toolOutcome) => {
    const items = ["profile"];

    if (Array.isArray(context?.selectedPlants) && context.selectedPlants.length) {
        items.push("selectedPlants");
    }

    if (Array.isArray(context?.favouritePlants) && context.favouritePlants.length) {
        items.push("favouritePlants");
    }

    if (Array.isArray(context?.messageMatchedPlants) && context.messageMatchedPlants.length) {
        items.push("messageMatchedPlants");
    }

    if (
        intent === "saved_garden_review" ||
        intent === "planner_generate" ||
        (Array.isArray(context?.savedGardens) && context.savedGardens.length && toolOutcome?.toolSummary?.headline?.toLowerCase().includes("saved garden"))
    ) {
        items.push("savedGardens");
    }

    return [...new Set(items)];
};

const getSeenSelectedPlantNames = (context) =>
    (Array.isArray(context?.selectedPlants) ? context.selectedPlants : [])
        .map((plant) => normalizeText(plant.commonName || plant.scientificName))
        .filter(Boolean);

const callJsonModel = async ({ model, ai, prompt, uploadedChatImage = null }) => {
    const response = await ai.models.generateContent({
        model,
        contents: buildVisionModelContents({ prompt, uploadedChatImage }),
        config: {
            responseMimeType: "application/json",
        },
    });

    return parseJsonOutput(extractModelText(response));
};

const executeToolingForIntent = async ({ intentPayload, context, message, uploadedGardenPhotoMeta }) => {
    switch (intentPayload.intent) {
        case "plant_filter":
            return runPlantFilterTool({
                filterRequest: intentPayload.filterRequest,
                context,
                message,
            });

        case "recommender_run":
            return buildRecommenderActionTool({
                recommenderRequest: intentPayload.recommenderRequest,
                context,
                message,
            });

        case "planner_generate":
            return buildPlannerActionTool({
                plannerRequest: intentPayload.plannerRequest,
                context,
                message,
                uploadedGardenPhotoMeta,
            });

        case "saved_garden_review":
            return reviewSavedGardensTool({
                reviewRequest: intentPayload.savedGardenReviewRequest,
                context,
                message,
            });

        case "plant_combination_help":
            return runPlantCombinationTool({
                combinationRequest: intentPayload.combinationRequest,
                context,
                message,
            });

        default:
            return {
                action: null,
                resultCards: [],
                toolSummary: {
                    headline: "I am answering this as a general premium garden question.",
                    badges: [],
                },
            };
    }
};

const buildFallbackAnswer = (toolOutcome) =>
    normalizeText(toolOutcome?.toolSummary?.headline) || "I have processed your premium garden request.";

export const generatePremiumAssistantReply = async ({
    userId,
    message,
    conversation = [],
    selectedPlantIds = [],
    includeFavourites = true,
    includeSavedGardens = true,
    uploadedChatImage = null,
    uploadedGardenPhotoMeta = null,
}) => {
    if (!normalizeText(message)) {
        throw new Error("A message is required.");
    }

    const configError = getGoogleGenAIConfigError();
    if (configError) {
        throw new Error(configError);
    }

    const normalizedUploadedGardenPhotoMeta = normalizeUploadedGardenPhotoMeta(uploadedGardenPhotoMeta);
    const normalizedUploadedChatImage = normalizeUploadedChatImage(uploadedChatImage);

    const context = await buildPremiumAssistantContext({
        userId,
        message,
        selectedPlantIds,
        includeFavourites,
        includeSavedGardens,
    });

    const ai = createGoogleGenAIClient();
    const modelName = process.env.PREMIUM_ASSISTANT_MODEL || "gemini-2.5-pro";

    const parsedIntent = await callJsonModel({
        model: modelName,
        ai,
        prompt: buildIntentPrompt({
            message,
            conversation,
            context,
            uploadedChatImage: normalizedUploadedChatImage,
            uploadedGardenPhotoMeta: normalizedUploadedGardenPhotoMeta,
        }),
        uploadedChatImage: normalizedUploadedChatImage,
    }).catch(() => null);

    const intentPayload = normalizeIntentPayload(parsedIntent, message);
    const toolOutcome = await executeToolingForIntent({
        intentPayload,
        context,
        message,
        uploadedGardenPhotoMeta: normalizedUploadedGardenPhotoMeta,
    });

    const parsedAnswer = await callJsonModel({
        model: modelName,
        ai,
        prompt: buildAnswerPrompt({
            message,
            conversation,
            context,
            intent: intentPayload.intent,
            toolOutcome,
            uploadedChatImage: normalizedUploadedChatImage,
            uploadedGardenPhotoMeta: normalizedUploadedGardenPhotoMeta,
        }),
        uploadedChatImage: normalizedUploadedChatImage,
    }).catch(() => null);

    const usedContext = getUsedContext(context, intentPayload.intent, toolOutcome);
    if (normalizedUploadedChatImage) {
        usedContext.push("uploadedChatImage");
    }

    return {
        answer: normalizeText(parsedAnswer?.answer) || buildFallbackAnswer(toolOutcome),
        followUpQuestion: normalizeText(parsedAnswer?.followUpQuestion),
        usedContext: [...new Set(usedContext)],
        seenSelectedPlantNames: getSeenSelectedPlantNames(context),
        intent: intentPayload.intent,
        action: toolOutcome?.action || null,
        resultCards: Array.isArray(toolOutcome?.resultCards) ? toolOutcome.resultCards : [],
        contextPreview: {
            userProfile: context.userProfile,
            selectedPlants: context.selectedPlants.slice(0, 8).map((plant) => ({
                id: plant.id,
                commonName: plant.commonName,
                scientificName: plant.scientificName,
            })),
            favouritePlants: context.favouritePlants.slice(0, 8).map((plant) => ({
                id: plant.id,
                commonName: plant.commonName,
                scientificName: plant.scientificName,
            })),
            messageMatchedPlants: context.messageMatchedPlants.slice(0, 8).map((plant) => ({
                id: plant.id,
                commonName: plant.commonName,
                scientificName: plant.scientificName,
            })),
            savedGardensCount: context.savedGardens.length,
            hasUploadedChatImage: Boolean(normalizedUploadedChatImage),
            hasUploadedGardenPhoto: Boolean(normalizedUploadedGardenPhotoMeta),
        },
    };
};
