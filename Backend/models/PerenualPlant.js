import mongoose from "mongoose";

const PerenualPlantSchema = new mongoose.Schema({}, { strict: false });

const PerenualPlant =
    mongoose.models.PerenualPlant ||
    mongoose.model("PerenualPlant", PerenualPlantSchema, "Perenual_Plants");

export default PerenualPlant;
