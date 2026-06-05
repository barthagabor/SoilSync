import User from "../models/User.js";

const normalizeCommunityUsernameSeed = (value) => {
    const normalized = String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    return normalized || "soilsync_member";
};

export const createUniqueCommunityUsername = async (seedValue, excludeUserId = null) => {
    const base = normalizeCommunityUsernameSeed(seedValue);
    let candidate = base;
    let suffix = 1;

    while (true) {
        const existingUser = await User.findOne({
            communityUsername: candidate,
            ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
        }).select("_id");

        if (!existingUser) {
            return candidate;
        }

        suffix += 1;
        candidate = `${base}_${suffix}`;
    }
};

export const ensureCommunityIdentity = async (user, { save = false } = {}) => {
    if (!user) return null;

    if (!user.communityUsername) {
        user.communityUsername = await createUniqueCommunityUsername(
            user.name || user.email || "soilsync_member",
            user._id || null
        );

        if (save) {
            await user.save();
        }
    }

    return user;
};
