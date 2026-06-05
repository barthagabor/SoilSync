const CULTIVAR_PATTERNS = [
    /'[^']*'/g,
    /"[^"]*"/g,
    /\bcv\.\s+[A-Za-z0-9_-]+/gi,
];

export function normalizeScientificName(value) {
    if (!value) return "";

    let normalized = String(value).trim();

    for (const pattern of CULTIVAR_PATTERNS) {
        normalized = normalized.replace(pattern, " ");
    }

    normalized = normalized
        .replace(/\s+/g, " ")
        .replace(/\s+\b(var\.|subsp\.|ssp\.|forma|f\.)\b.*$/i, "")
        .trim();

    const tokens = normalized.split(" ").filter(Boolean);
    if (tokens.length >= 2) {
        return `${tokens[0]} ${tokens[1]}`;
    }

    return normalized;
}

export function buildScientificNameCandidates(plant) {
    const candidates = new Set();

    const rawNames = Array.isArray(plant?.scientific_name) ? plant.scientific_name : [];
    for (const raw of rawNames) {
        const normalized = normalizeScientificName(raw);
        if (normalized) candidates.add(normalized);
    }

    if (plant?.genus && plant?.species_epithet) {
        candidates.add(`${String(plant.genus).trim()} ${String(plant.species_epithet).trim()}`.trim());
    }

    if (!candidates.size && plant?.common_name) {
        candidates.add(String(plant.common_name).trim());
    }

    return [...candidates];
}

export function pickPrimaryScientificName(plant) {
    const candidates = buildScientificNameCandidates(plant);
    return candidates[0] || "";
}
