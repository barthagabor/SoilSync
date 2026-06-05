import { useEffect, useMemo, useState } from "react";
import { buildUrl } from "../services/authService.jsx";
import {
    runPremiumAssistantPlannerRequest,
    runPremiumAssistantRecommenderRequest,
    sendPremiumAssistantMessageRequest,
} from "../services/premiumService.jsx";
import { clearPremiumPlannerTransfers, storePremiumPlannerPreview, storePremiumPlannerSeed } from "../utils/premiumPlannerTransfer.js";
import { groupRankedRecommendations } from "../utils/recommenderGrouping.js";
import { useSessionStorageState } from "./usePagePersistence";

export const getPlantImage = (plant) =>
    plant?.default_image?.regular_url ||
    plant?.default_image?.medium_url ||
    plant?.default_image?.small_url ||
    plant?.image ||
    null;

export const getPlantTitle = (plant) => {
    const scientificName = Array.isArray(plant?.scientific_name) ? plant.scientific_name[0] : plant?.scientific_name;
    return plant?.common_name || plant?.commonName || scientificName || `Plant ${plant?.id || ""}`.trim();
};

export const getPlantScientificName = (plant) =>
    Array.isArray(plant?.scientific_name)
        ? plant.scientific_name[0]
        : plant?.scientific_name || plant?.scientificName || "";

const createMessageId = () => `premium-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const createConversationEntry = (role, content, extra = {}) => ({
    id: createMessageId(),
    role,
    content,
    ...extra,
});

export const mapResultCardToContextPlant = (card) => ({
    id: Number(card.id),
    common_name: card.commonName,
    scientific_name: card.scientificName ? [card.scientificName] : [],
    default_image: {
        regular_url: card.image || "",
        medium_url: card.image || "",
        small_url: card.image || "",
    },
});

const getPremiumRecommenderPlantImage = (plant) =>
    plant?.image ||
    plant?.image_url ||
    plant?.default_image?.regular_url ||
    plant?.default_image?.medium_url ||
    plant?.default_image?.small_url ||
    plant?.default_image?.thumbnail ||
    "";

export const formatRecommenderCards = (payload) => {
    const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
    const cards = rows.map((plant) => ({
        type: "plant",
        id: Number(plant.id),
        commonName: plant.common_name || "Unknown plant",
        scientificName: plant.latin_name || "",
        image: getPremiumRecommenderPlantImage(plant),
        badges: [
            plant.fit_label || "",
            plant.watering || "",
            plant.care_level || "",
            plant.type || "",
        ].filter(Boolean),
        note: Array.isArray(plant.why_it_fits) && plant.why_it_fits.length
            ? plant.why_it_fits[0]
            : "Suggested by the existing SoilSync recommender.",
        rationale: plant.pest_risk?.summary || "",
        meta: {
            score: plant.score,
            pestRiskLabel: plant.pest_risk?.label || "",
        },
    }));

    return groupRankedRecommendations(cards, { maxVisibleGroups: 6 }).map((group) => ({
        ...group.primary,
        alternatives: group.alternatives,
        similarGroupLabel: group.label,
    }));
};

const defaultContextPreview = {
    selectedPlants: [],
    favouritePlants: [],
    messageMatchedPlants: [],
    savedGardensCount: 0,
    hasUploadedGardenPhoto: false,
};

const MAX_REFERENCE_GARDEN_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CHAT_VISION_IMAGE_BYTES = 8 * 1024 * 1024;
const PLANNER_SELECTED_PLANT_LIMIT = 10;

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(file);
    });

const loadImageElement = (dataUrl) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The selected image could not be processed."));
        image.src = dataUrl;
    });

const dataUrlToBase64Payload = (dataUrl) => {
    const match = String(dataUrl || "").match(/^data:(.+?);base64,(.+)$/);
    if (!match) {
        throw new Error("The selected file is not a valid image payload.");
    }

    return {
        mimeType: match[1],
        data: match[2],
        previewUrl: dataUrl,
    };
};

const prepareAssistantImageUpload = async (file) => {
    const initialDataUrl = await readFileAsDataUrl(file);
    const image = await loadImageElement(initialDataUrl);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Your browser could not prepare the uploaded photo.");
    }

    context.drawImage(image, 0, 0, width, height);

    const previewUrl = canvas.toDataURL("image/jpeg", 0.86);
    const payload = dataUrlToBase64Payload(previewUrl);

    return {
        fileName: file.name || "garden-photo",
        fileSize: Number(file.size || 0),
        mimeType: payload.mimeType,
        data: payload.data,
        previewUrl: payload.previewUrl,
        width,
        height,
    };
};

const createInitialConversation = () => [
    createConversationEntry(
        "assistant",
        "I can filter plants from the database, trigger the recommender, prepare planner concepts, review saved gardens, and suggest companion plants from your selected context.",
        {
            usedContext: ["profile"],
            intent: "general_chat",
        }
    ),
];

export function usePremiumAssistant({ storagePrefix = "page:premium-assistant", user, redirectOnMissingUser = false, navigate } = {}) {
    const [query, setQuery] = useSessionStorageState(`${storagePrefix}:query`, "");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPlants, setSelectedPlants] = useSessionStorageState(`${storagePrefix}:selected-plants`, []);
    const [includeFavourites, setIncludeFavourites] = useSessionStorageState(`${storagePrefix}:include-favourites`, true);
    const [includeSavedGardens, setIncludeSavedGardens] = useSessionStorageState(`${storagePrefix}:include-saved-gardens`, true);
    const [conversation, setConversation] = useSessionStorageState(`${storagePrefix}:conversation`, createInitialConversation());
    const [contextPreview, setContextPreview] = useSessionStorageState(`${storagePrefix}:context-preview`, defaultContextPreview);
    const [message, setMessage] = useSessionStorageState(`${storagePrefix}:message-draft`, "");
    const [uploadedReferenceImage, setUploadedReferenceImage] = useSessionStorageState(`${storagePrefix}:reference-garden-photo`, null);
    const [uploadedChatImage, setUploadedChatImage] = useState(null);
    const [uploadingChatImage, setUploadingChatImage] = useState(false);
    const [uploadingReferenceImage, setUploadingReferenceImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useSessionStorageState(`${storagePrefix}:error`, "");

    useEffect(() => {
        if (redirectOnMissingUser && !user && navigate) {
            navigate("/login");
        }
    }, [redirectOnMissingUser, user, navigate]);

    const selectedPlantIds = useMemo(
        () => selectedPlants.map((plant) => Number(plant.id)).filter((id) => Number.isFinite(id) && id > 0),
        [selectedPlants]
    );
    const selectedPlantLimit = PLANNER_SELECTED_PLANT_LIMIT;

    const updateConversationEntry = (entryId, updates) => {
        setConversation((prev) =>
            prev.map((entry) => {
                if (entry.id !== entryId) return entry;
                const patch = typeof updates === "function" ? updates(entry) : updates;
                return { ...entry, ...patch };
            })
        );
    };

    const searchPlants = async () => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const res = await fetch(`${buildUrl("/plants")}?search=${encodeURIComponent(query.trim())}&limit=6`);
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || "Failed to search plants.");
            }
            setSearchResults(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error("Premium plant search failed:", err);
            setError(err.message || "Failed to search plants.");
        } finally {
            setSearching(false);
        }
    };

    const addContextPlant = (plant) => {
        if (!plant?.id) {
            return false;
        }

        const alreadySelected = selectedPlants.some((entry) => Number(entry.id) === Number(plant.id));
        if (!alreadySelected && selectedPlants.length >= selectedPlantLimit) {
            setError(`You can select up to ${PLANNER_SELECTED_PLANT_LIMIT} plants in the assistant context.`);
            return false;
        }

        setSelectedPlants((prev) => {
            if (prev.some((entry) => Number(entry.id) === Number(plant.id))) return prev;
            return [...prev, plant];
        });
        setSearchResults([]);
        setQuery("");
        setError("");
        return true;
    };

    const addResultPlantToContext = (card) => {
        addContextPlant(mapResultCardToContextPlant(card));
    };

    const removeContextPlant = (plantId) => {
        setSelectedPlants((prev) => prev.filter((plant) => Number(plant.id) !== Number(plantId)));
    };

    const attachReferenceGardenImage = async (file) => {
        if (!file) return;

        const mimeType = String(file.type || "");
        if (!mimeType.startsWith("image/")) {
            throw new Error("Please upload an image file.");
        }

        if (file.size > MAX_REFERENCE_GARDEN_IMAGE_BYTES) {
            throw new Error("Please upload an image smaller than 8 MB.");
        }

        if (selectedPlants.length > selectedPlantLimit) {
            throw new Error(
                `Planner actions support up to ${PLANNER_SELECTED_PLANT_LIMIT} selected plants. Remove a few plants before attaching a garden photo.`
            );
        }

        setUploadingReferenceImage(true);

        try {
            const preparedImage = await prepareAssistantImageUpload(file);
            setUploadedReferenceImage(preparedImage);
            setError("");
        } finally {
            setUploadingReferenceImage(false);
        }
    };

    const clearReferenceGardenImage = () => {
        setUploadedReferenceImage(null);
    };

    const attachChatImage = async (file) => {
        if (!file) return;

        const mimeType = String(file.type || "");
        if (!mimeType.startsWith("image/")) {
            throw new Error("Please upload an image file.");
        }

        if (file.size > MAX_CHAT_VISION_IMAGE_BYTES) {
            throw new Error("Please upload an image smaller than 8 MB.");
        }

        setUploadingChatImage(true);

        try {
            const preparedImage = await prepareAssistantImageUpload(file);
            setUploadedChatImage(preparedImage);
            setError("");
        } finally {
            setUploadingChatImage(false);
        }
    };

    const clearChatImage = () => {
        setUploadedChatImage(null);
    };

    const executeAssistantAction = async (entryId, action) => {
        if (!action?.type) return;

        updateConversationEntry(entryId, {
            actionStatus: "running",
            actionError: "",
        });

        try {
            if (action.type === "runRecommender") {
                const response = await runPremiumAssistantRecommenderRequest(
                    action.payload?.endpoint || "/api/recommender/xgb",
                    action.payload?.requestBody || {}
                );
                const resultCards = formatRecommenderCards(response);
                const hiddenAlternativeCount = resultCards.reduce(
                    (count, card) => count + (Array.isArray(card.alternatives) ? card.alternatives.length : 0),
                    0
                );

                updateConversationEntry(entryId, (entry) => ({
                    actionStatus: "completed",
                    actionResultTitle: resultCards.length
                        ? hiddenAlternativeCount > 0
                            ? `Recommender returned ${resultCards.length} diverse shortlist plants and grouped ${hiddenAlternativeCount} similar alternatives.`
                            : `Recommender returned ${resultCards.length} shortlist plants.`
                        : "The recommender did not find any strong matches.",
                    resultCards: resultCards.length ? resultCards : entry.resultCards,
                }));

                return;
            }

            if (action.type === "generatePlannerImage") {
                const token = localStorage.getItem("token");
                if (!token) {
                    throw new Error("You need to be logged in to use the planner action.");
                }

                if (selectedPlants.length > selectedPlantLimit) {
                    throw new Error(`Planner generation supports up to ${PLANNER_SELECTED_PLANT_LIMIT} selected plants.`);
                }

                const selectedPlantSnapshot = selectedPlants.map((plant) => JSON.parse(JSON.stringify(plant)));
                const uploadedReferenceImageSnapshot = uploadedReferenceImage
                    ? {
                          name: uploadedReferenceImage.fileName || "garden-photo",
                          mimeType: uploadedReferenceImage.mimeType,
                          data: uploadedReferenceImage.data,
                          previewUrl: uploadedReferenceImage.previewUrl,
                      }
                    : null;

                const requestBody = {
                    ...(action.payload?.requestBody || {}),
                    ...(uploadedReferenceImage
                        ? {
                              referenceGardenPhoto: {
                                  data: uploadedReferenceImage.data,
                                  mimeType: uploadedReferenceImage.mimeType,
                              },
                          }
                        : {}),
                };

                const response = await runPremiumAssistantPlannerRequest(
                    token,
                    requestBody
                );
                const generatedImages = Array.isArray(response?.images)
                    ? response.images
                    : response?.imageBase64
                        ? [response.imageBase64]
                        : [];
                const primaryGeneratedImage = response?.imageBase64 || generatedImages[0] || "";
                const plannerSeed = {
                    selectedPlants: selectedPlantSnapshot,
                    designBrief: {
                        ...(action.payload?.requestBody?.designPreferences || {}),
                    },
                    generatedImages,
                    gardenImage: primaryGeneratedImage,
                    activeVariationIndex: 0,
                    referenceMode: uploadedReferenceImageSnapshot ? "photo_edit" : "from_scratch",
                    referenceGardenPhoto: uploadedReferenceImageSnapshot,
                    generatedFromReferencePhoto: Boolean(uploadedReferenceImageSnapshot),
                };

                storePremiumPlannerSeed(entryId, plannerSeed);
                storePremiumPlannerPreview(entryId, {
                    generatedImage: primaryGeneratedImage,
                    generatedImages,
                });

                updateConversationEntry(entryId, {
                    actionStatus: "completed",
                    actionResultTitle: response?.message || "Planner concept generated successfully.",
                    hasGeneratedPlannerPreview: Boolean(primaryGeneratedImage),
                    hasPlannerTransfer: true,
                });
            }
        } catch (err) {
            console.error("Premium assistant action failed:", err);
            updateConversationEntry(entryId, {
                actionStatus: "failed",
                actionError: err.message || "This action could not be completed right now.",
            });
        }
    };

    const sendCurrentMessage = async () => {
        const trimmed = message.trim();
        const effectiveMessage = trimmed || (uploadedChatImage ? "Please analyze the attached plant image." : "");
        if (!effectiveMessage) return;

        const uploadedChatImageSnapshot = uploadedChatImage
            ? {
                  fileName: uploadedChatImage.fileName || "chat-image",
                  mimeType: uploadedChatImage.mimeType,
                  data: uploadedChatImage.data,
                  previewUrl: uploadedChatImage.previewUrl,
                  width: uploadedChatImage.width,
                  height: uploadedChatImage.height,
              }
            : null;

        const userEntry = createConversationEntry("user", effectiveMessage, uploadedChatImageSnapshot
            ? {
                  uploadedImage: {
                      fileName: uploadedChatImageSnapshot.fileName,
                      mimeType: uploadedChatImageSnapshot.mimeType,
                      previewUrl: uploadedChatImageSnapshot.previewUrl,
                  },
              }
            : {});
        const nextConversation = [...conversation, userEntry];
        setConversation(nextConversation);
        setMessage("");
        setError("");

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const data = await sendPremiumAssistantMessageRequest(token, {
                message: effectiveMessage,
                conversation: nextConversation.slice(-8).map((entry) => ({
                    role: entry.role,
                    content: entry.content,
                })),
                selectedPlantIds,
                includeFavourites,
                includeSavedGardens,
                uploadedChatImage: uploadedChatImageSnapshot
                    ? {
                          fileName: uploadedChatImageSnapshot.fileName,
                          mimeType: uploadedChatImageSnapshot.mimeType,
                          data: uploadedChatImageSnapshot.data,
                          width: uploadedChatImageSnapshot.width,
                          height: uploadedChatImageSnapshot.height,
                      }
                    : null,
                uploadedGardenPhotoMeta: uploadedReferenceImage
                    ? {
                          fileName: uploadedReferenceImage.fileName,
                          mimeType: uploadedReferenceImage.mimeType,
                      }
                    : null,
            });

            const assistantMessage = [data.answer || "", data.followUpQuestion ? `\n\n${data.followUpQuestion}` : ""]
                .join("")
                .trim();

            const assistantEntry = createConversationEntry(
                "assistant",
                assistantMessage || "I could not generate a useful reply yet.",
                {
                    usedContext: Array.isArray(data.usedContext) ? data.usedContext : [],
                    seenSelectedPlantNames: Array.isArray(data.seenSelectedPlantNames) ? data.seenSelectedPlantNames : [],
                    intent: data.intent || "general_chat",
                    action: data.action || null,
                    resultCards: Array.isArray(data.resultCards) ? data.resultCards : [],
                    actionStatus: "idle",
                }
            );

            setConversation((prev) => [...prev, assistantEntry]);
            setContextPreview(data.contextPreview || defaultContextPreview);
            setUploadedChatImage(null);

            if (assistantEntry.action?.autoExecute && !assistantEntry.action.requiresConfirmation) {
                window.setTimeout(() => {
                    executeAssistantAction(assistantEntry.id, assistantEntry.action);
                }, 50);
            }
        } catch (err) {
            console.error("Premium assistant request failed:", err);
            setError(err.message || "The premium assistant is unavailable right now.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (event) => {
        event?.preventDefault?.();
        await sendCurrentMessage();
    };

    const resetAssistantChat = () => {
        setConversation(createInitialConversation());
        setContextPreview(defaultContextPreview);
        setMessage("");
        setUploadedChatImage(null);
        setError("");
        clearPremiumPlannerTransfers();
    };

    return {
        query,
        setQuery,
        searching,
        searchResults,
        selectedPlants,
        setSelectedPlants,
        includeFavourites,
        setIncludeFavourites,
        includeSavedGardens,
        setIncludeSavedGardens,
        conversation,
        setConversation,
        contextPreview,
        setContextPreview,
        message,
        setMessage,
        loading,
        error,
        setError,
        selectedPlantIds,
        selectedPlantLimit,
        uploadedChatImage,
        uploadingChatImage,
        uploadedReferenceImage,
        uploadingReferenceImage,
        updateConversationEntry,
        searchPlants,
        addContextPlant,
        addResultPlantToContext,
        removeContextPlant,
        attachChatImage,
        clearChatImage,
        attachReferenceGardenImage,
        clearReferenceGardenImage,
        executeAssistantAction,
        sendCurrentMessage,
        handleSendMessage,
        resetAssistantChat,
    };
}
