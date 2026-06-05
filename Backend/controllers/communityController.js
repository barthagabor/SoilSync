import {
    createCommunityComment,
    createCommunityPost,
    getCommunityComposerContext,
    getCommunityFeed,
    getCommunityMemberDetail,
    getCommunityPostDetail,
    getCommunityTopics,
    toggleCommunityPostLike,
    toggleCommunityPostSave,
} from "../services/communityService.js";

export const fetchCommunityFeed = async (req, res) => {
    try {
        const data = await getCommunityFeed({
            activeFilter: req.query.filter || "all",
            searchTerm: req.query.search || "",
            activeTag: req.query.tag || "",
            location: req.query.location || "",
            currentUserId: req.user?.userId || null,
        });

        res.json(data);
    } catch (error) {
        console.error("Community feed error:", error);
        res.status(500).json({ message: "Failed to load community feed." });
    }
};

export const fetchCommunityPostDetail = async (req, res) => {
    try {
        const data = await getCommunityPostDetail(req.params.postId, req.user?.userId || null);
        if (!data) {
            return res.status(404).json({ message: "Community post not found." });
        }

        res.json(data);
    } catch (error) {
        console.error("Community post detail error:", error);
        res.status(500).json({ message: "Failed to load community post." });
    }
};

export const fetchCommunityMemberDetail = async (req, res) => {
    try {
        const data = await getCommunityMemberDetail(req.params.username, req.user?.userId || null);
        if (!data) {
            return res.status(404).json({ message: "Community member not found." });
        }

        res.json(data);
    } catch (error) {
        console.error("Community member detail error:", error);
        res.status(500).json({ message: "Failed to load community member." });
    }
};

export const fetchCommunityTopics = async (req, res) => {
    try {
        const data = await getCommunityTopics(req.query.tag || "", req.user?.userId || null);
        res.json(data);
    } catch (error) {
        console.error("Community topics error:", error);
        res.status(500).json({ message: "Failed to load community topics." });
    }
};

export const fetchCommunityComposerContext = async (req, res) => {
    try {
        const data = await getCommunityComposerContext(req.user.userId);
        res.json(data);
    } catch (error) {
        console.error("Community composer context error:", error);
        const statusCode = error.message === "User not found." ? 404 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to load composer context." });
    }
};

export const publishCommunityPost = async (req, res) => {
    try {
        const post = await createCommunityPost(req.user.userId, req.body || {});
        res.status(201).json({
            message: "Community post published successfully.",
            post,
        });
    } catch (error) {
        console.error("Community post create error:", error);
        const isValidationError =
            error.message?.includes("must be") ||
            error.message?.includes("not found") ||
            error.message?.includes("Invalid");

        res.status(isValidationError ? 400 : 500).json({
            message: error.message || "Failed to publish community post.",
        });
    }
};

export const publishCommunityComment = async (req, res) => {
    try {
        const comment = await createCommunityComment(req.user.userId, req.params.postId, req.body || {});
        res.status(201).json({
            message: "Comment published successfully.",
            comment,
        });
    } catch (error) {
        console.error("Community comment create error:", error);
        const isValidationError =
            error.message?.includes("must be") ||
            error.message?.includes("not found") ||
            error.message?.includes("Invalid");

        res.status(isValidationError ? 400 : 500).json({
            message: error.message || "Failed to publish comment.",
        });
    }
};

export const togglePostLike = async (req, res) => {
    try {
        const data = await toggleCommunityPostLike(req.user.userId, req.params.postId);
        res.json(data);
    } catch (error) {
        console.error("Community like toggle error:", error);
        const statusCode = error.message === "Community post not found." ? 404 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to toggle post like." });
    }
};

export const togglePostSave = async (req, res) => {
    try {
        const data = await toggleCommunityPostSave(req.user.userId, req.params.postId);
        res.json(data);
    } catch (error) {
        console.error("Community save toggle error:", error);
        const statusCode = error.message === "Community post not found." ? 404 : 500;
        res.status(statusCode).json({ message: error.message || "Failed to toggle post save." });
    }
};
