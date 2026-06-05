import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const {
    EPPO_API_KEY,
    EPPO_BASE_URL,
    EPPO_MIN_DELAY_MS,
    EPPO_TIMEOUT_MS,
    EPPO_MAX_RETRIES,
} = process.env;

const DEFAULT_EPPO_BASE_URL = "https://api.eppo.int/gd/v2";

let nextRequestAt = 0;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureEnv() {
    if (!EPPO_API_KEY) {
        throw new Error("Missing EPPO_API_KEY in backend/.env");
    }

    if (!EPPO_BASE_URL) {
        return;
    }
}

async function waitForSlot() {
    const minDelayMs = Number(EPPO_MIN_DELAY_MS || 250);
    const now = Date.now();
    const waitMs = Math.max(0, nextRequestAt - now);

    if (waitMs > 0) {
        await sleep(waitMs);
    }

    nextRequestAt = Math.max(nextRequestAt, Date.now()) + minDelayMs;
}

const client = axios.create({
    timeout: Number(EPPO_TIMEOUT_MS || 15000),
    headers: {
        "X-Api-Key": EPPO_API_KEY || "",
        Accept: "application/json",
    },
});

export function buildEppoUrl(relativePath) {
    ensureEnv();
    const base = (EPPO_BASE_URL || DEFAULT_EPPO_BASE_URL).replace(/\/+$/, "");
    const rel = String(relativePath || "").replace(/^\/+/, "");
    return `${base}/${rel}`;
}

export async function eppoGet(relativePath, config = {}, attempt = 1) {
    ensureEnv();
    await waitForSlot();

    try {
        const response = await client.get(buildEppoUrl(relativePath), config);
        return response.data;
    } catch (error) {
        const maxRetries = Number(EPPO_MAX_RETRIES || 3);
        const status = error?.response?.status;

        if ((status === 429 || !status) && attempt < maxRetries) {
            const retryDelay = 1000 * attempt;
            await sleep(retryDelay);
            return eppoGet(relativePath, config, attempt + 1);
        }

        const message =
            error?.response?.data?.message ||
            error?.response?.statusText ||
            error.message;

        throw new Error(`EPPO GET failed for '${relativePath}': ${message}`);
    }
}

export function normalizeEppoCode(value) {
    return String(value || "").trim().toUpperCase();
}

export async function getEppoStatus() {
    return eppoGet("status");
}

export async function getTaxonInfos(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/infos`);
}

export async function getTaxonOverview(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/overview`);
}

export async function getTaxonNames(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/names`);
}

export async function getTaxonTaxonomy(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/taxonomy`);
}

export async function getTaxonCategorization(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/categorization`);
}

export async function getTaxonDistribution(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/distribution`);
}

export async function getTaxonPests(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return eppoGet(`taxons/taxon/${code}/pests`);
}

export async function searchEppoCodesByTaxonName(name, { onlyPreferred = true } = {}) {
    const trimmedName = String(name || "").trim();
    if (!trimmedName) {
        throw new Error("Missing taxon name.");
    }

    return eppoGet("tools/name2codes", {
        params: {
            name: trimmedName,
            onlyPreferred,
        },
    });
}
