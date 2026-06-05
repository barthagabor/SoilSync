import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Plant from "../models/Plant.js";
import EppoSyncRun from "../models/EppoSyncRun.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soilsync";
const CLOUDINARY_IMAGE_URL_PATTERN = /(?:^https?:\/\/)?(?:res\.)?cloudinary\.com\//i;

const getPlantImageCandidates = (plant) => {
    const image = plant?.default_image || {};
    return [
        image.regular_url,
        image.original_url,
        image.medium_url,
        image.small_url,
        image.thumbnail,
    ].filter(Boolean);
};

const detectImageStorageProvider = (plant) => {
    const candidates = getPlantImageCandidates(plant);
    if (!candidates.length) return "missing";
    if (candidates.some((value) => CLOUDINARY_IMAGE_URL_PATTERN.test(String(value)))) return "cloudinary";
    return "external";
};

async function run() {
    await mongoose.connect(MONGO_URI);

    const syncRun = await EppoSyncRun.create({
        jobType: "sync_plant_image_flags",
        meta: {},
    });

    try {
        const plants = await Plant.find({}, { id: 1, default_image: 1 }).lean();

        let cloudinaryCount = 0;
        let missingCount = 0;
        let externalCount = 0;
        const bulkOperations = plants.map((plant) => {
            const imageStorageProvider = detectImageStorageProvider(plant);
            const hasCloudinaryImage = imageStorageProvider === "cloudinary";

            if (hasCloudinaryImage) cloudinaryCount += 1;
            else if (imageStorageProvider === "missing") missingCount += 1;
            else externalCount += 1;

            return {
                updateOne: {
                    filter: { _id: plant._id },
                    update: {
                        $set: {
                            hasCloudinaryImage,
                            imageStorageProvider,
                        },
                    },
                },
            };
        });

        if (bulkOperations.length) {
            await Plant.bulkWrite(bulkOperations, { ordered: false });
        }

        syncRun.status = "success";
        syncRun.finishedAt = new Date();
        syncRun.processedCount = plants.length;
        syncRun.successCount = cloudinaryCount;
        syncRun.meta = {
            totalPlants: plants.length,
            cloudinaryCount,
            externalCount,
            missingCount,
        };
        await syncRun.save();

        console.log(
            `Synced image flags for ${plants.length} plants. Cloudinary ${cloudinaryCount}, external ${externalCount}, missing ${missingCount}.`
        );
    } catch (error) {
        syncRun.status = "failed";
        syncRun.finishedAt = new Date();
        syncRun.errorCount = 1;
        syncRun.errorItems = [{ message: error.message }];
        await syncRun.save();
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

run().catch((error) => {
    console.error("Failed to sync plant image flags:", error.message);
    process.exit(1);
});
