const rawApiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

export const buildUrl = (path) => `${API_BASE_URL}${path}`;

export const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");

    if (!response.ok) {
        const message =
            (payload && typeof payload === "object" && payload.message) ||
            (typeof payload === "string" && payload) ||
            "Request failed.";
        throw new Error(message);
    }

    return payload;
};

export const authHeaders = (token, extraHeaders = {}) => ({
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const registerUserRequest = (payload) =>
    fetch(buildUrl("/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const loginUserRequest = (payload) =>
    fetch(buildUrl("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const forgotPasswordRequest = (payload) =>
    fetch(buildUrl("/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const resetPasswordRequest = (token, payload) =>
    fetch(buildUrl(`/reset-password/${token}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const fetchUserProfile = (token) =>
    fetch(buildUrl("/profile"), {
        headers: authHeaders(token),
    }).then(parseResponse);

export const updateUserProfileRequest = (token, payload) =>
    fetch(buildUrl("/profile/update"), {
        method: "PUT",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const toggleFavouriteRequest = (token, plantId) =>
    fetch(buildUrl("/favourites/toggle"), {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify({ plantId }),
    }).then(parseResponse);
