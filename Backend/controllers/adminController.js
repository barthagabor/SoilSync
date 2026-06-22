import User from "../models/User.js";
import PerenualPlant from "../models/PerenualPlant.js";
import PlantEppoLink from "../models/PlantEppoLink.js";
import mongoose from "mongoose";
import CommunityPost from "../models/CommunityPost.js";
import CommunityComment from "../models/CommunityComment.js";

import {
    buildStoredPlantImage,
    canonicalizeCareLevel,
    canonicalizeCycle,
    canonicalizeType,
    canonicalizeWatering,
    detectPlantImageStorageProvider,
    escapeRegexLiteral,
    getPlantRecordId,
    normalizeOptionValue,
    splitCommaSeparatedValues,
} from "../utils/plantCatalog.js";

const normalizeAdminPlant = (plant) => ({
    id: getPlantRecordId(plant),
    common_name: plant.common_name || "",
    scientific_name: Array.isArray(plant.scientific_name)
        ? plant.scientific_name
        : plant.scientific_name
            ? [plant.scientific_name]
            : [],
    default_image: plant.default_image || {},
    details: plant.details || {},
    adminCatalogStatus: normalizeOptionValue(plant.adminCatalogStatus) || "unset",
});

export const getAdminUsers = async (req, res) => {
    try {
        const normalizedUsers = await User.aggregate([
            {
                $project: {
                    name: 1,
                    email: 1,
                    profileImage: 1,
                    verified: 1,
                    role: 1,
                    systemRole: 1,
                    subscriptionPlan: 1,
                    premiumStatus: 1,
                    premiumActivatedAt: 1,
                    premiumExpiresAt: 1,
                    location: 1,
                    createdAt: 1,
                    favouritesCount: {
                        $cond: {
                            if: { $isArray: "$favourites" },
                            then: { $size: "$favourites" },
                            else: 0,
                        },
                    },
                    savedGardensCount: {
                        $cond: {
                            if: { $isArray: "$savedGardens" },
                            then: { $size: "$savedGardens" },
                            else: 0,
                        },
                    },
                },
            },
            { $sort: { createdAt: -1 } },
        ]);

        res.json({
            users: normalizedUsers,
            currentUserRole: req.currentUser?.systemRole || "user",
        });
    } catch (err) {
        console.error("Error fetching admin users:", err);
        res.status(500).json({ message: "Error fetching admin users." });
    }
};

export const updateUserSystemRole = async (req, res) => {
    try {
        const { systemRole } = req.body || {};
        const allowedRoles = ["user", "admin", "superadmin"];

        if (!allowedRoles.includes(systemRole)) {
            return res.status(400).json({ message: "Invalid system role." });
        }

        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }

        const isSelf = String(targetUser._id) === String(req.currentUser._id);
        if (isSelf && systemRole !== "superadmin") {
            return res.status(400).json({ message: "You cannot remove your own superadmin role." });
        }

        if (targetUser.systemRole === "superadmin" && systemRole !== "superadmin") {
            const superAdminCount = await User.countDocuments({ systemRole: "superadmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: "At least one superadmin must remain." });
            }
        }

        targetUser.systemRole = systemRole;
        await targetUser.save();

        res.json({
            message: "System role updated successfully.",
            user: {
                _id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                systemRole: targetUser.systemRole,
            },
        });
    } catch (err) {
        console.error("Error updating system role:", err);
        res.status(500).json({ message: "Error updating system role." });
    }
};

export const updateUserSubscription = async (req, res) => {
    try {
        const nextPlan = String(req.body?.subscriptionPlan || "").trim().toLowerCase();
        const nextStatus = String(req.body?.premiumStatus || "").trim().toLowerCase();

        const allowedPlans = ["free", "premium"];
        const allowedStatuses = ["inactive", "active", "cancelled"];

        if (!allowedPlans.includes(nextPlan)) {
            return res.status(400).json({ message: "Invalid subscription plan." });
        }

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid premium status." });
        }

        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }

        targetUser.subscriptionPlan = nextPlan;
        targetUser.premiumStatus = nextStatus;

        if (nextPlan === "premium" && nextStatus === "active") {
            targetUser.premiumActivatedAt = targetUser.premiumActivatedAt || new Date();
        }

        if (nextPlan === "free") {
            targetUser.premiumActivatedAt = null;
            targetUser.premiumExpiresAt = null;
        }

        await targetUser.save();

        res.json({
            message: "Subscription updated successfully.",
            user: {
                _id: targetUser._id,
                subscriptionPlan: targetUser.subscriptionPlan,
                premiumStatus: targetUser.premiumStatus,
                premiumActivatedAt: targetUser.premiumActivatedAt,
                premiumExpiresAt: targetUser.premiumExpiresAt,
            },
        });
    } catch (err) {
        console.error("Error updating subscription:", err);
        res.status(500).json({ message: "Error updating subscription." });
    }
};

export const getAdminPlants = async (req, res) => {
    try {
        const search = normalizeOptionValue(req.query.search) || "";
        const pageNumber = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
        const limitNumber = Math.min(24, Math.max(1, parseInt(String(req.query.limit || "12"), 10) || 12));
        const skip = (pageNumber - 1) * limitNumber;
        const query = {};

        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { common_name: regex },
                { scientific_name: regex },
                { genus: regex },
                { family: regex },
            ];
        }

        const [total, plants] = await Promise.all([
            PerenualPlant.countDocuments(query),
            PerenualPlant.find(query)
                .sort({ common_name: 1 })
                .skip(skip)
                .limit(limitNumber),
        ]);

        res.json({
            data: plants.map(normalizeAdminPlant),
            total,
            page: pageNumber,
            totalPages: Math.max(1, Math.ceil(total / limitNumber)),
        });
    } catch (err) {
        console.error("Error fetching admin plants:", err);
        res.status(500).json({ message: "Error fetching admin plants." });
    }
};

export const createAdminPlant = async (req, res) => {
    try {
        const commonName = normalizeOptionValue(req.body?.common_name);
        const scientificNames = splitCommaSeparatedValues(req.body?.scientific_name);
        const otherNames = splitCommaSeparatedValues(req.body?.other_name);
        const family = normalizeOptionValue(req.body?.family);
        const genus = normalizeOptionValue(req.body?.genus);
        const type = canonicalizeType(req.body?.type) || normalizeOptionValue(req.body?.type);
        const cycle = canonicalizeCycle(req.body?.cycle) || normalizeOptionValue(req.body?.cycle);
        const watering = canonicalizeWatering(req.body?.watering) || normalizeOptionValue(req.body?.watering);
        const careLevel = canonicalizeCareLevel(req.body?.care_level) || normalizeOptionValue(req.body?.care_level);
        const sunlight = splitCommaSeparatedValues(req.body?.sunlight);
        const origin = splitCommaSeparatedValues(req.body?.origin);
        const description = normalizeOptionValue(req.body?.description);
        const imageSource = normalizeOptionValue(req.body?.imageUrl) || normalizeOptionValue(req.body?.imageDataUrl);
        const nextStatus = normalizeOptionValue(req.body?.catalogStatus) || "recommendable";
        const allowedStatuses = ["unset", "recommendable", "excluded"];

        if (!commonName) {
            return res.status(400).json({ message: "Common name is required." });
        }

        if (!scientificNames.length) {
            return res.status(400).json({ message: "At least one scientific name is required." });
        }

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid catalog status." });
        }

        if (imageSource && !/^https?:\/\//i.test(imageSource) && !/^data:image\//i.test(imageSource)) {
            return res.status(400).json({ message: "Image must be a valid URL or uploaded image data." });
        }

        const exactCommonNameRegex = new RegExp(`^${escapeRegexLiteral(commonName)}$`, "i");
        const exactScientificNameRegex = new RegExp(`^${escapeRegexLiteral(scientificNames[0])}$`, "i");

        const existingPlant = await PerenualPlant.findOne({
            common_name: exactCommonNameRegex,
            scientific_name: exactScientificNameRegex,
        }).lean();

        if (existingPlant) {
            return res.status(409).json({
                message: "A plant with this common name and scientific name already exists.",
            });
        }

        const latestPlant = await PerenualPlant.findOne({ id: { $type: "number" } }, { id: 1 })
            .sort({ id: -1 })
            .lean();

        const nextId = Math.max(1, Number(latestPlant?.id || 0) + 1);
        const now = new Date();

        const defaultImage = buildStoredPlantImage(imageSource);
        const imageStorageProvider = detectPlantImageStorageProvider(defaultImage);

        const plantPayload = {
            id: nextId,
            common_name: commonName,
            scientific_name: scientificNames,
            other_name: otherNames,
            family,
            genus,
            type,
            cycle,
            watering,
            sunlight,
            care_level: careLevel,
            default_image: defaultImage,
            hasCloudinaryImage: imageStorageProvider === "cloudinary",
            imageStorageProvider,
            details: {
                ...(type ? { type } : {}),
                ...(cycle ? { cycle } : {}),
                ...(watering ? { watering } : {}),
                ...(sunlight.length ? { sunlight } : {}),
                ...(careLevel ? { care_level: careLevel } : {}),
                ...(origin.length ? { origin } : {}),
                ...(description ? { description } : {}),
            },
            imported_at: now,
            updated_at: now,
            adminCatalogStatus: nextStatus,
        };

        const createdPlant = await PerenualPlant.create(plantPayload);

        res.status(201).json({
            message: "Plant created successfully.",
            plant: normalizeAdminPlant(createdPlant),
        });
    } catch (err) {
        console.error("Error creating admin plant:", err);
        res.status(500).json({ message: "Error creating plant." });
    }
};

export const updatePlantCatalogStatus = async (req, res) => {
    try {
        const allowedStatuses = ["unset", "recommendable", "excluded"];
        const nextStatus = normalizeOptionValue(req.body?.catalogStatus) || "unset";

        if (!allowedStatuses.includes(nextStatus)) {
            return res.status(400).json({ message: "Invalid catalog status." });
        }

        const plantId = Number(req.params.id);
        if (Number.isNaN(plantId)) {
            return res.status(400).json({ message: "Invalid plant id." });
        }

        const plant = await PerenualPlant.findOne({ id: plantId });
        if (!plant) {
            return res.status(404).json({ message: "Plant not found." });
        }

        plant.adminCatalogStatus = nextStatus;
        await plant.save();

        res.json({
            message: "Catalog status updated successfully.",
            plant: {
                id: plantId,
                adminCatalogStatus: plant.adminCatalogStatus,
            },
        });
    } catch (err) {
        console.error("Error updating plant catalog status:", err);
        res.status(500).json({ message: "Error updating plant catalog status." });
    }
};

export const deleteAdminPlant = async (req, res) => {
    try {
        const plantId = Number(req.params.id);
        if (!Number.isFinite(plantId)) {
            return res.status(400).json({ message: "Invalid plant id." });
        }

        const plant = await PerenualPlant.findOne({ id: plantId }).select("_id id common_name scientific_name");
        if (!plant) {
            return res.status(404).json({ message: "Plant not found." });
        }

        await Promise.all([
            User.updateMany(
                { favourites: plantId },
                {
                    $pull: {
                        favourites: plantId,
                    },
                }
            ),
            PlantEppoLink.deleteMany({
                $or: [{ perenualPlantId: plantId }, { perenualMongoId: plant._id }],
            }),
            PerenualPlant.deleteOne({ _id: plant._id }),
        ]);

        res.json({
            message: "Plant deleted successfully.",
            deletedPlant: {
                id: plantId,
                common_name: plant.common_name || "",
                scientific_name: Array.isArray(plant.scientific_name)
                    ? plant.scientific_name
                    : plant.scientific_name
                        ? [plant.scientific_name]
                        : [],
            },
        });
    } catch (err) {
        console.error("Error deleting admin plant:", err);
        res.status(500).json({ message: "Error deleting plant." });
    }
};


const recalculateCommentCounts = async (postIds = []) => {
    const uniquePostIds = [
        ...new Set(
            postIds
                .map((postId) => String(postId || ""))
                .filter((postId) => mongoose.Types.ObjectId.isValid(postId))
        ),
    ];

    await Promise.all(
        uniquePostIds.map(async (postId) => {
            const count = await CommunityComment.countDocuments({ post: postId });
            await CommunityPost.updateOne(
                { _id: postId },
                { $set: { commentsCount: count } }
            );
        })
    );
};

const recalculateLikeCounts = async () => {
    await Promise.all([
        CommunityPost.updateMany({}, [
            {
                $set: {
                    likesCount: {
                        $size: {
                            $ifNull: ["$likes", []],
                        },
                    },
                },
            },
        ]),
        CommunityComment.updateMany({}, [
            {
                $set: {
                    likesCount: {
                        $size: {
                            $ifNull: ["$likes", []],
                        },
                    },
                },
            },
        ]),
    ]);
};

export const deleteUserBySuperAdmin = async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const currentUserId = req.user?.userId;

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ message: "Invalid user id." });
        }

        if (String(currentUserId) === String(targetUserId)) {
            return res.status(400).json({
                message: "You cannot delete your own account from the admin panel.",
            });
        }

        const targetUser = await User.findById(targetUserId).select(
            "_id name email systemRole"
        );

        if (!targetUser) {
            return res.status(404).json({ message: "User not found." });
        }

        if (targetUser.systemRole === "superadmin") {
            return res.status(403).json({
                message: "Superadmin accounts cannot be deleted from the admin panel.",
            });
        }

        const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

        const postsByUser = await CommunityPost.find({ author: targetObjectId }).select("_id");
        const postIdsByUser = postsByUser.map((post) => post._id);

        const commentsByUserOnRemainingPosts = await CommunityComment.find({
            author: targetObjectId,
            post: { $nin: postIdsByUser },
        }).select("post");

        const affectedRemainingPostIds = commentsByUserOnRemainingPosts.map(
            (comment) => comment.post
        );

        const deletedCommentsOnDeletedPosts = await CommunityComment.deleteMany({
            post: { $in: postIdsByUser },
        });

        const deletedCommentsByUser = await CommunityComment.deleteMany({
            author: targetObjectId,
        });

        const deletedPosts = await CommunityPost.deleteMany({
            author: targetObjectId,
        });

        await User.updateMany(
            {},
            {
                $pull: {
                    savedCommunityPosts: { $in: postIdsByUser },
                },
            }
        );

        await CommunityPost.updateMany(
            { likes: targetObjectId },
            { $pull: { likes: targetObjectId } }
        );

        await CommunityComment.updateMany(
            { likes: targetObjectId },
            { $pull: { likes: targetObjectId } }
        );

        await CommunityPost.updateMany(
            { solvedBy: targetObjectId },
            {
                $set: {
                    solved: false,
                    solvedBy: null,
                },
            }
        );

        await recalculateCommentCounts(affectedRemainingPostIds);
        await recalculateLikeCounts();

        await User.deleteOne({ _id: targetObjectId });

        res.json({
            message: "User and related content deleted successfully.",
            deletedUserId: targetUserId,
            deletedPosts: deletedPosts.deletedCount || 0,
            deletedComments:
                (deletedCommentsOnDeletedPosts.deletedCount || 0) +
                (deletedCommentsByUser.deletedCount || 0),
        });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({
            message: error.message || "Failed to delete user.",
        });
    }
};
