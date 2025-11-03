import mongoose from "mongoose";
import bcrypt from "bcrypt";
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    password: String,
    verified: { type: Boolean, default: false },
    verificationToken: String,
    resetToken: String,

    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },

});
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
export default mongoose.model("User", userSchema);
