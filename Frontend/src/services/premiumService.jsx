import { authHeaders, buildUrl, parseResponse } from "./authService.jsx";

export const sendPremiumAssistantMessageRequest = (token, payload) =>
    fetch(buildUrl("/api/premium/assistant/chat"), {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const runPremiumAssistantRecommenderRequest = (endpoint, payload) =>
    fetch(buildUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const runPremiumAssistantPlannerRequest = (token, payload) =>
    fetch(buildUrl("/api/generate-photorealistic-garden"), {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    }).then(parseResponse);
