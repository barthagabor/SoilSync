import express from "express";
import {
    fetchCommunityComposerContext,
    fetchCommunityFeed,
    fetchCommunityMemberDetail,
    fetchCommunityPostDetail,
    fetchCommunityTopics,
    publishCommunityComment,
    publishCommunityPost,
    togglePostLike,
    togglePostSave,
} from "../controllers/communityController.js";
import { attachUserIfPresent, authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/feed", attachUserIfPresent, fetchCommunityFeed);
router.get("/topics", attachUserIfPresent, fetchCommunityTopics);
router.get("/posts/:postId", attachUserIfPresent, fetchCommunityPostDetail);
router.get("/members/:username", attachUserIfPresent, fetchCommunityMemberDetail);

router.get("/composer-context", authenticateToken, fetchCommunityComposerContext);
router.post("/posts", authenticateToken, publishCommunityPost);
router.post("/posts/:postId/comments", authenticateToken, publishCommunityComment);
router.post("/posts/:postId/like", authenticateToken, togglePostLike);
router.post("/posts/:postId/save", authenticateToken, togglePostSave);

export default router;
