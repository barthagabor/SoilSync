const plannerSeedsByEntry = new Map();
const plannerPreviewsByEntry = new Map();
let pendingPlannerSeed = null;

export function storePremiumPlannerSeed(entryId, seed) {
    if (!entryId || !seed) return;
    plannerSeedsByEntry.set(String(entryId), seed);
}

export function storePremiumPlannerPreview(entryId, preview) {
    if (!entryId || !preview) return;
    plannerPreviewsByEntry.set(String(entryId), preview);
}

export function getPremiumPlannerPreview(entryId) {
    if (!entryId) return null;
    return plannerPreviewsByEntry.get(String(entryId)) || null;
}

export function stagePremiumPlannerSeed(entryId) {
    if (!entryId) {
        pendingPlannerSeed = null;
        return null;
    }

    const nextSeed = plannerSeedsByEntry.get(String(entryId)) || null;
    pendingPlannerSeed = nextSeed;
    return nextSeed;
}

export function consumePendingPremiumPlannerSeed() {
    const nextSeed = pendingPlannerSeed;
    pendingPlannerSeed = null;
    return nextSeed;
}

export function clearPremiumPlannerTransfers() {
    plannerSeedsByEntry.clear();
    plannerPreviewsByEntry.clear();
    pendingPlannerSeed = null;
}
