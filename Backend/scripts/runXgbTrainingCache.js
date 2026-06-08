import { spawn } from "child_process";
import { existsSync } from "fs";
import path from "path";

const normalizeText = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
};

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
        normalizeText(process.env.PYTHON_EXECUTABLE),
        ...virtualEnvCandidates(normalizeText(process.env.VIRTUAL_ENV)),
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

const pythonExecutable = resolvePythonExecutable();
const pythonArgs = [
    "scripts/train_xgboost_recommender_cache.py",
    "--force-refresh",
    ...process.argv.slice(2),
];

const child = spawn(pythonExecutable, pythonArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
});

child.on("error", (error) => {
    console.error("Failed to start XGBoost cache trainer:", error.message);
    process.exit(1);
});

child.on("close", (code) => {
    process.exit(code ?? 1);
});
