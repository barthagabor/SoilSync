import mongoose from "mongoose";
import User from "../models/User.js";
import Plant from "../models/Plant.js";
import CommunityPost from "../models/CommunityPost.js";
import CommunityComment from "../models/CommunityComment.js";
import { ensureCommunityIdentity } from "./communityIdentityService.js";

const COMMUNITY_POST_TYPE_OPTIONS = [
    { value: "discussion", label: "Discussion" },
    { value: "question", label: "Question" },
    { value: "plant-tip", label: "Plant Tip" },
    { value: "garden-showcase", label: "Garden Showcase" },
    { value: "progress-update", label: "Progress Update" },
    { value: "local-note", label: "Local Note" },
    { value: "pest-alert", label: "Pest Alert" },
];

const COMMUNITY_TOPIC_DEFINITIONS = [
    {
        slug: "planner-share",
        name: "Planner Shares",
        icon: "Layout",
        description: "Posts that connect planner output to real-life decisions.",
    },
    {
        slug: "plant-health",
        name: "Plant Health",
        icon: "Shield",
        description: "Questions, pest notes, and visible stress discussions.",
    },
    {
        slug: "local-notes",
        name: "Local Notes",
        icon: "MapPin",
        description: "Region-aware observations and short seasonal alerts.",
    },
    {
        slug: "progress",
        name: "Progress Updates",
        icon: "Clock3",
        description: "Before-and-after changes, refinements, and iteration.",
    },
    {
        slug: "pet-safe",
        name: "Pet Safe",
        icon: "Heart",
        description: "Practical recommendations for households with pets.",
    },
    {
        slug: "design",
        name: "Garden Design",
        icon: "PenTool",
        description: "Composition, spacing, restraint, and style discussion.",
    },
];

const COMMUNITY_TOPIC_ALIASES = {
    "planner-share": ["planner-share", "planner", "design-tip", "realism"],
    "plant-health": ["pest-risk", "dogwood", "humidity", "plant-health"],
    "local-notes": ["local", "cluj", "spring-soil", "local-notes"],
    progress: ["before-after", "gravel", "maintenance", "progress"],
    "pet-safe": ["pet-safe", "front-yard", "zone-6"],
    design: ["planner", "budget", "discussion", "design-tip", "realism", "design"],
};

const COMMUNITY_AVATAR_TONES = [
    "from-[#f3f8ea] via-[#dbe8c8] to-[#95b29b]",
    "from-[#fff5df] via-[#efe1b0] to-[#d8c487]",
    "from-[#fff6eb] via-[#f6dec4] to-[#e8c59d]",
    "from-[#edf6f4] via-[#d3e6df] to-[#8bb5a2]",
    "from-[#eef4fb] via-[#d8e4f2] to-[#9ab2c7]",
];

const COMMUNITY_USER_SELECT =
    "name email profileImage bio location systemRole subscriptionPlan premiumStatus createdAt savedGardens communityUsername";
const COMMUNITY_USER_SELECT_WITH_FAVOURITES = `${COMMUNITY_USER_SELECT} favourites`;

const normalizeText = (value) => String(value || "").trim();
const normalizeSearch = (value) => normalizeText(value).toLowerCase();

const getPrimaryScientificName = (plant) => {
    if (Array.isArray(plant?.scientific_name)) {
        return normalizeText(plant.scientific_name[0]);
    }

    return normalizeText(plant?.scientific_name);
};

const getPlantCategory = (plant) =>
    normalizeText(plant?.details?.type || plant?.type || plant?.category || "Plant") || "Plant";

const getPlantImage = (plant) =>
    normalizeText(
        plant?.default_image?.regular_url ||
            plant?.default_image?.original_url ||
            plant?.default_image?.medium_url ||
            plant?.default_image?.small_url ||
            plant?.default_image?.thumbnail
    );

const isPremiumActive = (user) =>
    user?.subscriptionPlan === "premium" && user?.premiumStatus === "active";

const getCommunityRegionLabel = (location) => {
    const normalized = normalizeText(location);
    return normalized || "Romania & Central Europe";
};

const getLocationFragments = (location) => {
    const normalized = normalizeText(location);
    if (!normalized) return [];

    return [...new Set([normalized, ...normalized.split(",").map((entry) => normalizeText(entry)).filter(Boolean)])];
};

const hashString = (value) =>
    Array.from(String(value || "")).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);

const getAvatarTone = (user) =>
    COMMUNITY_AVATAR_TONES[hashString(user?.communityUsername || user?._id || user?.email || user?.name) % COMMUNITY_AVATAR_TONES.length];

const normalizeTag = (value) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const parseTagInput = (value) => {
    const rawTags = Array.isArray(value) ? value : String(value || "").split(",");
    return [...new Set(rawTags.map((tag) => normalizeTag(tag)).filter(Boolean))].slice(0, 8);
};

const buildSavedGardenSnapshot = (garden) => {
    if (!garden) return null;

    const plantNames = Array.isArray(garden.plants)
        ? garden.plants
              .map((plant) => normalizeText(plant?.commonName || plant?.scientificName))
              .filter(Boolean)
              .slice(0, 6)
        : [];

    return {
        id: String(garden._id),
        title: normalizeText(garden.title) || "Saved Garden",
        style: normalizeText(garden.gardenStyle) || "flowering_cottage",
        image: normalizeText(garden.image),
        note: "Attached from your saved planner results.",
        plants: plantNames,
    };
};

const serializePlantForCommunity = (plant) => ({
    id: String(plant?.id || plant?._id || ""),
    plantId: Number.isFinite(Number(plant?.id)) ? Number(plant.id) : null,
    name: normalizeText(plant?.common_name) || getPrimaryScientificName(plant) || "Plant",
    latinName: getPrimaryScientificName(plant),
    category: getPlantCategory(plant),
    image: getPlantImage(plant),
});

const getMemberStats = (user, statMaps = {}) => {
    const userId = String(user?._id || "");
    const postStats = statMaps.postStats?.get(userId) || {};
    const commentStats = statMaps.commentStats?.get(userId) || {};
    const savedGardensCount = Array.isArray(user?.savedGardens) ? user.savedGardens.length : 0;

    const posts = Number(postStats.posts || 0);
    const helpfulAnswers = Number(commentStats.helpfulAnswers || 0);
    const showcases = Number(postStats.showcases || 0);
    const followers = Number(postStats.likesReceived || 0) + Number(commentStats.likesReceived || 0);

    return {
        posts,
        helpfulAnswers,
        showcases,
        followers,
        savedGardensCount,
    };
};

const buildMemberBadges = (user) => {
    const badges = [];

    if (user?.systemRole === "superadmin") badges.push("Superadmin");
    else if (user?.systemRole === "admin") badges.push("Admin");

    return badges.slice(0, 3);
};

const serializeMember = (user, statMaps = {}) => {
    const stats = getMemberStats(user, statMaps);

    return {
        id: String(user?._id || ""),
        name: normalizeText(user?.name) || "SoilSync Member",
        username: normalizeText(user?.communityUsername) || "soilsync_member",
        profileImage: normalizeText(user?.profileImage),
        bio: normalizeText(user?.bio) || "SoilSync community member.",
        location: normalizeText(user?.location) || "Location not set",
        region: getCommunityRegionLabel(user?.location),
        systemRole: normalizeText(user?.systemRole) || "user",
        premium: isPremiumActive(user),
        joinedAt: user?.createdAt || null,
        avatarTone: getAvatarTone(user),
        stats: {
            posts: stats.posts,
            helpfulAnswers: stats.helpfulAnswers,
            showcases: stats.showcases,
            followers: stats.followers,
        },
        badges: buildMemberBadges(user),
    };
};

const serializeSavedGarden = (garden) => ({
    id: String(garden?._id || ""),
    title: normalizeText(garden?.title) || "Saved Garden",
    style: normalizeText(garden?.gardenStyle) || "flowering_cottage",
    image: normalizeText(garden?.image),
    note: "Shared from the SoilSync planner.",
    plants: Array.isArray(garden?.plants)
        ? garden.plants
              .map((plant) => normalizeText(plant?.commonName || plant?.scientificName))
              .filter(Boolean)
              .slice(0, 6)
        : [],
    savedAt: garden?.savedAt || null,
});

const serializeSavedGardenSnapshot = (garden) => {
    if (!garden?.image) return null;

    return {
        id: normalizeText(garden?.id),
        title: normalizeText(garden?.title) || "Saved Garden",
        style: normalizeText(garden?.style) || "flowering_cottage",
        image: normalizeText(garden?.image),
        note: normalizeText(garden?.note) || "Attached from your saved planner results.",
        plants: Array.isArray(garden?.plants) ? garden.plants.filter(Boolean) : [],
    };
};

const serializePost = (post, statMaps = {}, options = {}) => {
    const currentUserId = String(options.currentUserId || "");
    const postId = String(post?._id || "");
    const likedByCurrentUser = currentUserId
        ? Array.isArray(post?.likes) && post.likes.some((entry) => String(entry) === currentUserId)
        : false;
    const savedByCurrentUser =
        currentUserId && options.savedPostIdSet instanceof Set ? options.savedPostIdSet.has(postId) : false;

    return {
        id: postId,
        type: normalizeText(post?.type) || "discussion",
        title: normalizeText(post?.title) || "Untitled community post",
        body: normalizeText(post?.body),
        author: serializeMember(post?.author, statMaps),
        createdAt: post?.createdAt || null,
        images: Array.isArray(post?.images)
            ? post.images
                  .filter((image) => normalizeText(image?.src))
                  .map((image, index) => ({
                      id: normalizeText(image?.id) || `${String(post?._id || "post")}-image-${index + 1}`,
                      src: normalizeText(image?.src),
                      alt: normalizeText(image?.alt) || normalizeText(post?.title) || "Community image",
                      isBefore: Boolean(image?.isBefore),
                      isAfter: Boolean(image?.isAfter),
                  }))
            : [],
        plants: Array.isArray(post?.plants)
            ? post.plants.map((plant, index) => ({
                  id: normalizeText(plant?.id) || `${String(post?._id || "post")}-plant-${index + 1}`,
                  plantId: Number.isFinite(Number(plant?.plantId)) ? Number(plant.plantId) : null,
                  name: normalizeText(plant?.name) || "Plant",
                  latinName: normalizeText(plant?.latinName),
                  category: normalizeText(plant?.category) || "Plant",
                  image: normalizeText(plant?.image),
              }))
            : [],
        savedGarden: serializeSavedGardenSnapshot(post?.savedGarden),
        tags: Array.isArray(post?.tags) ? post.tags.filter(Boolean) : [],
        region: normalizeText(post?.region),
        isLocal: Boolean(post?.isLocal),
        likes: Number(post?.likesCount || 0),
        comments: Number(post?.commentsCount || 0),
        likedByCurrentUser,
        savedByCurrentUser,
        solved: Boolean(post?.solved),
        solvedBy: post?.solvedBy ? serializeMember(post.solvedBy, statMaps) : null,
    };
};

const serializeComment = (comment, statMaps = {}) => ({
    id: String(comment?._id || ""),
    author: serializeMember(comment?.author, statMaps),
    createdAt: comment?.createdAt || null,
    likes: Number(comment?.likesCount || 0),
    body: normalizeText(comment?.body),
    replies: [],
});

const buildCommentTree = (comments, statMaps = {}) => {
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach((comment) => {
        commentMap.set(String(comment._id), serializeComment(comment, statMaps));
    });

    comments.forEach((comment) => {
        const serialized = commentMap.get(String(comment._id));
        const parentId = comment.parentComment ? String(comment.parentComment) : "";

        if (parentId && commentMap.has(parentId)) {
            commentMap.get(parentId).replies.push(serialized);
        } else {
            rootComments.push(serialized);
        }
    });

    return rootComments;
};

const getStatMapsForUsers = async (userIds = []) => {
    const normalizedIds = [...new Set(userIds.map((userId) => String(userId)).filter(Boolean))];
    if (!normalizedIds.length) {
        return {
            postStats: new Map(),
            commentStats: new Map(),
        };
    }

    const objectIds = normalizedIds.map((userId) => new mongoose.Types.ObjectId(userId));

    const [postStatsRaw, commentStatsRaw] = await Promise.all([
        CommunityPost.aggregate([
            { $match: { author: { $in: objectIds } } },
            {
                $group: {
                    _id: "$author",
                    posts: { $sum: 1 },
                    showcases: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "garden-showcase"] }, 1, 0],
                        },
                    },
                    likesReceived: { $sum: "$likesCount" },
                },
            },
        ]),
        CommunityComment.aggregate([
            { $match: { author: { $in: objectIds } } },
            {
                $group: {
                    _id: "$author",
                    helpfulAnswers: { $sum: 1 },
                    likesReceived: { $sum: "$likesCount" },
                },
            },
        ]),
    ]);

    return {
        postStats: new Map(
            postStatsRaw.map((entry) => [
                String(entry._id),
                {
                    posts: Number(entry.posts || 0),
                    showcases: Number(entry.showcases || 0),
                    likesReceived: Number(entry.likesReceived || 0),
                },
            ])
        ),
        commentStats: new Map(
            commentStatsRaw.map((entry) => [
                String(entry._id),
                {
                    helpfulAnswers: Number(entry.helpfulAnswers || 0),
                    likesReceived: Number(entry.likesReceived || 0),
                },
            ])
        ),
    };
};

const ensureCommunityIdentityForUsers = async (users = []) => {
    const uniqueUsers = [];
    const seen = new Set();

    users.forEach((user) => {
        const userId = String(user?._id || "");
        if (!userId || seen.has(userId)) return;
        seen.add(userId);
        uniqueUsers.push(user);
    });

    await Promise.all(uniqueUsers.map((user) => ensureCommunityIdentity(user, { save: true })));
};

const filterPostsInMemory = (posts, { activeFilter = "all", searchTerm = "", activeTag = "", location = "" } = {}) => {
    const normalizedSearch = normalizeSearch(searchTerm);
    const locationTerms = getLocationFragments(location).map((entry) => normalizeSearch(entry));

    return posts.filter((post) => {
        if (activeFilter === "questions" && post.type !== "question") return false;
        if (activeFilter === "gardens" && post.type !== "garden-showcase") return false;
        if (activeFilter === "tips" && post.type !== "plant-tip") return false;
        if (activeFilter === "progress" && post.type !== "progress-update") return false;
        if (activeFilter === "local") {
            const normalizedRegion = normalizeSearch(post.region);
            const hasRegionalMatch = locationTerms.some((term) => term && normalizedRegion.includes(term));
            if (!post.isLocal && !hasRegionalMatch) return false;
        }

        if (activeTag) {
            const hasTagMatch = (post.tags || []).some((tag) => normalizeSearch(tag) === normalizeSearch(activeTag));
            if (!hasTagMatch) return false;
        }

        if (normalizedSearch) {
            const searchableText = [
                post.title,
                post.body,
                post.author?.name,
                post.author?.username,
                post.region,
                ...(post.tags || []),
                ...(post.plants || []).flatMap((plant) => [plant.name, plant.latinName]),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            if (!searchableText.includes(normalizedSearch)) return false;
        }

        return true;
    });
};

const getTrendingTopics = (posts, limit = 5) => {
    const counts = new Map();

    posts.forEach((post) => {
        (post.tags || []).forEach((tag) => {
            const normalizedTag = normalizeTag(tag);
            if (!normalizedTag) return;
            counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1);
        });
    });

    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
};

const getTopicCards = (posts) =>
    COMMUNITY_TOPIC_DEFINITIONS.map((topic) => ({
        ...topic,
        postCount: posts.filter((post) =>
            (post.tags || []).some((tag) =>
                (COMMUNITY_TOPIC_ALIASES[topic.slug] || [topic.slug]).includes(normalizeTag(tag))
            )
        ).length,
    }));

const getSuggestedMembers = async (excludeUserId = null, limit = 4) => {
    const recentPosts = await CommunityPost.find({})
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("author", COMMUNITY_USER_SELECT)
        .exec();

    const recentAuthors = recentPosts
        .map((post) => post.author)
        .filter(Boolean)
        .filter((author) => String(author._id) !== String(excludeUserId || ""));

    await ensureCommunityIdentityForUsers(recentAuthors);

    const uniqueAuthors = [];
    const seen = new Set();

    recentAuthors.forEach((author) => {
        const userId = String(author._id);
        if (seen.has(userId)) return;
        seen.add(userId);
        uniqueAuthors.push(author);
    });

    const statMaps = await getStatMapsForUsers(uniqueAuthors.map((author) => author._id));

    return uniqueAuthors
        .map((author) => serializeMember(author, statMaps))
        .sort((left, right) => {
            const leftScore = left.stats.posts + left.stats.helpfulAnswers;
            const rightScore = right.stats.posts + right.stats.helpfulAnswers;
            return rightScore - leftScore;
        })
        .slice(0, limit);
};

const getSavedCommunityPostIdSet = async (currentUserId = null) => {
    if (!currentUserId) {
        return new Set();
    }

    const currentUser = await User.findById(currentUserId).select("savedCommunityPosts").lean();
    if (!currentUser) {
        return new Set();
    }

    return new Set(
        (Array.isArray(currentUser.savedCommunityPosts) ? currentUser.savedCommunityPosts : [])
            .map((postId) => String(postId))
            .filter(Boolean)
    );
};

export const getCommunityFeed = async ({
    activeFilter = "all",
    searchTerm = "",
    activeTag = "",
    location = "",
    currentUserId = null,
} = {}) => {
    const postDocs = await CommunityPost.find({})
        .sort({ createdAt: -1 })
        .populate("author", COMMUNITY_USER_SELECT)
        .populate("solvedBy", COMMUNITY_USER_SELECT)
        .exec();

    const usersToEnsure = [];
    postDocs.forEach((post) => {
        if (post.author) usersToEnsure.push(post.author);
        if (post.solvedBy) usersToEnsure.push(post.solvedBy);
    });
    await ensureCommunityIdentityForUsers(usersToEnsure);

    const [statMaps, savedPostIdSet] = await Promise.all([
        getStatMapsForUsers(usersToEnsure.map((user) => user._id)),
        getSavedCommunityPostIdSet(currentUserId),
    ]);
    const serializationOptions = { currentUserId, savedPostIdSet };
    const serializedPosts = postDocs.map((post) => serializePost(post, statMaps, serializationOptions));
    const filteredPosts = filterPostsInMemory(serializedPosts, {
        activeFilter,
        searchTerm,
        activeTag,
        location,
    });

    const [suggestedMembers] = await Promise.all([getSuggestedMembers(currentUserId, 4)]);

    return {
        posts: filteredPosts,
        trendingTopics: getTrendingTopics(serializedPosts),
        topicCards: getTopicCards(serializedPosts),
        suggestedMembers,
        summary: {
            posts: serializedPosts.length,
            members: new Set(serializedPosts.map((post) => post.author?.id).filter(Boolean)).size,
            sharedGardens: serializedPosts.filter((post) => post.savedGarden).length,
            localNotes: serializedPosts.filter((post) => post.isLocal).length,
        },
    };
};

export const getCommunityPostDetail = async (postId, currentUserId = null) => {
    const postDoc = await CommunityPost.findById(postId)
        .populate("author", COMMUNITY_USER_SELECT)
        .populate("solvedBy", COMMUNITY_USER_SELECT)
        .exec();

    if (!postDoc) {
        return null;
    }

    const commentDocs = await CommunityComment.find({ post: postDoc._id })
        .sort({ createdAt: 1 })
        .populate("author", COMMUNITY_USER_SELECT)
        .exec();

    const relatedPostDocs = await CommunityPost.find({
        author: postDoc.author?._id,
        _id: { $ne: postDoc._id },
    })
        .sort({ createdAt: -1 })
        .limit(2)
        .populate("author", COMMUNITY_USER_SELECT)
        .populate("solvedBy", COMMUNITY_USER_SELECT)
        .exec();

    const usersToEnsure = [
        postDoc.author,
        postDoc.solvedBy,
        ...commentDocs.map((comment) => comment.author),
        ...relatedPostDocs.map((post) => post.author),
        ...relatedPostDocs.map((post) => post.solvedBy),
    ].filter(Boolean);

    await ensureCommunityIdentityForUsers(usersToEnsure);

    const [statMaps, savedPostIdSet] = await Promise.all([
        getStatMapsForUsers(usersToEnsure.map((user) => user._id)),
        getSavedCommunityPostIdSet(currentUserId),
    ]);
    const serializationOptions = { currentUserId, savedPostIdSet };

    return {
        post: serializePost(postDoc, statMaps, serializationOptions),
        comments: buildCommentTree(commentDocs, statMaps),
        relatedPosts: relatedPostDocs.map((post) => serializePost(post, statMaps, serializationOptions)),
    };
};

export const getCommunityMemberDetail = async (username, currentUserId = null) => {
    const member = await User.findOne({ communityUsername: username }).select(COMMUNITY_USER_SELECT);

    if (!member) {
        return null;
    }

    await ensureCommunityIdentity(member, { save: true });

    const [postDocs, commentCount] = await Promise.all([
        CommunityPost.find({ author: member._id })
            .sort({ createdAt: -1 })
            .populate("author", COMMUNITY_USER_SELECT)
            .populate("solvedBy", COMMUNITY_USER_SELECT)
            .exec(),
        CommunityComment.countDocuments({ author: member._id }),
    ]);

    const usersToEnsure = [member, ...postDocs.map((post) => post.author), ...postDocs.map((post) => post.solvedBy)].filter(Boolean);
    await ensureCommunityIdentityForUsers(usersToEnsure);

    const [statMaps, savedPostIdSet] = await Promise.all([
        getStatMapsForUsers([member._id, ...usersToEnsure.map((user) => user._id)]),
        getSavedCommunityPostIdSet(currentUserId),
    ]);
    const serializationOptions = { currentUserId, savedPostIdSet };
    const serializedMember = serializeMember(member, statMaps);
    serializedMember.stats.helpfulAnswers = commentCount;

    return {
        member: serializedMember,
        posts: postDocs.map((post) => serializePost(post, statMaps, serializationOptions)),
        gardens: (Array.isArray(member.savedGardens) ? member.savedGardens : []).map(serializeSavedGarden),
    };
};

export const getCommunityTopics = async (tag = "", currentUserId = null) => {
    const postDocs = await CommunityPost.find({})
        .sort({ createdAt: -1 })
        .populate("author", COMMUNITY_USER_SELECT)
        .populate("solvedBy", COMMUNITY_USER_SELECT)
        .exec();

    const usersToEnsure = [];
    postDocs.forEach((post) => {
        if (post.author) usersToEnsure.push(post.author);
        if (post.solvedBy) usersToEnsure.push(post.solvedBy);
    });
    await ensureCommunityIdentityForUsers(usersToEnsure);

    const [statMaps, savedPostIdSet] = await Promise.all([
        getStatMapsForUsers(usersToEnsure.map((user) => user._id)),
        getSavedCommunityPostIdSet(currentUserId),
    ]);
    const serializationOptions = { currentUserId, savedPostIdSet };
    const serializedPosts = postDocs.map((post) => serializePost(post, statMaps, serializationOptions));
    const normalizedTag = normalizeTag(tag);

    return {
        topics: getTopicCards(serializedPosts),
        focusedPosts: normalizedTag
            ? serializedPosts.filter((post) =>
                  (post.tags || []).some((entry) =>
                      (COMMUNITY_TOPIC_ALIASES[normalizedTag] || [normalizedTag]).includes(normalizeTag(entry))
                  )
              )
            : [],
    };
};

export const getCommunityComposerContext = async (userId) => {
    const user = await User.findById(userId).select(COMMUNITY_USER_SELECT_WITH_FAVOURITES);

    if (!user) {
        throw new Error("User not found.");
    }

    await ensureCommunityIdentity(user, { save: true });

    const favouriteIds = Array.isArray(user.favourites)
        ? user.favourites.map((plantId) => Number(plantId)).filter((plantId) => Number.isFinite(plantId))
        : [];

    let plantDocs = [];

    if (favouriteIds.length) {
        plantDocs = await Plant.find({ id: { $in: favouriteIds } })
            .sort({ common_name: 1 })
            .limit(16)
            .exec();
    }

    if (!plantDocs.length) {
        plantDocs = await Plant.find({ hasCloudinaryImage: true })
            .sort({ common_name: 1 })
            .limit(16)
            .exec();
    }

    return {
        postTypeOptions: COMMUNITY_POST_TYPE_OPTIONS,
        availablePlants: plantDocs.map(serializePlantForCommunity),
        savedGardens: (Array.isArray(user.savedGardens) ? user.savedGardens : [])
            .filter((garden) => normalizeText(garden?.image))
            .map(serializeSavedGarden),
        suggestedRegion: normalizeText(user.location),
        author: serializeMember(user, await getStatMapsForUsers([user._id])),
    };
};

export const createCommunityPost = async (userId, payload = {}) => {
    const user = await User.findById(userId).select(COMMUNITY_USER_SELECT);

    if (!user) {
        throw new Error("User not found.");
    }

    await ensureCommunityIdentity(user, { save: true });

    const type = COMMUNITY_POST_TYPE_OPTIONS.some((option) => option.value === payload.type)
        ? payload.type
        : "discussion";
    const title = normalizeText(payload.title);
    const body = normalizeText(payload.body);

    if (!title || title.length < 6) {
        throw new Error("Post title must be at least 6 characters long.");
    }

    if (!body || body.length < 20) {
        throw new Error("Post body must be at least 20 characters long.");
    }

    const selectedPlantIds = Array.isArray(payload.selectedPlantIds)
        ? payload.selectedPlantIds
        : Array.isArray(payload.plantIds)
            ? payload.plantIds
            : [];

    const numericPlantIds = selectedPlantIds
        .map((plantId) => Number(plantId))
        .filter((plantId) => Number.isFinite(plantId))
        .slice(0, 4);

    const plantDocs = numericPlantIds.length
        ? await Plant.find({ id: { $in: numericPlantIds } }).limit(4).exec()
        : [];

    const selectedGardenId = normalizeText(payload.selectedGardenId || payload.savedGardenId);
    const attachedGarden = Array.isArray(user.savedGardens)
        ? user.savedGardens.find((garden) => String(garden._id) === selectedGardenId)
        : null;
    const savedGardenSnapshot = buildSavedGardenSnapshot(attachedGarden);

    const region = normalizeText(payload.region) || normalizeText(user.location);
    const tags = parseTagInput(payload.tags);

    const communityPost = await CommunityPost.create({
        type,
        title,
        body,
        author: user._id,
        images: savedGardenSnapshot?.image
            ? [
                  {
                      id: `saved-garden-${savedGardenSnapshot.id}`,
                      src: savedGardenSnapshot.image,
                      alt: savedGardenSnapshot.title,
                  },
              ]
            : [],
        plants: plantDocs.map(serializePlantForCommunity),
        savedGarden: savedGardenSnapshot,
        tags,
        region,
        isLocal: Boolean(payload.isLocal),
    });

    const hydratedPost = await CommunityPost.findById(communityPost._id)
        .populate("author", COMMUNITY_USER_SELECT)
        .exec();

    const statMaps = await getStatMapsForUsers([user._id]);

    return serializePost(hydratedPost, statMaps);
};

export const createCommunityComment = async (userId, postId, payload = {}) => {
    const user = await User.findById(userId).select(COMMUNITY_USER_SELECT);
    if (!user) {
        throw new Error("User not found.");
    }

    await ensureCommunityIdentity(user, { save: true });

    const post = await CommunityPost.findById(postId);
    if (!post) {
        throw new Error("Community post not found.");
    }

    const body = normalizeText(payload.body);
    if (!body || body.length < 3) {
        throw new Error("Comment body must be at least 3 characters long.");
    }

    const parentCommentId = normalizeText(payload.parentCommentId);
    let parentComment = null;

    if (parentCommentId) {
        if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
            throw new Error("Invalid parent comment reference.");
        }

        parentComment = await CommunityComment.findOne({
            _id: parentCommentId,
            post: post._id,
        }).select("_id");

        if (!parentComment) {
            throw new Error("Parent comment not found.");
        }
    }

    const comment = await CommunityComment.create({
        post: post._id,
        author: user._id,
        parentComment: parentComment?._id || null,
        body,
    });

    post.commentsCount = Number(post.commentsCount || 0) + 1;
    await post.save();

    const hydratedComment = await CommunityComment.findById(comment._id)
        .populate("author", COMMUNITY_USER_SELECT)
        .exec();

    const statMaps = await getStatMapsForUsers([user._id]);
    return serializeComment(hydratedComment, statMaps);
};

export const toggleCommunityPostLike = async (userId, postId) => {
    const post = await CommunityPost.findById(postId);
    if (!post) {
        throw new Error("Community post not found.");
    }

    const normalizedUserId = String(userId);
    const existingIndex = (post.likes || []).findIndex((entry) => String(entry) === normalizedUserId);

    if (existingIndex >= 0) {
        post.likes.splice(existingIndex, 1);
    } else {
        post.likes.push(userId);
    }

    post.likesCount = post.likes.length;
    await post.save();

    return {
        liked: existingIndex < 0,
        likes: post.likesCount,
    };
};

export const toggleCommunityPostSave = async (userId, postId) => {
    const [user, post] = await Promise.all([
        User.findById(userId).select("savedCommunityPosts"),
        CommunityPost.findById(postId).select("_id"),
    ]);

    if (!post) {
        throw new Error("Community post not found.");
    }

    if (!user) {
        throw new Error("User not found.");
    }

    const normalizedPostId = String(post._id);
    const existingIndex = (user.savedCommunityPosts || []).findIndex((entry) => String(entry) === normalizedPostId);

    if (existingIndex >= 0) {
        user.savedCommunityPosts.splice(existingIndex, 1);
    } else {
        user.savedCommunityPosts.push(post._id);
    }

    await user.save();

    return {
        saved: existingIndex < 0,
    };
};
