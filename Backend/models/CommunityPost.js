import mongoose from "mongoose";

const communityImageSchema = new mongoose.Schema(
    {
        id: { type: String, default: "" },
        src: { type: String, required: true },
        alt: { type: String, default: "" },
        isBefore: { type: Boolean, default: false },
        isAfter: { type: Boolean, default: false },
    },
    { _id: false }
);

const communityPlantSnapshotSchema = new mongoose.Schema(
    {
        id: { type: String, default: "" },
        plantId: { type: Number, default: null },
        name: { type: String, default: "" },
        latinName: { type: String, default: "" },
        category: { type: String, default: "Plant" },
        image: { type: String, default: "" },
    },
    { _id: false }
);

const communitySavedGardenSnapshotSchema = new mongoose.Schema(
    {
        id: { type: String, default: "" },
        title: { type: String, default: "Saved Garden" },
        style: { type: String, default: "flowering_cottage" },
        image: { type: String, default: "" },
        note: { type: String, default: "" },
        plants: { type: [String], default: [] },
    },
    { _id: false }
);

const communityPostSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "discussion",
                "question",
                "plant-tip",
                "garden-showcase",
                "progress-update",
                "local-note",
                "pest-alert",
            ],
            default: "discussion",
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        body: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        images: {
            type: [communityImageSchema],
            default: [],
        },
        plants: {
            type: [communityPlantSnapshotSchema],
            default: [],
        },
        savedGarden: {
            type: communitySavedGardenSnapshotSchema,
            default: null,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        region: {
            type: String,
            default: "",
        },
        isLocal: {
            type: Boolean,
            default: false,
            index: true,
        },
        solved: {
            type: Boolean,
            default: false,
        },
        solvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
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
        commentsCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

communityPostSchema.index({ createdAt: -1 });

export default mongoose.model("CommunityPost", communityPostSchema);
