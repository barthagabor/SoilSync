import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";
import mongoose from "mongoose";
import PerenualPlant from "../models/PerenualPlant.js";
import { enrichRecommendationResultsWithPestRisk } from "../utils/pestRisk.js";
import {
    canonicalizeCareLevel,
    canonicalizeCycle,
    canonicalizeSoil,
    canonicalizeSunlight,
    canonicalizeType,
    canonicalizeWatering,
    collectDistinctValues,
    normalizeOptionValue,
} from "../utils/plantCatalog.js";

const resolvePythonExecutable = () => {
    const virtualEnvCandidates = (baseDir) =>
        baseDir
            ? [
                path.join(baseDir, "Scripts", "python.exe"),
                path.join(baseDir, "bin", "python3"),
                path.join(baseDir, "bin", "python"),
            ]
            : [];

    const candidates = [
        normalizeOptionValue(process.env.PYTHON_EXECUTABLE),
        ...virtualEnvCandidates(normalizeOptionValue(process.env.VIRTUAL_ENV)),
        ...virtualEnvCandidates(path.resolve(process.cwd(), "..", ".venv")),
        ...virtualEnvCandidates(path.resolve(process.cwd(), ".venv")),
        "python3",
        "python",
    ];

    return (
        candidates.find(
            (candidate) =>
                candidate && (candidate === "python" || candidate === "python3" || existsSync(candidate))
        ) || "python3"
    );
};

const PYTHON_EXECUTABLE = resolvePythonExecutable();

const spawnPythonScript = (scriptRelativePath, args = []) =>
    spawn(PYTHON_EXECUTABLE, [scriptRelativePath, ...args], { cwd: process.cwd() });

const buildXgbArgsFromPrefs = (prefs = {}, topK = 6) => {
    const args = ["--top-k", String(topK), "--queries", "20"];

    const mongoUri = normalizeOptionValue(process.env.MONGO_URI) || "mongodb://127.0.0.1:27017/soilsync";
    const mongoDatabase = normalizeOptionValue(mongoose.connection?.name) || "soilsync";

    args.push("--mongo-uri", mongoUri);
    args.push("--database", mongoDatabase);
    args.push("--collection", "Perenual_Plants");

    if (normalizeOptionValue(prefs.watering)) args.push("--watering", String(prefs.watering));
    if (normalizeOptionValue(prefs.care_level)) args.push("--care-level", String(prefs.care_level));
    if (normalizeOptionValue(prefs.type)) args.push("--type", String(prefs.type));
    if (normalizeOptionValue(prefs.cycle)) args.push("--cycle", String(prefs.cycle));
    if (prefs.hardiness_zone !== undefined && prefs.hardiness_zone !== null && prefs.hardiness_zone !== "") {
        args.push("--hardiness-zone", String(prefs.hardiness_zone));
    }
    if (prefs.low_maintenance) args.push("--low-maintenance");
    if (prefs.pet_safe) args.push("--pet-safe");
    if (prefs.medicinal) args.push("--medicinal");

    return args;
};

const buildXgbFitLabel = (score) => {
    if (score >= 85) return "Excellent";
    if (score >= 65) return "Good";
    return "Possible";
};

const normalizeXgbDisplayScore = (rawScore, index, rawScores = []) => {
    const safeScores = rawScores.filter((value) => Number.isFinite(value));
    const maxScore = safeScores.length ? Math.max(...safeScores) : rawScore;
    const minScore = safeScores.length ? Math.min(...safeScores) : rawScore;

    if (!Number.isFinite(rawScore)) return Math.max(45, 80 - index * 4);
    if (!Number.isFinite(maxScore) || !Number.isFinite(minScore) || Math.abs(maxScore - minScore) < 0.0001) {
        return Math.max(55, 95 - index * 4);
    }

    return Number((55 + ((rawScore - minScore) / (maxScore - minScore)) * 40).toFixed(2));
};

const buildXgbRiskFlags = (plant, prefs = {}) => {
    const flags = [];

    if (prefs.low_maintenance && normalizeOptionValue(plant.maintenance)?.toLowerCase() !== "low") {
        flags.push("Not strictly low maintenance");
    }

    if (prefs.pet_safe && plant.pet_safe !== 1) {
        flags.push("Not marked pet safe");
    }

    if (prefs.medicinal && plant.medicinal !== 1) {
        flags.push("Not marked medicinal");
    }

    if (
        normalizeOptionValue(prefs.care_level) &&
        normalizeOptionValue(plant.care_level) &&
        normalizeOptionValue(plant.care_level) !== normalizeOptionValue(prefs.care_level)
    ) {
        flags.push(`Care level differs from ${prefs.care_level}`);
    }

    if (
        prefs.hardiness_zone !== undefined &&
        prefs.hardiness_zone !== null &&
        prefs.hardiness_zone !== "" &&
        plant.hardiness_min !== null &&
        plant.hardiness_max !== null
    ) {
        const zone = Number(prefs.hardiness_zone);
        const zmin = Number(plant.hardiness_min);
        const zmax = Number(plant.hardiness_max);
        if (Number.isFinite(zone) && Number.isFinite(zmin) && Number.isFinite(zmax) && (zone < zmin || zone > zmax)) {
            flags.push("Outside your hardiness zone");
        }
    }

    return flags.slice(0, 3);
};

const adaptXgbSummaryToFrontendResults = (summary = {}, prefs = {}) => {
    const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations : [];
    const rawScores = recommendations.map((entry) => Number(entry.xgb_score));
    const supportedPreferences = Array.isArray(summary.supported_preferences) ? summary.supported_preferences : [];

    return recommendations.map((entry, index) => {
        const rawScore = Number(entry.xgb_score);
        const displayScore = normalizeXgbDisplayScore(rawScore, index, rawScores);
        const reasons =
            Array.isArray(entry.demo_reasons) && entry.demo_reasons.length
                ? entry.demo_reasons.map((reason) => String(reason).replace(/_/g, " "))
                : ["Ranked highly by the recommendation engine"];

        return {
            _id: `xgb-${entry.id || index}`,
            id: entry.id,
            common_name: entry.common_name || "Unknown",
            latin_name: entry.latin_name || "Unknown",
            image_url: entry.image_url || null,
            score: displayScore,
            fit_label: buildXgbFitLabel(displayScore),
            why_it_fits: reasons,
            risk_flags: buildXgbRiskFlags(entry, prefs),
            breakdown: {
                engine: "recommendation_engine",
                raw_model_score: Number.isFinite(rawScore) ? Number(rawScore.toFixed(6)) : null,
                supported_preferences: supportedPreferences,
                profile_used: summary.profile_used || {},
                normalization_notes: summary.normalization_notes || {},
            },
            similarity: null,
            watering: entry.watering || null,
            care_level: entry.care_level || null,
            type: entry.type || null,
            cycle: entry.cycle || null,
            maintenance: entry.maintenance || null,
            medicinal: entry.medicinal === 1,
            pet_safe: entry.pet_safe === 1,
            model_score: Number.isFinite(rawScore) ? Number(rawScore.toFixed(6)) : null,
            engine: "recommendation_engine",
        };
    });
};

export const fetchRecommenderOptionsData = async () => {
    const plants = await PerenualPlant.find({}, { details: 1 });

    return {
        sunlight: collectDistinctValues(plants, (plant) => (plant.details?.sunlight || []).map(canonicalizeSunlight)),
        watering: collectDistinctValues(plants, (plant) => canonicalizeWatering(plant.details?.watering)),
        soil: collectDistinctValues(plants, (plant) => (plant.details?.soil || []).map(canonicalizeSoil)),
        care_level: collectDistinctValues(plants, (plant) => canonicalizeCareLevel(plant.details?.care_level)),
        type: collectDistinctValues(plants, (plant) => canonicalizeType(plant.details?.type)),
        cycle: collectDistinctValues(plants, (plant) => canonicalizeCycle(plant.details?.cycle)),
    };
};

export const runPrimaryPlantRecommender = async (req, res, { topK = 6 } = {}) => {
    try {
        const userPrefs = req.body || {};
        const pythonProcess = spawnPythonScript(
            "scripts/xgboost_recommender_demo.py",
            buildXgbArgsFromPrefs(userPrefs, topK)
        );

        let resultData = "";
        let errorData = "";

        pythonProcess.stdout.on("data", (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorData += data.toString();
            console.error(`Recommendation engine stderr: ${data}`);
        });

        pythonProcess.on("error", (error) => {
            console.error("Recommendation engine spawn error:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    message: "The recommendation engine could not be started.",
                    error: error.message,
                    pythonExecutable: PYTHON_EXECUTABLE,
                });
            }
        });

        pythonProcess.on("close", async (code) => {
            if (code !== 0) {
                console.error("Recommendation engine exit code:", code);
                return res.status(500).json({
                    message: "An error occurred while generating recommendations.",
                    error: errorData || resultData,
                });
            }

            try {
                const summary = JSON.parse(resultData);
                if (summary?.error) {
                    return res.status(500).json({
                        message: summary.error,
                        details: summary.details || null,
                    });
                }

                const frontendResults = adaptXgbSummaryToFrontendResults(summary, userPrefs);
                const enrichedResults = await enrichRecommendationResultsWithPestRisk(
                    frontendResults,
                    userPrefs.viewer_location || userPrefs.location || null
                );
                res.json(enrichedResults);
            } catch {
                console.error("Recommendation engine parse error:", resultData);
                res.status(500).json({ message: "Invalid response from the recommendation engine." });
            }
        });
    } catch (err) {
        console.error("Recommendation engine backend error:", err);
        res.status(500).json({ message: "Server error while generating recommendations." });
    }
};
