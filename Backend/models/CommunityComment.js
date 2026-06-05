import mongoose from "mongoose";

const communityCommentSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CommunityPost",
            required: true,
            index: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        parentComment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CommunityComment",
            default: null,
            index: true,
        },
        body: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2500,
        },
        likes: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },
        likesCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

communityCommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.model("CommunityComment", communityCommentSchema);
