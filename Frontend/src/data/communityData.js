export const communityPostTypeOptions = [
    { value: "discussion", label: "Discussion" },
    { value: "question", label: "Question" },
    { value: "plant-tip", label: "Plant Tip" },
    { value: "garden-showcase", label: "Garden Showcase" },
    { value: "progress-update", label: "Progress Update" },
    { value: "local-note", label: "Local Note" },
    { value: "pest-alert", label: "Pest Alert" },
];

export const communityFeedFilters = [
    { value: "all", label: "All" },
    { value: "questions", label: "Questions" },
    { value: "gardens", label: "Gardens" },
    { value: "tips", label: "Tips" },
    { value: "local", label: "Local" },
    { value: "progress", label: "Progress" },
];

export const getCommunityGardenStyleLabel = (styleValue) => {
    const labels = {
        flowering_cottage: "Flowering Cottage",
        stone_gravel: "Stone & Gravel",
        modern_minimal: "Modern Minimal",
        mediterranean: "Mediterranean",
        japanese_zen: "Japanese Zen",
    };

    return labels[styleValue] || "Garden Concept";
};

export const getCommunityPostTypeMeta = (type) => {
    const map = {
        discussion: {
            label: "Discussion",
            chip: "border-[#dbe6cf] bg-white text-greenDark",
            accent: "bg-[#edf4e3] text-landingPageIcons",
        },
        question: {
            label: "Question",
            chip: "border-[#eadfb4] bg-[#fff9e8] text-[#8c6b0a]",
            accent: "bg-[#fff3cf] text-[#8c6b0a]",
        },
        "plant-tip": {
            label: "Plant Tip",
            chip: "border-[#d2e3f2] bg-[#f1f7fd] text-[#345b83]",
            accent: "bg-[#e3eef9] text-[#345b83]",
        },
        "garden-showcase": {
            label: "Garden Showcase",
            chip: "border-[#d7ead1] bg-[#edf8e7] text-[#38641c]",
            accent: "bg-[#dff0d8] text-[#38641c]",
        },
        "progress-update": {
            label: "Progress Update",
            chip: "border-[#e2d6ef] bg-[#f5effc] text-[#6a4a8a]",
            accent: "bg-[#ece1f8] text-[#6a4a8a]",
        },
        "local-note": {
            label: "Local Note",
            chip: "border-[#f0dec8] bg-[#fff6ec] text-[#9a5f13]",
            accent: "bg-[#faead7] text-[#9a5f13]",
        },
        "pest-alert": {
            label: "Pest Alert",
            chip: "border-[#f4c9c5] bg-[#fff2f0] text-[#b64035]",
            accent: "bg-[#ffe3df] text-[#b64035]",
        },
    };

    return map[type] || map.discussion;
};

export const formatCompactNumber = (value) =>
    new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value || 0));

export const formatRelativeDate = (value) => {
    const date = new Date(value);
    const diffMs = date.getTime() - Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (Number.isNaN(date.getTime())) return "";
    if (Math.abs(diffMs) < hour) return rtf.format(Math.round(diffMs / minute), "minute");
    if (Math.abs(diffMs) < day) return rtf.format(Math.round(diffMs / hour), "hour");
    if (Math.abs(diffMs) < week) return rtf.format(Math.round(diffMs / day), "day");
    return rtf.format(Math.round(diffMs / week), "week");
};

export const truncateCommunityText = (text, limit = 220) => {
    const source = String(text || "").trim();
    if (source.length <= limit) return source;
    return `${source.slice(0, limit).trimEnd()}...`;
};

export const getCommunityRegionLabel = (location) => {
    const normalized = String(location || "").trim();
    if (!normalized) return "Romania & Central Europe";
    return normalized;
};
