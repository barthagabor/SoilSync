import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const [, , emailArg, roleArg] = process.argv;
const allowedRoles = ["user", "admin", "superadmin"];
const email = String(emailArg || "").trim().toLowerCase();
const systemRole = String(roleArg || "").trim().toLowerCase();

if (!email || !systemRole) {
    console.error('Usage: node scripts/setUserSystemRole.js "user@example.com" "admin"');
    process.exit(1);
}

if (!allowedRoles.includes(systemRole)) {
    console.error(`Invalid role. Allowed roles: ${allowedRoles.join(", ")}`);
    process.exit(1);
}

try {
    await mongoose.connect("mongodb://127.0.0.1:27017/soilsync");

    const user = await User.findOne({ email });
    if (!user) {
        console.error(`User not found for email: ${email}`);
        process.exit(1);
    }

    user.systemRole = systemRole;
    await user.save();

    console.log(`Updated ${user.email} to systemRole=${user.systemRole}`);
    await mongoose.disconnect();
} catch (error) {
    console.error("Failed to update system role:", error);
    try {
        await mongoose.disconnect();
    } catch {
        // no-op
    }
    process.exit(1);
}
