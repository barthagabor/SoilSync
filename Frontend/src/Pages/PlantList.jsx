import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    Filter,
    X,
    ChevronDown,
    Leaf,
    Droplets,
    Star,
    SunMedium,
    Sprout,
    RefreshCw,
    Globe2,
    ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { usePageScrollRestoration, useSessionStorageState } from "../hooks/usePagePersistence";
import { buildUrl } from "../services/authService.jsx";

const ease = [0.22, 1, 0.36, 1];

const Reveal = ({ children, className = "", delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.12, margin: "0px 0px -40px 0px" }}
        transition={{ duration: 0.8, delay, ease }}
        className={className}
    >
        {children}
    </motion.div>
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSearchText = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const SMART_SEARCH_BASE_ENTRIES = [
    { key: "care_level", value: "Low", phrases: ["low care", "easy care"] },
    { key: "care_level", value: "Medium", phrases: ["medium care", "moderate care"] },
    { key: "care_level", value: "High", phrases: ["high care"] },
    { key: "watering", value: "Frequent", phrases: ["frequent watering", "needs lots of water"] },
    { key: "watering", value: "Average", phrases: ["average watering", "regular watering", "moderate watering"] },
    { key: "watering", value: "Minimum", phrases: ["minimum watering", "low water", "drought tolerant", "drought friendly"] },
    { key: "sunlight", value: "full sun", phrases: ["full sun"] },
    { key: "sunlight", value: "part shade", phrases: ["part shade", "partial shade"] },
    { key: "sunlight", value: "part sun/part shade", phrases: ["part sun", "part sun part shade"] },
    { key: "sunlight", value: "full shade", phrases: ["full shade"] },
    { key: "type", value: "Tree", phrases: ["tree", "trees"] },
    { key: "type", value: "Flower", phrases: ["flower", "flowers", "blooms"] },
    { key: "type", value: "Succulent", phrases: ["succulent", "succulents"] },
    { key: "type", value: "Shrub", phrases: ["shrub", "shrubs", "bush", "bushes"] },
    { key: "type", value: "Herb", phrases: ["herb", "herbs"] },
    { key: "cycle", value: "Perennial", phrases: ["perennial", "perennials"] },
    { key: "cycle", value: "Annual", phrases: ["annual", "annuals"] },
    { key: "cycle", value: "Biennial", phrases: ["biennial", "biennials"] },
];

const buildSmartSearchEntries = (originOptions) =>
    [
        ...SMART_SEARCH_BASE_ENTRIES,
        ...originOptions.map((origin) => ({
            key: "origin",
            value: origin,
            phrases: [normalizeSearchText(origin)],
        })),
    ].sort((a, b) => Math.max(...b.phrases.map((phrase) => phrase.length)) - Math.max(...a.phrases.map((phrase) => phrase.length)));

const parseSmartSearch = (searchTerm, originOptions) => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    if (!normalizedSearch) return { freeText: "", derivedFilters: {} };

    let remaining = normalizedSearch;
    const derivedFilters = {};

    for (const entry of buildSmartSearchEntries(originOptions)) {
        if (derivedFilters[entry.key]) continue;

        const matchedPhrase = [...entry.phrases].sort((a, b) => b.length - a.length).find((phrase) => {
            const matcher = new RegExp(`(^|\\s)${escapeRegExp(phrase)}(?=\\s|$)`, "i");
            return matcher.test(remaining);
        });

        if (!matchedPhrase) continue;

        derivedFilters[entry.key] = entry.value;
        remaining = remaining
            .replace(new RegExp(`(^|\\s)${escapeRegExp(matchedPhrase)}(?=\\s|$)`, "ig"), " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    return { freeText: remaining, derivedFilters };
};

const buildEffectiveFilters = (manualFilters, derivedFilters) => {
    const merged = { ...derivedFilters };
    Object.entries(manualFilters).forEach(([key, value]) => {
        if (value) merged[key] = value;
    });
    return merged;
};

const filterMeta = {
    watering: { label: "Watering", Icon: Droplets },
    sunlight: { label: "Sunlight", Icon: SunMedium },
    care_level: { label: "Care", Icon: Leaf },
    type: { label: "Type", Icon: Sprout },
    cycle: { label: "Cycle", Icon: RefreshCw },
    origin: { label: "Origin", Icon: Globe2 },
};

const FILTER_OPTIONS = {
    watering: ["Frequent", "Average", "Minimum", "None"],
    sunlight: ["full sun", "part shade", "part sun/part shade", "full shade"],
    care_level: ["Low", "Medium", "High"],
    type: ["Tree", "Flower", "Succulent", "Shrub", "Herb"],
    cycle: ["Perennial", "Annual", "Biennial"],
    origin: [
        "Europe",
        "North America",
        "South America",
        "Asia",
        "Africa",
        "Oceania",
        "United States",
        "Canada",
        "Mexico",
        "United Kingdom",
        "France",
        "Germany",
        "Italy",
        "Spain",
        "China",
        "Japan",
        "India",
        "Australia",
        "New Zealand",
        "Brazil",
        "Argentina",
        "South Africa",
    ],
};

const getCareBadgeClass = (level) => {
    if (level === "Low") return "border-[#b8d88b] bg-[#eef8dd] text-[#537c1d]";
    if (level === "Medium") return "border-[#efcd6a] bg-[#fff6d6] text-[#b97800]";
    if (level === "High") return "border-[#efb0b0] bg-[#ffe2e2] text-[#cf3d3d]";
    return "border-[#dce7cf] bg-[#f7faf2] text-greenMid";
};

const getPlantCareLevel = (plant) => plant?.care_level || plant?.details?.care_level || null;
const getPlantWatering = (plant) => plant?.watering || plant?.details?.watering || null;

const getPlantSunlight = (plant) => {
    const sunlight = plant?.sunlight || plant?.details?.sunlight;
    if (Array.isArray(sunlight)) return sunlight[0] || null;
    return sunlight || null;
};

const formatSunlightLabel = (value) => {
    if (!value) return null;
    const normalized = String(value).toLowerCase();
    if (normalized === "part sun/part shade") return "Part sun";
    return String(value)
        .split(" ")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join(" ");
};

export default function PlantList() {
    const { user, isFavourite, toggleFavourite } = useAuth();
    const [plants, setPlants] = useSessionStorageState("page:plant-list:plants", []);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useSessionStorageState("page:plant-list:page", 1);
    const [total, setTotal] = useSessionStorageState("page:plant-list:total", 0);
    const [totalPages, setTotalPages] = useSessionStorageState("page:plant-list:total-pages", 1);
    const [searchTerm, setSearchTerm] = useSessionStorageState("page:plant-list:search", "");
    const [filters, setFilters] = useSessionStorageState("page:plant-list:filters", {
        watering: "",
        sunlight: "",
        care_level: "",
        type: "",
        cycle: "",
        origin: "",
    });
    const [showFilters, setShowFilters] = useSessionStorageState("page:plant-list:show-filters", false);
    const limit = 24;

    usePageScrollRestoration("page:plant-list", !loading);

    const parsedSearch = useMemo(() => parseSmartSearch(searchTerm, FILTER_OPTIONS.origin), [searchTerm]);
    const effectiveFilters = useMemo(
        () => buildEffectiveFilters(filters, parsedSearch.derivedFilters),
        [filters, parsedSearch.derivedFilters]
    );
    const manualFilterEntries = Object.entries(filters).filter(([, value]) => value);
    const smartFilterEntries = Object.entries(parsedSearch.derivedFilters).filter(([key, value]) => value && !filters[key]);
    const hasActiveFilters = manualFilterEntries.length > 0 || smartFilterEntries.length > 0;
    const appliedFilterCount = Object.values(effectiveFilters).filter(Boolean).length;
    const hasSearchIntent = searchTerm.trim() !== "";

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                setLoading(true);
                const url = new URL(buildUrl("/plants"));
                url.searchParams.set("page", page);
                url.searchParams.set("limit", limit);
                if (parsedSearch.freeText) url.searchParams.set("search", parsedSearch.freeText);
                Object.entries(effectiveFilters).forEach(([key, value]) => {
                    if (value) url.searchParams.set(key, value);
                });
                const res = await fetch(url.toString());
                if (!res.ok) throw new Error("Failed to fetch plants.");
                const data = await res.json();
                setPlants(data.data || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchPlants, 400);
        return () => clearTimeout(timeout);
    }, [effectiveFilters, page, parsedSearch.freeText, setPlants, setTotal, setTotalPages]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ watering: "", sunlight: "", care_level: "", type: "", cycle: "", origin: "" });
        setSearchTerm("");
        setPage(1);
    };

    const handlePageClick = (nextPage) => {
        if (nextPage < 1 || nextPage > totalPages) return;
        setPage(nextPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const getSmartPagination = () => {
        const delta = 2;
        const range = [];
        const result = [];
        for (let index = 1; index <= totalPages; index += 1) {
            if (index === 1 || index === totalPages || (index >= page - delta && index <= page + delta)) range.push(index);
        }
        let last;
        for (const value of range) {
            if (last) {
                if (value - last === 2) result.push(last + 1);
                else if (value - last !== 1) result.push("...");
            }
            result.push(value);
            last = value;
        }
        return result;
    };

    return (
        <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] px-4 pb-10 pt-32 font-dm">
            <Navbar />
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <motion.div
                    animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-[-100px] top-[100px] h-[300px] w-[300px] rounded-full bg-[#dce8c9]/30 blur-3xl"
                />
                <motion.div
                    animate={{ x: [0, -18, 0], y: [0, 18, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[80px] right-[-80px] h-[350px] w-[350px] rounded-full bg-[#f2e5c6]/25 blur-3xl"
                />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">
                <div className="mb-12 text-center">
                    <Reveal delay={0.08}>
                        <h1 className="font-playfair text-[clamp(3rem,7vw,5.8rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[#16250b] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
                            Explore the world of{" "}
                            <em className="text-landingPageIcons italic">plants</em>
                        </h1>
                    </Reveal>
                </div>

                <Reveal delay={0.2}>
                    <motion.div className="mb-10 rounded-[34px] border border-greenBorder bg-white/88 p-5 shadow-[0_22px_70px_rgba(52,78,24,0.12)] backdrop-blur-md sm:p-6">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[220px] flex-1">
                                <AnimatePresence>
                                    {!searchTerm ? (
                                        <motion.span
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                        >
                                            <Search size={16} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-greenMid" />
                                        </motion.span>
                                    ) : null}
                                </AnimatePresence>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    placeholder="Search by name, family, or try 'low care shrub'"
                                    className={`w-full rounded-2xl border border-[#d7e2ca] bg-[#f8fbf3] py-4 pr-12 text-sm text-greenDark outline-none transition-all duration-300 placeholder:text-[#aab99a] focus:border-landingPageIcons focus:bg-white focus:ring-2 focus:ring-landingPageIcons/15 ${
                                        searchTerm ? "pl-6" : "pl-14"
                                    }`}
                                />
                                <AnimatePresence>
                                    {searchTerm ? (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            whileHover={{ scale: 1.08 }}
                                            whileTap={{ scale: 0.92 }}
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-greenMid transition-colors hover:text-landingPageIcons"
                                        >
                                            <X size={16} />
                                        </motion.button>
                                    ) : null}
                                </AnimatePresence>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowFilters((prev) => !prev)}
                                className={`inline-flex items-center gap-2 rounded-2xl border px-6 py-4 text-sm font-semibold transition-all duration-300 ${
                                    showFilters || hasActiveFilters
                                        ? "border-landingPageIcons bg-landingPageIcons text-white shadow-green-btn"
                                        : "border-greenBorder bg-white text-landingPageIcons hover:border-landingPageIcons hover:bg-[#f5f8ef]"
                                }`}
                            >
                                <Filter size={16} />
                                Filters
                                <AnimatePresence>
                                    {appliedFilterCount > 0 ? (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            className="rounded-full bg-white/20 px-2 text-xs font-bold"
                                        >
                                            {appliedFilterCount}
                                        </motion.span>
                                    ) : null}
                                </AnimatePresence>
                                <motion.span animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration: 0.3 }}>
                                    <ChevronDown size={14} />
                                </motion.span>
                            </motion.button>
                        </div>

                        <p className="mt-4 text-xs leading-6 text-greenMid">
                            Try searches like <span className="font-semibold text-landingPageIcons">lavender</span>,{" "}
                            <span className="font-semibold text-landingPageIcons">perennial full sun</span>, or{" "}
                            <span className="font-semibold text-landingPageIcons">low care shrub</span>.
                        </p>

                        <AnimatePresence>
                            {hasActiveFilters ? (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-4 flex flex-wrap gap-2 overflow-hidden border-t border-greenBorder pt-4"
                                >
                                    {manualFilterEntries.map(([key, value]) => (
                                        <motion.span
                                            key={key}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-[#d2dfc1] bg-[#edf4e3] px-3 py-1.5 text-xs font-medium text-landingPageIcons"
                                        >
                                            {filterMeta[key].label}: {value}
                                            <motion.button
                                                whileHover={{ scale: 1.15, rotate: 90 }}
                                                whileTap={{ scale: 0.92 }}
                                                onClick={() => handleFilterChange(key, "")}
                                            >
                                                <X size={12} />
                                            </motion.button>
                                        </motion.span>
                                    ))}
                                    {smartFilterEntries.map(([key, value]) => (
                                        <motion.span
                                            key={`smart-${key}`}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-greenBorder bg-white px-3 py-1.5 text-xs font-medium text-greenMid"
                                        >
                                            {filterMeta[key].label}: {value}
                                            <span className="rounded-full bg-garden px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
                                                smart
                                            </span>
                                        </motion.span>
                                    ))}
                                    <motion.button
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={clearFilters}
                                        className="text-xs font-medium text-greenMid underline transition-colors hover:text-landingPageIcons"
                                    >
                                        Clear all
                                    </motion.button>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>

                        <AnimatePresence>
                            {showFilters ? (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-5 overflow-hidden border-t border-greenBorder pt-5"
                                >
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                        {Object.entries(FILTER_OPTIONS).map(([key, options], index) => {
                                            const { label, Icon } = filterMeta[key];
                                            return (
                                                <motion.div
                                                    key={key}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.04 }}
                                                >
                                                    <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-greenDark">
                                                        <Icon size={13} className="text-landingPageIcons" />
                                                        {label}
                                                    </label>
                                                    <select
                                                        value={filters[key]}
                                                        onChange={(e) => handleFilterChange(key, e.target.value)}
                                                        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-300 ${
                                                            filters[key]
                                                                ? "border-landingPageIcons bg-white text-greenDark shadow-[0_0_0_3px_rgba(63,98,15,0.08)]"
                                                                : "border-[#d7e2ca] bg-[#f8fbf3] text-greenDark focus:border-landingPageIcons focus:bg-white focus:ring-2 focus:ring-landingPageIcons/12"
                                                        }`}
                                                    >
                                                        <option value="">Any</option>
                                                        {options.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ) : null}
                        </AnimatePresence>
                    </motion.div>
                </Reveal>

                {!loading ? (
                    <Reveal delay={0.24}>
                        <div className="mb-8 flex items-center gap-3 px-1">
                            <span className="rounded-full border border-[#d6e2c9] bg-white px-5 py-2 text-sm font-semibold text-landingPageIcons shadow-[0_10px_24px_rgba(63,98,15,0.08)]">
                                {total.toLocaleString()} plants
                            </span>
                            {hasActiveFilters || hasSearchIntent ? (
                                <span className="text-sm text-greenMid">matching your search</span>
                            ) : null}
                        </div>
                    </Reveal>
                ) : null}

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0.6 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="overflow-hidden rounded-[30px] border border-greenBorder bg-white/80"
                            >
                                <div className="h-60 animate-pulse bg-gradient-to-br from-greenLight via-garden to-[#eef4e5]" />
                                <div className="space-y-3 p-5">
                                    <div className="h-4 animate-pulse rounded-full bg-[#dfe8d3]" />
                                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#edf3e4]" />
                                    <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#edf3e4]" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : plants.length === 0 ? (
                    <Reveal>
                        <motion.div className="rounded-[34px] border-2 border-dashed border-greenBorder bg-white/75 py-24 text-center backdrop-blur-sm">
                            <motion.div
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-garden"
                            >
                                <Leaf size={28} className="text-landingPageIcons" />
                            </motion.div>
                            <h3 className="mb-2 font-playfair text-2xl font-semibold text-greenDark">No plants found</h3>
                            <p className="mb-6 text-sm text-greenMid">Try adjusting your search or filters.</p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={clearFilters}
                                className="rounded-2xl bg-landingPageIcons px-6 py-3 text-sm font-semibold text-white shadow-green-btn transition-all hover:bg-darkLandingPageIcons"
                            >
                                Clear all filters
                            </motion.button>
                        </motion.div>
                    </Reveal>
                ) : (
                    <motion.div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {plants.map((plant, index) => {
                            const imageUrl =
                                plant?.default_image?.regular_url ||
                                plant?.default_image?.medium_url ||
                                plant?.default_image?.small_url ||
                                "https://via.placeholder.com/640x480?text=No+Image";
                            const latinName = Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : plant.scientific_name;
                            const title = plant.common_name || latinName || "Unknown plant";
                            const plantType = plant.type || plant.details?.type;
                            const plantCareLevel = getPlantCareLevel(plant);
                            const plantWatering = getPlantWatering(plant);
                            const plantSunlight = formatSunlightLabel(getPlantSunlight(plant));
                            const fav = isFavourite(plant.id);

                            return (
                                <Reveal key={plant.id || index} delay={(index % 8) * 0.03}>
                                    <motion.div
                                        whileHover={{ y: -6, scale: 1.01 }}
                                        transition={{ duration: 0.3, ease }}
                                        className="group relative flex h-full flex-col overflow-hidden rounded-[30px] border border-[#d8e3cb] bg-white shadow-[0_22px_55px_rgba(52,78,24,0.08)]"
                                    >
                                        <div className="absolute bottom-0 left-0 top-0 z-10 w-1 origin-top scale-y-0 bg-gradient-to-b from-landingPageIcons to-[#7ea33b] transition-transform duration-300 group-hover:scale-y-100" />

                                        <Link to={`/plant/${plant.id}`} className="relative block h-60 overflow-hidden bg-[#eef4e5]">
                                            <img
                                                src={imageUrl}
                                                alt={title}
                                                loading="lazy"
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#17240d]/28 via-[#17240d]/12 to-transparent" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#17240d]/45 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                                            {plantType ? (
                                                <span className="absolute left-4 top-4 z-20 inline-flex items-center rounded-full border border-white/75 bg-[#fffdf7] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#35510f] shadow-[0_16px_34px_rgba(0,0,0,0.28)]">
                                                    {plantType}
                                                </span>
                                            ) : null}

                                            <div className="absolute inset-x-4 bottom-4 z-20 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                                                <span className="inline-flex items-center gap-2 rounded-2xl border border-[#476d16] bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(18,31,10,0.34)]">
                                                    View details
                                                    <ArrowRight size={16} className="text-white" />
                                                </span>
                                            </div>

                                            {user ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.15 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleFavourite(plant.id);
                                                    }}
                                                    className={`absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm transition-all duration-200 ${
                                                        fav
                                                            ? "border-yellow-400 bg-yellow-400 text-white"
                                                            : "border-[#dbe6cf] bg-white/97 text-[#49671a] hover:border-yellow-400 hover:bg-yellow-400 hover:text-white"
                                                    }`}
                                                    title={fav ? "Remove from favourites" : "Add to favourites"}
                                                >
                                                    <motion.span animate={{ rotate: fav ? 360 : 0 }} transition={{ duration: 0.4 }}>
                                                        <Star size={16} fill={fav ? "currentColor" : "none"} />
                                                    </motion.span>
                                                </motion.button>
                                            ) : null}
                                        </Link>

                                        <Link to={`/plant/${plant.id}`} className="flex flex-1 flex-col p-5 no-underline">
                                            <h3
                                                title={title}
                                                className="truncate font-playfair font-semibold leading-none text-greenDark transition-colors duration-300 group-hover:text-landingPageIcons"
                                                style={{ fontSize: "clamp(1.8rem, 2vw, 2.25rem)" }}
                                            >
                                                {title}
                                            </h3>
                                            <p className="mt-2 truncate text-base italic text-[#7f9b58]">{latinName}</p>

                                            <div className="mt-auto border-t border-[#e3ead9] pt-5">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex shrink-0 gap-2">
                                                        {plantCareLevel ? (
                                                            <motion.span
                                                                whileHover={{ scale: 1.05 }}
                                                                className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${getCareBadgeClass(plantCareLevel)}`}
                                                            >
                                                                {plantCareLevel} care
                                                            </motion.span>
                                                        ) : null}
                                                    </div>

                                                    <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-greenMid">
                                                        {plantWatering ? (
                                                            <motion.span whileHover={{ scale: 1.05 }} className="inline-flex items-center gap-1.5">
                                                                <Droplets size={12} className="text-[#74a5ff]" />
                                                                {plantWatering}
                                                            </motion.span>
                                                        ) : null}
                                                        {plantSunlight ? (
                                                            <motion.span whileHover={{ scale: 1.05 }} className="inline-flex items-center gap-1.5">
                                                                <SunMedium size={12} className="text-[#f5a623]" />
                                                                {plantSunlight}
                                                            </motion.span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                </Reveal>
                            );
                        })}
                    </motion.div>
                )}
                {totalPages > 1 && !loading ? (
                    <Reveal delay={0.28}>
                        <motion.nav className="mt-16 flex justify-center">
                            <motion.div className="flex items-center gap-1.5 rounded-[24px] border border-greenBorder bg-white p-2 shadow-[0_18px_50px_rgba(52,78,24,0.12)]">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePageClick(page - 1)}
                                    disabled={page === 1}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-landingPageIcons transition-all hover:bg-[#f5f8ef] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    Previous
                                </motion.button>

                                {getSmartPagination().map((item, index) =>
                                    item === "..." ? (
                                        <span key={`ellipsis-${index}`} className="px-2 text-sm text-greenMid">
                                            ...
                                        </span>
                                    ) : (
                                        <motion.button
                                            key={`page-${item}`}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handlePageClick(item)}
                                            className={`h-9 min-w-9 rounded-xl text-sm font-semibold transition-all ${
                                                item === page
                                                    ? "bg-landingPageIcons text-white shadow-green-btn"
                                                    : "text-landingPageIcons hover:bg-[#f5f8ef]"
                                            }`}
                                        >
                                            {item}
                                        </motion.button>
                                    )
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePageClick(page + 1)}
                                    disabled={page === totalPages}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-landingPageIcons transition-all hover:bg-[#f5f8ef] disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    Next
                                </motion.button>
                            </motion.div>
                        </motion.nav>
                    </Reveal>
                ) : null}
            </div>
        </div>
    );
}
