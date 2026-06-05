const normalizeText = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
};

const normalizeSlug = (value) =>
    normalizeText(value)
        .toLowerCase()
        .replace(/['"`]/g, "")
        .replace(/[()]/g, " ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/-/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const titleCase = (value) =>
    normalizeText(value)
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const getDisplayCommonName = (item) =>
    normalizeText(item?.common_name || item?.commonName || "");

const getDisplayScientificName = (item) =>
    normalizeText(
        Array.isArray(item?.scientific_name)
            ? item.scientific_name[0]
            : item?.scientific_name || item?.latin_name || item?.scientificName || ""
    );

const getCommonSuffixLabel = (item) => {
    const common = normalizeSlug(getDisplayCommonName(item));
    if (!common) return "";

    const tokens = common.split(" ").filter(Boolean);
    if (tokens.length <= 2) return common;
    return tokens.slice(-2).join(" ");
};

const getScientificSpeciesLabel = (item) => {
    const scientific = normalizeSlug(getDisplayScientificName(item));
    if (!scientific) return "";

    const tokens = scientific.split(" ").filter(Boolean);
    if (tokens.length < 2) return scientific;
    return tokens.slice(0, 2).join(" ");
};

const getSimilarityGroup = (item) => {
    const commonSuffix = getCommonSuffixLabel(item);
    const scientificSpecies = getScientificSpeciesLabel(item);

    if (commonSuffix) {
        return {
            key: `common:${commonSuffix}`,
            label: titleCase(commonSuffix),
        };
    }

    if (scientificSpecies) {
        return {
            key: `scientific:${scientificSpecies}`,
            label: titleCase(scientificSpecies),
        };
    }

    const fallback = normalizeText(item?.id || item?._id || Math.random().toString(36).slice(2));
    return {
        key: `fallback:${fallback}`,
        label: getDisplayCommonName(item) || "Similar plants",
    };
};

export const groupRankedRecommendations = (items, { maxVisibleGroups = 6 } = {}) => {
    const groups = [];
    const groupMap = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
        const similarityGroup = getSimilarityGroup(item);
        const existingGroup = groupMap.get(similarityGroup.key);

        if (!existingGroup) {
            const nextGroup = {
                key: similarityGroup.key,
                label: similarityGroup.label,
                primary: item,
                alternatives: [],
            };
            groupMap.set(similarityGroup.key, nextGroup);
            groups.push(nextGroup);
            return;
        }

        existingGroup.alternatives.push(item);
    });

    return groups.slice(0, maxVisibleGroups).map((group) => ({
        ...group,
        totalCount: 1 + group.alternatives.length,
    }));
};
