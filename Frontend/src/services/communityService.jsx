import { authHeaders, buildUrl, parseResponse } from "./authService.jsx";

const getStoredToken = () => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("token") || "";
};

const buildCommunityQuery = (params = {}) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        const normalized = String(value).trim();
        if (!normalized) return;
        searchParams.set(key, normalized);
    });

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
};

export const fetchCommunityFeedRequest = (params = {}) =>
    fetch(buildUrl(`/api/community/feed${buildCommunityQuery(params)}`), {
        headers: authHeaders(getStoredToken()),
    }).then(parseResponse);

export const fetchCommunityPostDetailRequest = (postId) =>
    fetch(buildUrl(`/api/community/posts/${postId}`), {
        headers: authHeaders(getStoredToken()),
    }).then(parseResponse);

export const fetchCommunityMemberDetailRequest = (username) =>
    fetch(buildUrl(`/api/community/members/${username}`), {
        headers: authHeaders(getStoredToken()),
    }).then(parseResponse);

export const fetchCommunityTopicsRequest = (params = {}) =>
    fetch(buildUrl(`/api/community/topics${buildCommunityQuery(params)}`), {
        headers: authHeaders(getStoredToken()),
    }).then(parseResponse);

export const fetchCommunityComposerContextRequest = (token) =>
    fetch(buildUrl("/api/community/composer-context"), {
        headers: authHeaders(token),
    }).then(parseResponse);

export const createCommunityPostRequest = (token, payload) =>
    fetch(buildUrl("/api/community/posts"), {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const createCommunityCommentRequest = (token, postId, payload) =>
    fetch(buildUrl(`/api/community/posts/${postId}/comments`), {
        method: "POST",
        headers: authHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
    }).then(parseResponse);

export const toggleCommunityPostLikeRequest = (token, postId) =>
    fetch(buildUrl(`/api/community/posts/${postId}/like`), {
        method: "POST",
        headers: authHeaders(token),
    }).then(parseResponse);

export const toggleCommunityPostSaveRequest = (token, postId) =>
    fetch(buildUrl(`/api/community/posts/${postId}/save`), {
        method: "POST",
        headers: authHeaders(token),
    }).then(parseResponse);
