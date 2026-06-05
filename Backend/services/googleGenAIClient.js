import { GoogleGenAI } from "@google/genai";

export const getGoogleGenAIConfigError = () => {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
        return "Gemini API mode is enabled, but neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured.";
    }

    return "";
};

export const createGoogleGenAIClient = ({ apiVersion } = {}) => {
    const configError = getGoogleGenAIConfigError();
    if (configError) {
        throw new Error(configError);
    }

    const resolvedApiVersion = String(apiVersion || process.env.GOOGLE_GENAI_API_VERSION || "").trim();

    return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        ...(resolvedApiVersion ? { apiVersion: resolvedApiVersion } : {}),
    });
};
