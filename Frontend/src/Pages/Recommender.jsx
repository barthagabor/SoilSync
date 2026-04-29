import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    Bug,
    ChevronRight,
    Droplets,
    Leaf,
    Scissors,
    Sparkles,
    Star,
    Sun,
    Terminal,
    Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const fallbackOptions = {
    sunlight: [],
    watering: [],
    soil: [],
    care_level: [],
    type: [],
    cycle: [],
};

const initialForm = {
    sunlight: "",
    watering: "",
    care_level: "",
    hardiness_zone: "",
    soil: "",
    type: "",
    cycle: "",
    low_maintenance: false,
    fast_growth: false,
    pet_safe: false,
    medicinal: false,
};

function selectArrowStyle() {
    return {
        backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%233F620F' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: "30px",
    };
}

function scoreColor(score) {
    if (score >= 80) return "#315212";
    if (score >= 60) return "#6b9b18";
    if (score >= 40) return "#d08a19";
    return "#95B29B";
}

function fitBadgeClass(label) {
    if (label === "Excellent") return "bg-[#e8f5df] text-[#315212]";
    if (label === "Good") return "bg-[#fff1d8] text-[#98650b]";
    return "bg-[#edf4e6] text-greenMid";
}

function pestRiskBadgeClass(label) {
    if (label === "high") return "bg-[#ffe5e1] text-[#b04436]";
    if (label === "caution") return "bg-[#fff1d6] text-[#9d6b09]";
    if (label === "low") return "bg-[#e9f6dc] text-[#49661d]";
    return "bg-[#eef3e7] text-greenMid";
}

function pestRiskTitle(label) {
    if (label === "high") return "High Local Pest Risk";
    if (label === "caution") return "Use With Caution";
    if (label === "low") return "Low Local Pest Risk";
    return "Local Pest Risk";
}

function formatDebugValue(value) {
    if (value === null || value === undefined || value === "") return "null";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(3);
    return String(value);
}

export default function Recommender() {
    const { user, isFavourite, toggleFavourite } = useAuth();

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    const [debugMode, setDebugMode] = useState(false);
    const [engine, setEngine] = useState("xgb");
    const [formData, setFormData] = useState(initialForm);
    const [options, setOptions] = useState(fallbackOptions);

    useEffect(() => {
        const loadOptions = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/recommender/options");
                if (!res.ok) return;
                const data = await res.json();
                setOptions({
                    sunlight: Array.isArray(data.sunlight) ? data.sunlight : fallbackOptions.sunlight,
                    watering: Array.isArray(data.watering) ? data.watering : fallbackOptions.watering,
                    soil: Array.isArray(data.soil) ? data.soil : fallbackOptions.soil,
                    care_level: Array.isArray(data.care_level) ? data.care_level : fallbackOptions.care_level,
                    type: Array.isArray(data.type) ? data.type : fallbackOptions.type,
                    cycle: Array.isArray(data.cycle) ? data.cycle : fallbackOptions.cycle,
                });
            } catch (err) {
                console.error("Failed to load recommender options:", err);
            }
        };

        loadOptions();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setResults(null);

        const payload = { ...formData, limit: 6 };
        if (user?.location) {
            payload.viewer_location = user.location;
        }
        if (payload.hardiness_zone) {
            payload.hardiness_zone = parseInt(payload.hardiness_zone, 10);
        } else {
            delete payload.hardiness_zone;
        }

        Object.keys(payload).forEach((key) => {
            if (payload[key] === "" || payload[key] === false || payload[key] === null) {
                delete payload[key];
            }
        });

        try {
            const endpoint =
                engine === "xgb"
                    ? "http://localhost:5000/api/recommender/xgb"
                    : "http://localhost:5000/api/recommender/v2";

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Could not connect to the AI engine.");
            }

            setResults(data);
        } catch (err) {
            setError(err.message || "Could not connect to the AI engine.");
        } finally {
            setLoading(false);
        }
    };

    const activeCount = Object.values(formData).filter((value) => value !== "" && value !== false).length;
    const selectClass =
        "w-full appearance-none rounded-[12px] border border-garden bg-greenLight px-3 py-2.5 pr-8 text-[13px] text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white";
    const inputClass =
        "w-full rounded-[12px] border border-garden bg-greenLight px-3 py-2.5 text-[13px] text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white";
    const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-greenMid";
    const activeEngine = results ? (results[0]?.engine === "xgb_demo" ? "xgb" : "classic") : engine;
    const engineDescription =
        activeEngine === "xgb"
            ? "ranked by the trained XGBoost demo model"
            : "ranked by similarity and rule-based fit";
    const loadingDescription =
        engine === "xgb"
            ? "The XGBoost demo model is scoring plants against your profile"
            : "Scoring plant matches against your profile";

    const selectFields = [
        { name: "sunlight", label: <><Sun size={10} className="mr-1 inline" />Sunlight</>, options: options.sunlight },
        { name: "watering", label: <><Droplets size={10} className="mr-1 inline" />Watering</>, options: options.watering },
        { name: "care_level", label: "Care Level", options: options.care_level },
        { name: "soil", label: "Soil Type", options: options.soil },
        { name: "type", label: "Plant Type", options: options.type },
        { name: "cycle", label: "Cycle", options: options.cycle },
    ];

    const toggles = [
        { name: "low_maintenance", icon: <Scissors size={14} color="#3F620F" />, label: "Low Maintenance" },
        { name: "fast_growth", icon: <Zap size={14} color="#d18b1d" />, label: "Fast Growth" },
        { name: "pet_safe", icon: <span className="text-[14px]">P</span>, label: "Pet Safe" },
        { name: "medicinal", icon: <span className="text-[14px]">M</span>, label: "Medicinal" },
    ];

    return (
        <div
            className="min-h-screen px-6 pb-16 pt-24 font-dm"
            style={{
                backgroundColor: "#f5f6f0",
                backgroundImage:
                    "radial-gradient(ellipse at 10% 10%, rgba(149,178,155,0.2) 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, rgba(63,98,15,0.07) 0%, transparent 50%)",
            }}
        >
            <div className="mb-12 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-garden bg-white px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest text-landingPageIcons shadow-green-sm">
                    <Sparkles size={13} />
                    Plant Recommender
                </div>
                <h1
                    className="mb-3 font-playfair font-bold leading-tight text-greenDark"
                    style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
                >
                    Find your perfect <em className="font-medium italic text-landingPageIcons">plant match</em>
                </h1>
                <p className="text-[16px] font-light text-greenMid">
                    Tell the recommender about your garden and get explainable plant suggestions.
                </p>
            </div>

            <div className="mx-auto grid max-w-[1280px] items-start gap-6 xl:grid-cols-[360px_1fr]">
                <div className="sticky top-[90px] overflow-hidden rounded-[24px] border border-greenBorder bg-white shadow-green-md">
                    <div className="relative overflow-hidden px-6 py-5" style={{ background: "linear-gradient(135deg, #2d4a0a, #3F620F)" }}>
                        <div className="absolute bottom-[-30px] right-[-30px] h-[100px] w-[100px] rounded-full bg-white/[0.06]" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="mb-1 font-playfair text-[18px] font-semibold text-white">Garden Profile</p>
                                <p className="m-0 text-[12px] text-white/60">Fill in what applies to your space</p>
                            </div>
                            {activeCount > 0 && (
                                <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold text-white">
                                    {activeCount}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4 rounded-[16px] border border-greenBorder bg-[#fbfcf8] p-3.5">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-greenMid">
                                    Recommendation Engine
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEngine("xgb")}
                                        className={`rounded-[12px] border px-3 py-2 text-left transition ${
                                            engine === "xgb"
                                                ? "border-landingPageIcons bg-greenLight text-greenDark"
                                                : "border-greenBorder bg-white text-greenMid hover:border-greenMuted"
                                        }`}
                                    >
                                        <div className="text-[13px] font-semibold">XGBoost Demo</div>
                                        <div className="mt-1 text-[11px] leading-4">Trained ranking model</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEngine("classic")}
                                        className={`rounded-[12px] border px-3 py-2 text-left transition ${
                                            engine === "classic"
                                                ? "border-landingPageIcons bg-greenLight text-greenDark"
                                                : "border-greenBorder bg-white text-greenMid hover:border-greenMuted"
                                        }`}
                                    >
                                        <div className="text-[13px] font-semibold">Classic</div>
                                        <div className="mt-1 text-[11px] leading-4">Similarity + rules</div>
                                    </button>
                                </div>
                                {engine === "xgb" && (
                                    <p className="mt-3 text-[11px] leading-5 text-greenMid">
                                        The current XGBoost demo learns from{" "}
                                        <strong>watering, care level, type, cycle, hardiness zone</strong> and{" "}
                                        <strong>low maintenance</strong>. The other filters stay visible here, but are not
                                        learned by this demo yet.
                                    </p>
                                )}
                            </div>

                            <div className="mb-3 grid grid-cols-2 gap-3">
                                {selectFields.map((field) => (
                                    <div key={field.name}>
                                        <label className={labelClass}>{field.label}</label>
                                        <select
                                            name={field.name}
                                            value={formData[field.name]}
                                            onChange={handleChange}
                                            className={selectClass}
                                            style={selectArrowStyle()}
                                        >
                                            <option value="">Any</option>
                                            {field.options.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="mb-1">
                                <label className={labelClass}>Hardiness Zone (1-13)</label>
                                <input
                                    type="number"
                                    name="hardiness_zone"
                                    value={formData.hardiness_zone}
                                    onChange={handleChange}
                                    min="1"
                                    max="13"
                                    placeholder="e.g. 6"
                                    className={inputClass}
                                />
                            </div>

                            <div className="mt-4 flex flex-col gap-2.5 border-t border-[#f0f4ec] pt-4">
                                {toggles.map((toggle) => (
                                    <label
                                        key={toggle.name}
                                        className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 transition ${
                                            formData[toggle.name]
                                                ? "border-landingPageIcons bg-greenLight"
                                                : "border-[#f0f4ec] bg-[#fafbf8] hover:border-garden hover:bg-white"
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            name={toggle.name}
                                            checked={formData[toggle.name]}
                                            onChange={handleChange}
                                            className="hidden"
                                        />
                                        <div
                                            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition ${
                                                formData[toggle.name]
                                                    ? "border-landingPageIcons bg-landingPageIcons"
                                                    : "border-garden bg-white"
                                            }`}
                                        >
                                            {formData[toggle.name] && <span className="text-[10px] font-bold text-white">+</span>}
                                        </div>
                                        <span className="flex flex-1 items-center gap-2 text-[13px] font-medium text-[#374141]">
                                            {toggle.icon}
                                            {toggle.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-landingPageIcons py-3.5 text-[14px] font-bold text-white shadow-green-btn transition hover:-translate-y-px hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-65"
                            >
                                {loading ? "Analyzing..." : <><Sparkles size={16} />Get Recommendations</>}
                            </button>
                        </form>
                    </div>
                </div>

                <div>
                    {error && (
                        <div className="mb-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] text-red-600">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-greenBorder bg-white px-8 py-16 text-center">
                            <div className="mb-5 flex gap-2">
                                <div className="h-3 w-3 animate-loading-pulse rounded-full bg-landingPageIcons" />
                                <div className="h-3 w-3 animate-loading-pulse rounded-full bg-landingPageIcons [animation-delay:0.2s]" />
                                <div className="h-3 w-3 animate-loading-pulse rounded-full bg-landingPageIcons [animation-delay:0.4s]" />
                            </div>
                            <p className="mb-1 font-playfair text-[18px] font-semibold text-greenDark">Building your shortlist...</p>
                            <p className="text-[14px] font-light text-greenMid">{loadingDescription}</p>
                        </div>
                    ) : results && results.length > 0 ? (
                        <div className="flex flex-col gap-4">
                            <div className="mb-1 flex items-center justify-between border-b border-greenBorder pb-4">
                                <div className="flex items-center gap-2.5">
                                    <span className="rounded-full bg-garden px-4 py-1 text-[13px] font-semibold text-landingPageIcons">
                                        Top {results.length} matches
                                    </span>
                                    <span className="text-[12px] text-greenMuted">{engineDescription}</span>
                                </div>
                                <button
                                    onClick={() => setDebugMode((prev) => !prev)}
                                    className={`inline-flex items-center gap-1.5 rounded-[10px] border px-3.5 py-1.5 text-[12px] font-semibold transition ${
                                        debugMode
                                            ? "border-landingPageIcons bg-[#0f1a0a] text-[#4ade80]"
                                            : "border-garden bg-white text-greenMid hover:border-greenMuted"
                                    }`}
                                >
                                    <Terminal size={13} />
                                    {debugMode ? "Hide Details" : activeEngine === "xgb" ? "View Model Details" : "View AI Logs"}
                                </button>
                            </div>

                            {results.map((plant, index) => {
                                const favourite = isFavourite(plant.id);
                                const metricLabel =
                                    typeof plant.similarity === "number"
                                        ? `${(plant.similarity * 100).toFixed(0)}% sim`
                                        : Number.isFinite(plant.model_score)
                                            ? `${plant.model_score.toFixed(2)} raw`
                                            : activeEngine === "xgb"
                                                ? "XGB rank"
                                                : "n/a";
                                return (
                                    <article
                                        key={plant._id || plant.id}
                                        className="overflow-hidden rounded-[24px] border border-greenBorder bg-white transition hover:-translate-y-0.5 hover:border-greenMuted hover:shadow-green-md"
                                    >
                                        <div className="grid gap-0 lg:grid-cols-[200px_1fr]">
                                            <Link to={`/plant/${plant.id}`} className="no-underline">
                                                <div className="h-full min-h-[200px] bg-[linear-gradient(135deg,#dfead4,#b8cb97)]">
                                                    {plant.image_url ? (
                                                        <img
                                                            src={plant.image_url}
                                                            alt={plant.common_name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-greenDark">
                                                            <Leaf size={28} />
                                                        </div>
                                                    )}
                                                </div>
                                            </Link>

                                            <div className="p-6">
                                                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                                            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-garden bg-greenLight px-2 text-sm font-bold text-landingPageIcons">
                                                                #{index + 1}
                                                            </span>
                                                            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${fitBadgeClass(plant.fit_label)}`}>
                                                                {plant.fit_label}
                                                            </span>
                                                        </div>

                                                        <Link to={`/plant/${plant.id}`} className="no-underline">
                                                            <h3 className="truncate font-playfair text-[24px] text-greenDark transition hover:text-landingPageIcons">
                                                                {plant.common_name}
                                                            </h3>
                                                        </Link>
                                                        <p className="mt-1 truncate text-[13px] italic text-greenMuted">
                                                            {plant.latin_name}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-start gap-2">
                                                        {user && (
                                                            <button
                                                                onClick={() => toggleFavourite(plant.id)}
                                                                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                                                                    favourite
                                                                        ? "bg-yellow-400 text-white"
                                                                        : "bg-greenLight text-gray-400 hover:bg-yellow-400 hover:text-white"
                                                                }`}
                                                                title={favourite ? "Remove from favourites" : "Add to favourites"}
                                                            >
                                                                <Star size={16} fill={favourite ? "currentColor" : "none"} />
                                                            </button>
                                                        )}

                                                        <div className="text-right">
                                                            <div
                                                                className="font-playfair text-[32px] font-bold leading-none"
                                                                style={{ color: scoreColor(plant.score) }}
                                                            >
                                                                {plant.score}
                                                            </div>
                                                            <div className="text-[11px] font-medium text-greenMuted">pts</div>
                                                            <div className="mt-0.5 font-mono text-[11px] text-[#b4c4a8]">
                                                                {metricLabel}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-4 flex flex-wrap gap-2">
                                                    {plant.watering && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-greenBorder bg-greenLight px-3 py-1 text-[11px] font-medium text-[#4a5e38]">
                                                            <Droplets size={10} color="#60a5fa" />
                                                            {plant.watering}
                                                        </span>
                                                    )}
                                                    {plant.care_level && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-greenBorder bg-greenLight px-3 py-1 text-[11px] font-medium text-[#4a5e38]">
                                                            <Leaf size={10} color="#3F620F" />
                                                            {plant.care_level}
                                                        </span>
                                                    )}
                                                    {plant.type && (
                                                        <span className="rounded-full border border-greenBorder bg-greenLight px-3 py-1 text-[11px] font-medium text-[#4a5e38]">
                                                            {plant.type}
                                                        </span>
                                                    )}
                                                    {plant.cycle && (
                                                        <span className="rounded-full border border-greenBorder bg-greenLight px-3 py-1 text-[11px] font-medium text-[#4a5e38]">
                                                            {plant.cycle}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                                    <div className="rounded-[18px] border border-[#e5eddc] bg-[#fbfcf8] p-4">
                                                        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-greenMid">
                                                            Why It Fits
                                                        </div>
                                                        <div className="space-y-2">
                                                            {plant.why_it_fits?.map((reason) => (
                                                                <div key={reason} className="flex items-start gap-2 text-sm text-greenDark">
                                                                    <span className="mt-1 h-2 w-2 rounded-full bg-landingPageIcons" />
                                                                    <span>{reason}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-[18px] border border-[#e5eddc] bg-[#f8fbf3] p-4">
                                                        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-greenMid">
                                                            <Bug size={12} />
                                                            Local Pest Risk
                                                        </div>
                                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${pestRiskBadgeClass(plant.pest_risk?.label)}`}>
                                                                {pestRiskTitle(plant.pest_risk?.label)}
                                                            </span>
                                                            {plant.pest_risk?.countryName && (
                                                                <span className="rounded-full border border-greenBorder bg-white px-3 py-1 text-[11px] font-semibold text-greenMid">
                                                                    {plant.pest_risk.countryName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm leading-6 text-greenDark">
                                                            {plant.pest_risk?.summary || "No local pest intelligence has been attached to this result yet."}
                                                        </p>
                                                        {plant.pest_risk?.warnings?.length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                {plant.pest_risk.warnings.slice(0, 2).map((warning) => (
                                                                    <div key={warning} className="flex items-start gap-2 text-sm text-[#7a5a25]">
                                                                        <span className="mt-1 h-2 w-2 rounded-full bg-[#d8a43e]" />
                                                                        <span>{warning}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="rounded-[18px] border border-[#f0e2d1] bg-[#fffaf4] p-4">
                                                        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9b6b1b]">
                                                            <AlertTriangle size={12} />
                                                            Risk Flags
                                                        </div>
                                                        {plant.risk_flags?.length ? (
                                                            <div className="space-y-2">
                                                                {plant.risk_flags.map((risk) => (
                                                                    <div key={risk} className="flex items-start gap-2 text-sm text-[#7a5a25]">
                                                                        <span className="mt-1 h-2 w-2 rounded-full bg-[#d8a43e]" />
                                                                        <span>{risk}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-greenMid">No major risks flagged for your current preferences.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-5 h-[5px] overflow-hidden rounded-full bg-[#f0f4ec]">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${Math.min(Math.max(plant.score, 0), 100)}%`,
                                                            background: `linear-gradient(90deg, ${scoreColor(plant.score)}, #95B29B)`,
                                                        }}
                                                    />
                                                </div>

                                                <div className="mt-5 flex justify-end">
                                                    <Link
                                                        to={`/plant/${plant.id}`}
                                                        className="inline-flex items-center gap-2 text-sm font-semibold text-landingPageIcons no-underline transition hover:text-darkLandingPageIcons"
                                                    >
                                                        Open Plant Profile
                                                        <ChevronRight size={16} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>

                                        {debugMode && plant.breakdown && (
                                            <div className="border-t border-[#1a2e0a] bg-[#0f1a0a] px-6 py-4 font-mono text-[12px]">
                                                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 text-[11px] font-bold">
                                                    <span className="flex items-center gap-1.5 text-[#4ade80]">
                                                        <Terminal size={11} />
                                                        SCORING_ENGINE
                                                    </span>
                                                    <span className="rounded bg-[#1a2e0a] px-2 py-0.5 text-white">TOTAL: {plant.score}</span>
                                                </div>
                                                <div className="grid gap-x-6 gap-y-0.5 md:grid-cols-2">
                                                    {Object.entries(plant.breakdown).map(([key, value]) => {
                                                        const isNumeric = typeof value === "number" && Number.isFinite(value);

                                                        return (
                                                        <div
                                                            key={key}
                                                            className="flex items-center justify-between border-b border-white/[0.04] py-1 last:border-none"
                                                        >
                                                            <span className="text-greenMid">{key}:</span>
                                                            <span
                                                                className={`max-w-[70%] break-words text-right font-semibold ${
                                                                    isNumeric
                                                                        ? value > 0
                                                                            ? "text-[#4ade80]"
                                                                            : value < 0
                                                                                ? "text-[#f87171]"
                                                                                : "text-[#64748b]"
                                                                        : "text-white"
                                                                }`}
                                                            >
                                                                {isNumeric && value > 0 ? "+" : ""}
                                                                {formatDebugValue(value)}
                                                            </span>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    ) : results && results.length === 0 ? (
                        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-greenBorder bg-white px-8 py-16 text-center">
                            <div className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-garden">
                                <Leaf size={32} color="#95B29B" />
                            </div>
                            <h3 className="mb-2 font-playfair text-[22px] font-semibold text-greenDark">No strong matches found</h3>
                            <p className="text-[14px] font-light text-greenMid">
                                Try relaxing your constraints, for example by changing pet safety or hardiness zone.
                            </p>
                        </div>
                    ) : (
                        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-greenBorder bg-white px-8 py-16 text-center">
                            <div
                                className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
                                style={{ background: "linear-gradient(135deg, #dee4d1, #c8d4bc)" }}
                            >
                                <Sparkles size={32} color="#3F620F" />
                            </div>
                            <h3 className="mb-2 font-playfair text-[22px] font-semibold text-greenDark">Ready for analysis</h3>
                            <p className="mb-7 text-[14px] font-light text-greenMid">
                                Fill in your garden profile on the left and let the recommender build your shortlist.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {["Sunlight", "Soil type", "Watering", "Care level", "Type", "Cycle"].map((hint) => (
                                    <span
                                        key={hint}
                                        className="rounded-full bg-garden px-4 py-1 text-[12px] font-medium text-landingPageIcons"
                                    >
                                        {hint}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
