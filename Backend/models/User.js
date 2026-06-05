import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const savedGardenSchema = new mongoose.Schema(
    {
        title: { type: String, default: "Saved Garden" },
        image: { type: String, required: true },
        referenceImage: { type: String, default: "" },
        usedReferencePhoto: { type: Boolean, default: false },
        gardenStyle: { type: String, default: "flowering_cottage" },
        variationIndex: { type: Number, default: 0 },
        plants: {
            type: [
                {
                    plantId: { type: Number, default: null },
                    commonName: { type: String, default: "" },
                    scientificName: { type: String, default: "" },
                    image: { type: String, default: "" },
                },
            ],
            default: [],
        },
        savedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const userSchema = new mongoose.Schema(
    {
        name: String,
        email: { type: String, required: true, unique: true },
        communityUsername: { type: String, unique: true, sparse: true, index: true },
        password: String,
        verified: { type: Boolean, default: false },

        verificationToken: String,
        resetToken: String,
        passwordResetToken: { type: String, default: null },
        passwordResetExpires: { type: Date, default: null },

        profileImage: { type: String, default: "" },
        bio: { type: String, default: "" },
        location: { type: String, default: "" },
        role: { type: String, default: "Gardener" },
        systemRole: {
            type: String,
            enum: ["user", "admin", "superadmin"],
            default: "user",
        },
        subscriptionPlan: {
            type: String,
            enum: ["free", "premium"],
            default: "free",
        },
        premiumStatus: {
            type: String,
            enum: ["inactive", "active", "cancelled"],
            default: "inactive",
        },
        premiumActivatedAt: { type: Date, default: null },
        premiumExpiresAt: { type: Date, default: null },

        favourites: { type: [Number], default: [] },
        savedGardens: { type: [savedGardenSchema], default: [] },
        savedCommunityPosts: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "CommunityPost",
            default: [],
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

export default mongoose.model("User", userSchema);
