const DEVELOPMENT_JWT_SECRET = "local-dev-jwt-secret-change-me";

let hasWarnedAboutJwtFallback = false;

export const getJwtSecret = () => {
    const configuredSecret = String(process.env.JWT_SECRET || "").trim();
    if (configuredSecret) {
        return configuredSecret;
    }

    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is required in production.");
    }

    if (!hasWarnedAboutJwtFallback) {
        console.warn("JWT_SECRET is not set. Falling back to the local development secret.");
        hasWarnedAboutJwtFallback = true;
    }

    return DEVELOPMENT_JWT_SECRET;
};
