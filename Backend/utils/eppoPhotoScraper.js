import axios from "axios";

const EPPO_PUBLIC_BASE_URL = "https://gd.eppo.int";

let nextPhotoRequestAt = 0;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPhotoSlot() {
    const minDelayMs = 250;
    const now = Date.now();
    const waitMs = Math.max(0, nextPhotoRequestAt - now);

    if (waitMs > 0) {
        await sleep(waitMs);
    }

    nextPhotoRequestAt = Math.max(nextPhotoRequestAt, Date.now()) + minDelayMs;
}

function normalizeEppoCode(value) {
    return String(value || "").trim().toUpperCase();
}

function toAbsoluteUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `${EPPO_PUBLIC_BASE_URL}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

function decodeHtml(value) {
    return String(value || "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function stripHtml(value) {
    return decodeHtml(String(value || "").replace(/<[^>]*>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
}

export function buildEppoPhotoPageUrl(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    return `${EPPO_PUBLIC_BASE_URL}/taxon/${code}/photos`;
}

export function extractTaxonPhotos(html, eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    const sourceUrl = buildEppoPhotoPageUrl(code);
    const photos = [];
    const blockRegex =
        /<div class="element([^"]*)">[\s\S]*?<a href="([^"]*\/1024x0\/[^"]+)"[^>]*>\s*<img src="([^"]*\/220x130\/[^"]+)"[^>]*>\s*<\/a>[\s\S]*?<div class="pcap">\s*<p>([\s\S]*?)<\/p>\s*(?:<small>([\s\S]*?)<\/small>)?\s*<\/div>/gi;

    let match;
    while ((match = blockRegex.exec(String(html || ""))) !== null) {
        const classText = match[1] || "";
        const imageUrl = toAbsoluteUrl(match[2]);
        const thumbnailUrl = toAbsoluteUrl(match[3]);
        const caption = stripHtml(match[4]) || null;
        const creditText = stripHtml(match[5] || "");
        const credit = creditText.replace(/^Courtesy:\s*/i, "").trim() || null;
        const externalIdMatch = String(imageUrl || "").match(/\/(\d+)\.(?:jpg|jpeg|png|gif)$/i);
        const tags = [...classText.matchAll(/tag-([a-z0-9_-]+)/gi)].map((item) => item[1]).filter(Boolean);

        photos.push({
            externalId: externalIdMatch?.[1] || null,
            imageUrl,
            thumbnailUrl,
            caption,
            credit,
            tags,
            sourceUrl,
        });
    }

    return [...new Map(photos.map((photo) => [photo.imageUrl, photo])).values()];
}

export async function getTaxonPhotos(eppoCode) {
    const code = normalizeEppoCode(eppoCode);
    if (!code) {
        throw new Error("Missing EPPO code.");
    }

    await waitForPhotoSlot();

    try {
        const response = await axios.get(buildEppoPhotoPageUrl(code), {
            timeout: 20000,
            responseType: "text",
        });

        return extractTaxonPhotos(response.data, code);
    } catch (error) {
        if (error?.response?.status === 404) {
            return [];
        }

        const message =
            error?.response?.data?.message ||
            error?.response?.statusText ||
            error.message;

        throw new Error(`EPPO photo scrape failed for '${code}': ${message}`);
    }
}
