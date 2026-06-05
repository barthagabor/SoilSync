import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { buildUrl } from "../services/authService.jsx";
import {
    AlertTriangle,
    ArrowLeft,
    BookOpen,
    Bug,
    ChevronDown,
    Droplet,
    Droplets,
    ExternalLink,
    Leaf,
    Map,
    Scissors,
    Search,
    ShieldCheck,
    ShoppingBag,
    Sprout,
    Star,
    Sun,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

const Reveal = ({ children, className = "", delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.1, margin: "0px 0px -32px 0px" }}
        transition={{ duration: 0.75, delay, ease }}
        className={className}
    >
        {children}
    </motion.div>
);

/* ── Watering dots ── */
const WateringLevel = ({ value }) => {
    const n = value?.toLowerCase() || "";
    const level = n.includes("frequent") ? 3 : n.includes("average") ? 2 : n.includes("minimum") ? 1 : 0;
    const label = ["Not specified", "Minimum — drought tolerant", "Average — moderate watering", "Frequent — keep moist"][level];
    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                    <Droplet key={i} size={20}
                             className={i <= level ? "fill-[#74a5ff] text-[#74a5ff]" : "fill-[#e4ecd8] text-[#d0ddc0]"} />
                ))}
            </div>
            <span className="text-sm font-medium text-greenDark">{label}</span>
        </div>
    );
};

/* ── Sunlight dots ── */
const SunlightLevel = ({ values }) => {
    const j = (values || []).join(" ").toLowerCase();
    const level = j.includes("full sun") ? 3 : j.includes("part") ? 2 : j ? 1 : 0;
    return (
        <div className="flex flex-col gap-2.5">
            <div className="flex gap-1.5">
                {[1, 2, 3].map((i) => (
                    <Sun key={i} size={20}
                         className={i <= level ? "fill-[#f5a623] text-[#f5a623]" : "fill-[#e4ecd8] text-[#d0ddc0]"} />
                ))}
            </div>
            <span className="text-sm font-medium capitalize text-greenDark">
                {values?.length ? values.join(", ") : "Not specified"}
            </span>
        </div>
    );
};

/* ── URL helpers ── */
const gSearch = (q, img = false) =>
    `https://www.google.com/search?q=${encodeURIComponent(q)}${img ? "&tbm=isch" : ""}`;
const ytSearch = (q) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const buildResources = ({ commonName, latinName, countryName, pests }) => {
    const base = [commonName, latinName].filter(Boolean).join(" ").trim();
    const region = countryName ? ` ${countryName}` : "";
    const pestStr = pests.slice(0, 3).map((p) => p.name).filter(Boolean).join(", ");
    return [
        { id: "care", title: "Care guides", desc: "Watering, pruning, and cultivation articles.", href: gSearch(`${base} plant care watering pruning`), icon: BookOpen },
        { id: "buy", title: "Nurseries & buy sources", desc: countryName ? `Local availability in ${countryName}.` : "Find nurseries and sellers.", href: gSearch(`${base} nursery buy${region}`), icon: ShoppingBag },
        { id: "pest", title: "Pest & disease notes", desc: pestStr ? `Research on ${pestStr}.` : "Disease and pest searches.", href: gSearch(pestStr ? `${base} ${pestStr} pests${region}` : `${base} pests diseases${region}`), icon: Bug },
        { id: "inspo", title: "Planting inspiration", desc: "Garden styling and companion planting photos.", href: gSearch(`${base} garden design companion plants`, true), icon: Search },
        { id: "video", title: "Video walkthroughs", desc: "Hands-on care guides on YouTube.", href: ytSearch(`${base} plant care guide`), icon: ExternalLink },
    ];
};

/* ── Pest risk styles ── */
const riskStyle = (label) => {
    if (label === "high") return { badge: "bg-[#ffe5e1] text-[#b04436] border-[#f5c1ba]", panel: "border-[#f5c1ba] bg-[linear-gradient(140deg,#fff8f6,#fff1ee)]", dot: "bg-[#e05c4a]", title: "High local pest exposure" };
    if (label === "caution") return { badge: "bg-[#fff1d6] text-[#9d6b09] border-[#f0d39d]", panel: "border-[#f0d39d] bg-[linear-gradient(140deg,#fffaf0,#fff5e0)]", dot: "bg-[#e9a030]", title: "Use with caution" };
    if (label === "low") return { badge: "bg-[#e9f6dc] text-[#49661d] border-[#c8ddae]", panel: "border-[#c8ddae] bg-[linear-gradient(140deg,#f8fcf2,#eef6e1)]", dot: "bg-[#6aaa2e]", title: "Low local pest risk" };
    return { badge: "bg-[#eef3e7] text-greenMid border-[#dbe6cf]", panel: "border-[#dbe6cf] bg-[linear-gradient(140deg,#fafcf7,#f4f8ee)]", dot: "bg-greenMid/60", title: "Pest risk unavailable" };
};

/* ── Section tag pill ── */
const Tag = ({ icon: Icon, label }) => (
    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f4f8ed] px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-landingPageIcons shadow-[0_4px_14px_rgba(52,78,24,0.07)]">
        <Icon size={12} />
        {label}
    </div>
);

/* ── Care card ── */
const CareCard = ({ icon, iconBg, title, children }) => (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.25, ease }}
                className="rounded-[22px] border border-[#e2ead6] bg-white p-5 shadow-[0_8px_28px_rgba(52,78,24,0.06)]">
        <div className="mb-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-[15px] ${iconBg}`}>{icon}</div>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-greenMid">{title}</span>
        </div>
        {children}
    </motion.div>
);

const CompactAccordionCard = ({
    icon: Icon,
    label,
    title,
    subtitle,
    open,
    onToggle,
    children,
    toneClass = "border-[#dbe6cf] bg-white/90",
}) => (
    <div className={`overflow-hidden rounded-[26px] border p-5 shadow-[0_14px_36px_rgba(52,78,24,0.07)] ${toneClass}`}>
        {label ? <Tag icon={Icon || Leaf} label={label} /> : null}
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-start justify-between gap-4 text-left"
        >
            <div className="min-w-0">
                <h2 className="font-playfair text-[clamp(1.25rem,2vw,1.8rem)] font-semibold leading-tight text-greenDark">
                    {title}
                </h2>
                {subtitle ? (
                    <p className="mt-2 text-sm leading-6 text-greenMid">{subtitle}</p>
                ) : null}
            </div>
            <motion.span
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.24 }}
                className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dbe6cf] bg-white text-greenMid"
            >
                <ChevronDown size={16} />
            </motion.span>
        </button>

        <AnimatePresence initial={false}>
            {open ? (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease }}
                    className="overflow-hidden"
                >
                    <div className="pt-5">{children}</div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    </div>
);

/* ── Loading ── */
const Loader = () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                    className="flex h-14 w-14 items-center justify-center rounded-full border border-[#dbe6cf] bg-white shadow-[0_10px_32px_rgba(52,78,24,0.12)]">
            <Leaf size={20} className="text-landingPageIcons" />
        </motion.div>
        <p className="font-playfair text-lg text-greenDark">Loading plant profile…</p>
    </div>
);

/* ════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export default function PlantDetails() {
    const { id } = useParams();
    const { user, isFavourite, toggleFavourite } = useAuth();

    const [plant, setPlant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [careGuides, setCareGuides] = useState([]);
    const [showAllPests, setShowAllPests] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [pestOutlookOpen, setPestOutlookOpen] = useState(false);
    const [botanicalOpen, setBotanicalOpen] = useState(false);

    useEffect(() => {
        setShowAllPests(false);
        setImgError(false);
        setPestOutlookOpen(false);
        setBotanicalOpen(false);

        const fetchPlant = async () => {
            try {
                setLoading(true);
                setError("");
                const q = new URLSearchParams();
                if (user?.location) q.set("viewerLocation", user.location);
                const res = await fetch(buildUrl(`/plants/${id}${q.toString() ? `?${q.toString()}` : ""}`));
                if (!res.ok) throw new Error("Plant not found");
                setPlant(await res.json());
            } catch (err) {
                setError(err.message || "Plant not found");
            } finally {
                setLoading(false);
            }
        };

        const fetchGuides = async () => {
            try {
                const res = await fetch(buildUrl(`/plants/${id}/guides`));
                if (!res.ok) return;
                const data = await res.json();
                setCareGuides(data?.data?.length ? data.data[0].section || [] : []);
            } catch { setCareGuides([]); }
        };

        fetchPlant();
        fetchGuides();
    }, [id, user?.location]);

    if (loading) return <Loader />;

    if (error || !plant) return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)]">
            <div className="rounded-[28px] border border-[#dbe6cf] bg-white/90 p-10 text-center shadow-[0_24px_60px_rgba(52,78,24,0.1)]">
                <Leaf size={28} className="mx-auto mb-4 text-landingPageIcons" />
                <p className="mb-6 font-playfair text-2xl text-greenDark">{error || "Plant not found."}</p>
                <Link to="/plants" className="inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-6 py-3 text-sm font-bold text-white shadow-green-btn transition hover:-translate-y-0.5 hover:bg-darkLandingPageIcons">
                    <ArrowLeft size={15} /> Back to Library
                </Link>
            </div>
        </div>
    );

    /* ── Derived data ── */
    const details = plant.details || {};
    const imageUrl = !imgError
        ? (plant?.default_image?.regular_url || plant?.default_image?.medium_url || plant?.default_image?.small_url || null)
        : null;
    const latinName = Array.isArray(plant.scientific_name) ? plant.scientific_name.join(", ") : plant.scientific_name;
    const commonName = plant.common_name || latinName || "Unknown plant";
    const pests = Array.isArray(plant.pests) ? plant.pests : [];
    const pestRisk = plant.eppo?.pestRisk || null;
    const risk = riskStyle(pestRisk?.label);
    const majorPests = pests.filter((p) => p.classificationLabel === "Major host");
    const hostPests = pests.filter((p) => p.classificationLabel === "Host");
    const experimentalPests = pests.filter((p) => p.classificationLabel === "Experimental");
    const defaultVisible = majorPests.length
        ? majorPests.slice(0, 4)
        : hostPests.length
            ? hostPests.slice(0, 4)
            : pests.slice(0, 4);
    const additionalPests = pests.filter(
        (pest) => !defaultVisible.some((visible) => visible.eppoCode === pest.eppoCode)
    );
    const canToggle = additionalPests.length > 0;
    const resources = buildResources({ commonName, latinName, countryName: pestRisk?.countryName, pests });
    const fav = user ? isFavourite(plant.id) : false;
    const plantSummary = details.description || "No extended description is stored for this plant yet.";

    const quickFacts = [
        { label: "Type", value: plant.type || details.type },
        { label: "Cycle", value: plant.cycle || details.cycle },
        { label: "Growth", value: details.growth_rate },
        {
            label: "Zone",
            value: (details.hardiness?.min || details.hardiness?.max)
                ? `${details.hardiness?.min || "?"} – ${details.hardiness?.max || details.hardiness?.min || "?"}`
                : null,
        },
    ].filter((f) => f.value);

    const careLevelColor = details.care_level === "Low"
        ? "text-[#537c1d] bg-[#eef8dd] border-[#b8d88b]"
        : details.care_level === "Medium"
            ? "text-[#b97800] bg-[#fff6d6] border-[#efcd6a]"
            : details.care_level === "High"
                ? "text-[#cf3d3d] bg-[#ffe2e2] border-[#efb0b0]"
                : "text-greenMid bg-[#f4f8ed] border-[#dbe6cf]";

    const renderPestGrid = (items, animationOffset = 0) => (
        <div className="grid gap-3.5 md:grid-cols-2">
            <AnimatePresence>
                {items.map((pest, i) => (
                    <motion.article
                        key={`${pest.eppoCode}-${animationOffset}-${i}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ delay: (animationOffset + i) * 0.04, duration: 0.45, ease }}
                        className={`overflow-hidden rounded-[22px] border transition-shadow hover:shadow-[0_12px_34px_rgba(52,78,24,0.1)] ${
                            pest.presentInViewerCountry
                                ? "border-[#f5c1ba] bg-[linear-gradient(135deg,#fff9f7,#fff3f0)]"
                                : "border-[#e2ead6] bg-[linear-gradient(135deg,#fafcf7,#f4f9ee)]"
                        }`}
                    >
                        <div className="flex items-start gap-3.5 p-4">
                            {pest.thumbnailUrl ? (
                                <a href={pest.imageUrl || pest.thumbnailUrl} target="_blank" rel="noreferrer" className="shrink-0">
                                    <img
                                        src={pest.thumbnailUrl}
                                        alt={pest.imageCaption || pest.name}
                                        loading="lazy"
                                        className="h-16 w-16 rounded-[14px] border border-white/80 object-cover shadow-[0_4px_14px_rgba(0,0,0,0.09)]"
                                    />
                                </a>
                            ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] border border-[#dbe6cf] bg-white text-greenMid/50">
                                    <Bug size={20} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-1.5">
                                    <div>
                                        <p className="text-sm font-semibold leading-snug text-greenDark">{pest.name}</p>
                                        <p className="font-mono text-[10px] text-greenMid/70">{pest.eppoCode}</p>
                                    </div>
                                    {pest.presentInViewerCountry ? (
                                        <span className="rounded-full border border-[#f5c1ba] bg-[#ffddd6] px-2.5 py-0.5 text-[9.5px] font-bold text-[#b04436]">
                                            Present locally
                                        </span>
                                    ) : null}
                                </div>
                                {pest.classificationLabel ? (
                                    <span className="mt-1.5 inline-block rounded-full border border-[#dbe6cf] bg-white/70 px-2.5 py-0.5 text-[10px] font-semibold text-greenMid">
                                        {pest.classificationLabel}
                                    </span>
                                ) : null}
                                {pest.imageCaption ? (
                                    <p className="mt-1.5 text-[11px] leading-5 text-greenMid/80">{pest.imageCaption}</p>
                                ) : null}
                            </div>
                        </div>
                    </motion.article>
                ))}
            </AnimatePresence>
        </div>
    );

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">

            {/* ── Sticky nav ── */}
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.55, ease }}
                        className="sticky top-0 z-40 border-b border-white/60 bg-[rgba(246,250,240,0.9)] px-4 py-3 backdrop-blur-xl md:px-6">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <Link to="/plants"
                          className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white/80 px-4 py-2 text-sm font-semibold text-landingPageIcons transition hover:border-landingPageIcons hover:bg-white">
                        <ArrowLeft size={14} /> Plant Library
                    </Link>
                    {user ? (
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
                                       onClick={() => toggleFavourite(plant.id)}
                                       className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${fav ? "border-yellow-400 bg-yellow-400 text-white" : "border-[#dbe6cf] bg-white/80 text-greenDark hover:border-yellow-400 hover:bg-yellow-50"}`}>
                            <Star size={14} fill={fav ? "currentColor" : "none"} />
                            {fav ? "Saved" : "Save plant"}
                        </motion.button>
                    ) : null}
                </div>
            </motion.div>

            <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-6">

                {/* ════════════════════════
                    HERO CARD
                    Contained card: image left (fixed height, object-cover),
                    text right. Degrades gracefully with bad images.
                ═══════════════════════ */}
                <Reveal>
                    <div className="mb-8 overflow-hidden rounded-[36px] border border-white/80 bg-white/92 shadow-[0_32px_90px_rgba(52,78,24,0.13)] backdrop-blur-sm">
                        <div className="grid lg:grid-cols-[1fr_1.2fr]">

                            {/* ── Image panel ── */}
                            <div className="relative overflow-hidden bg-[linear-gradient(135deg,#d5e3be,#b8ce92)]"
                                 style={{ minHeight: "340px" }}>
                                {imageUrl ? (
                                    <motion.img
                                        src={imageUrl}
                                        alt={commonName}
                                        onError={() => setImgError(true)}
                                        initial={{ scale: 1.05, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.85, ease }}
                                        className="absolute inset-0 h-full w-full object-cover object-center"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <Leaf size={56} className="text-[#7fa84e]/40" />
                                    </div>
                                )}
                                {/* Subtle right-edge feather for desktop blend */}
                                <div className="absolute inset-0 hidden bg-[linear-gradient(to_right,transparent_70%,rgba(255,255,255,0.18)_100%)] lg:block" />
                                {/* Bottom scrim */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,22,4,0.28)] via-transparent to-transparent" />

                            </div>

                            {/* ── Text panel ── */}
                            <div className="flex flex-col justify-between p-7 md:p-9 lg:p-10">
                                <div>
                                    <Tag icon={Leaf} label="Plant Profile" />

                                    <h1 className="font-playfair text-[clamp(2.2rem,4.5vw,3.8rem)] font-semibold leading-[0.93] tracking-[-0.03em] text-greenDark">
                                        {commonName}
                                    </h1>
                                    <p className="mt-2.5 text-base italic text-greenMid/80">{latinName}</p>

                                    {/* Status badges */}
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {details.care_level ? (
                                            <span className={`rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${careLevelColor}`}>
                                                {details.care_level} care
                                            </span>
                                        ) : null}
                                        {plant.medicinal ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-[11px] font-bold text-blue-700">
                                                <ShieldCheck size={12} /> Medicinal
                                            </span>
                                        ) : null}
                                        {plant.poisonous_to_pets ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-[11px] font-bold text-red-600">
                                                <AlertTriangle size={12} /> Toxic to Pets
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                {/* Quick facts grid — anchored to bottom of text panel */}
                                {quickFacts.length > 0 ? (
                                    <div className="mt-7 grid grid-cols-2 gap-2 border-t border-[#e8f0dd] pt-6 sm:grid-cols-3 xl:grid-cols-5">
                                        {quickFacts.map((fact) => (
                                            <div key={fact.label}
                                                 className="rounded-[16px] border border-[#e4eedb] bg-[#f7faf2] px-3 py-3">
                                                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-greenMid">{fact.label}</div>
                                                <div className="mt-1 text-sm font-semibold text-greenDark">{fact.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </Reveal>

                {/* ════════════════════════
                    PEST RISK CALLOUT
                ═══════════════════════ */}
                <Reveal className="mb-8">
                    <div className="rounded-[30px] border border-[#dbe6cf] bg-white/92 p-7 shadow-[0_18px_52px_rgba(52,78,24,0.08)] md:p-8">
                        <Tag icon={BookOpen} label="About this plant" />
                        <h2 className="mb-3 font-playfair text-[clamp(1.55rem,2.8vw,2.35rem)] font-semibold leading-tight text-greenDark">
                            About this plant
                        </h2>
                        <p className="max-w-4xl text-[0.96rem] leading-[1.9] text-greenMid">
                            {plantSummary}
                        </p>
                    </div>
                </Reveal>

                {/* ════════════════════════
                    TWO-COLUMN BODY
                ═══════════════════════ */}
                <div className="grid gap-7 xl:grid-cols-[1.45fr_0.7fr]">

                    {/* ─── LEFT COLUMN ─── */}
                    <div className="space-y-7">

                        {/* Care requirements */}
                        <Reveal>
                            <div className="rounded-[30px] border border-[#d2e0bc] bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(244,249,236,0.96))] p-7 shadow-[0_22px_60px_rgba(52,78,24,0.11)] md:p-8">
                                <Tag icon={Leaf} label="Care requirements" />
                                <h2 className="mb-1 font-playfair text-[clamp(1.6rem,2.5vw,2.4rem)] font-semibold leading-tight text-greenDark">
                                    Growing conditions
                                </h2>
                                <p className="mb-6 text-sm text-greenMid">Key care signals to keep this plant healthy.</p>

                                <div className="grid gap-3.5 sm:grid-cols-2">
                                    <CareCard icon={<Droplets size={16} className="text-[#74a5ff]" />} iconBg="bg-[#eef3ff]" title="Watering">
                                        <WateringLevel value={details.watering} />
                                    </CareCard>
                                    <CareCard icon={<Sun size={16} className="text-[#f5a623]" />} iconBg="bg-[#fff7ec]" title="Sunlight">
                                        <SunlightLevel values={details.sunlight} />
                                    </CareCard>
                                    <CareCard icon={<Scissors size={16} className="text-[#9461d6]" />} iconBg="bg-[#f6f2ff]" title="Pruning">
                                        <p className="text-sm leading-6 text-greenDark">
                                            {details.pruning_month?.length
                                                ? `Best in: ${details.pruning_month.join(", ")}`
                                                : "No specific pruning season stored."}
                                        </p>
                                    </CareCard>
                                    <CareCard icon={<Sprout size={16} className="text-landingPageIcons" />} iconBg="bg-[#f2f8ea]" title="Propagation">
                                        <p className="text-sm leading-6 text-greenDark">
                                            {details.propagation?.length
                                                ? details.propagation.join(", ")
                                                : "No propagation method available."}
                                        </p>
                                    </CareCard>
                                </div>

                                {/* Soil + hardiness zone strip */}
                                {(details.soil?.length || details.hardiness?.min || details.hardiness?.max) ? (
                                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#edf3e4] pt-5">
                                        {details.soil?.length ? (
                                            <>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-greenMid mr-1">Soil</span>
                                                {details.soil.map((s) => (
                                                    <span key={s} className="rounded-full border border-[#dbe6cf] bg-[#f4f8ed] px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons">{s}</span>
                                                ))}
                                            </>
                                        ) : null}
                                        {(details.hardiness?.min || details.hardiness?.max) ? (
                                            <span className="ml-auto rounded-full border border-[#dbe6cf] bg-[#f4f8ed] px-4 py-1.5 text-[11px] font-bold text-greenDark">
                                                Zone {details.hardiness.min || "?"} – {details.hardiness.max || details.hardiness.min || "?"}
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </Reveal>

                        {/* Detailed care guides */}
                        {careGuides.length > 0 ? (
                            <Reveal>
                                <div className="rounded-[30px] border border-[#dbe6cf] bg-white/90 p-7 shadow-[0_18px_52px_rgba(52,78,24,0.08)] md:p-8">
                                    <Tag icon={Scissors} label="Extended care guide" />
                                    <div className="space-y-3.5">
                                        {careGuides.map((g, i) => (
                                            <div key={`${g.type}-${i}`}
                                                 className="rounded-[22px] border border-[#e4eedb] bg-[linear-gradient(135deg,#f8fcf3,#f2f7ea)] p-6">
                                                <h3 className="mb-3 font-playfair text-xl font-semibold capitalize text-greenDark">{g.type}</h3>
                                                <p className="whitespace-pre-line text-sm leading-7 text-greenMid">{g.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reveal>
                        ) : null}

                        {/* Known pests */}
                        <Reveal>
                            <div className="rounded-[30px] border border-[#dbe6cf] bg-white/90 p-7 shadow-[0_18px_52px_rgba(52,78,24,0.08)] md:p-8">
                                <Tag icon={Bug} label="Known pests" />
                                <h2 className="mb-1 font-playfair text-[clamp(1.6rem,2.5vw,2.4rem)] font-semibold leading-tight text-greenDark">
                                    Pest exposure
                                </h2>
                                <p className="mb-6 text-sm text-greenMid">
                                    {pests.length
                                        ? `${pests.length} pests linked via EPPO records.${pestRisk?.countryName ? ` Highlighted entries are present in ${pestRisk.countryName}.` : ""}`
                                        : "No pest records linked to this plant yet."}
                                </p>

                                {pests.length > 0 ? (
                                    <>
                                        {/* Classification chips */}
                                        <div className="mb-5 flex flex-wrap gap-2">
                                            {majorPests.length ? <span className="rounded-full border border-[#f5c1ba] bg-[#ffe8e3] px-3.5 py-1.5 text-[11px] font-bold text-[#b04436]">Major host · {majorPests.length}</span> : null}
                                            {hostPests.length ? <span className="rounded-full border border-[#dbe6cf] bg-[#f4f8ed] px-3.5 py-1.5 text-[11px] font-bold text-landingPageIcons">Host · {hostPests.length}</span> : null}
                                            {experimentalPests.length ? <span className="rounded-full border border-[#f0d39d] bg-[#fff9ef] px-3.5 py-1.5 text-[11px] font-bold text-[#9d6b09]">Experimental · {experimentalPests.length}</span> : null}
                                        </div>

                                        {renderPestGrid(defaultVisible)}

                                        {canToggle ? (
                                            <div className="mt-5">
                                                <CompactAccordionCard
                                                    icon={Bug}
                                                    title={showAllPests ? "Hide remaining pest records" : `Show ${additionalPests.length} more pest records`}
                                                    subtitle="The first four records stay visible, the rest are tucked into this smaller drawer."
                                                    open={showAllPests}
                                                    onToggle={() => setShowAllPests((v) => !v)}
                                                    toneClass="border-[#e2ead6] bg-[linear-gradient(135deg,#fafcf7,#f4f9ee)]"
                                                >
                                                    {renderPestGrid(additionalPests, defaultVisible.length)}
                                                </CompactAccordionCard>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <div className="rounded-[20px] border border-dashed border-[#dbe6cf] bg-[#f4f8ed] px-6 py-10 text-center">
                                        <Bug size={26} className="mx-auto mb-3 text-greenMid/40" />
                                        <p className="text-sm text-greenMid">No known pests linked to this plant yet.</p>
                                    </div>
                                )}
                            </div>
                        </Reveal>
                    </div>

                    {/* ─── RIGHT SIDEBAR ─── */}
                    <aside className="space-y-7">

                        <Reveal>
                            <CompactAccordionCard
                                icon={Bug}
                                label="Local pest outlook"
                                title={pestRisk?.countryName ? `Pest outlook for ${pestRisk.countryName}` : "Pest outlook"}
                                subtitle={pestRisk?.summary || "No local pest assessment is available yet."}
                                open={pestOutlookOpen}
                                onToggle={() => setPestOutlookOpen((v) => !v)}
                                toneClass={risk.panel}
                            >
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${risk.badge}`}>
                                            <span className={`h-2 w-2 rounded-full ${risk.dot}`} />
                                            {risk.title}
                                        </span>
                                        {pestRisk?.countryName ? (
                                            <span className="rounded-full border border-[#dbe6cf] bg-white/75 px-3 py-1.5 text-[11px] font-semibold text-greenMid">
                                                {pestRisk.countryName}
                                            </span>
                                        ) : null}
                                    </div>

                                    {pestRisk?.warnings?.length ? (
                                        <div className="space-y-2.5">
                                            {pestRisk.warnings.slice(0, 4).map((warning) => (
                                                <div key={warning} className="flex items-start gap-3 rounded-[16px] border border-white/65 bg-white/55 px-4 py-3">
                                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${risk.dot}`} />
                                                    <span className="text-sm leading-6 text-greenDark">{warning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-6 text-greenMid">
                                            No highlighted local warnings are stored for this plant.
                                        </p>
                                    )}
                                </div>
                            </CompactAccordionCard>
                        </Reveal>

                        <Reveal>
                            <CompactAccordionCard
                                icon={Map}
                                label="Taxonomy & origin"
                                title="Botanical identity"
                                subtitle="Classification and origin details for the selected plant."
                                open={botanicalOpen}
                                onToggle={() => setBotanicalOpen((v) => !v)}
                            >
                                <div className="space-y-2">
                                    {[
                                        { label: "Family", value: plant.family },
                                        { label: "Genus", value: plant.genus },
                                        { label: "Species", value: plant.species_epithet },
                                        { label: "Cultivar", value: plant.cultivar },
                                    ].filter((i) => i.value).map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e6eedb] bg-[#f7faf2] px-4 py-3"
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-greenMid">{item.label}</span>
                                            <span className="text-sm font-semibold text-greenDark">{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {details.origin?.length ? (
                                    <div className="mt-5">
                                        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-greenMid">Origin</p>
                                        <div className="flex flex-wrap gap-2">
                                            {details.origin.map((place) => (
                                                <span key={place} className="rounded-full border border-[#dbe6cf] bg-[#f4f8ed] px-3 py-1.5 text-[11px] font-medium text-greenDark">{place}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </CompactAccordionCard>
                        </Reveal>

                        {/* Research shortcuts */}
                        <Reveal delay={0.05}>
                            <div className="rounded-[30px] border border-[#dbe6cf] bg-white/90 p-7 shadow-[0_18px_52px_rgba(52,78,24,0.08)]">
                                <Tag icon={ExternalLink} label="Resources" />
                                <h2 className="mb-5 font-playfair text-[clamp(1.5rem,2.2vw,2.1rem)] font-semibold leading-tight text-greenDark">
                                    Research shortcuts
                                </h2>

                                <div className="space-y-2.5">
                                    {resources.map((r) => {
                                        const Icon = r.icon;
                                        return (
                                            <motion.a key={r.id} href={r.href} target="_blank" rel="noreferrer"
                                                      whileHover={{ x: 3 }} transition={{ duration: 0.18 }}
                                                      className="group flex items-center gap-4 rounded-[20px] border border-[#e2ead6] bg-[#f7faf2] px-4 py-3.5 transition hover:border-landingPageIcons hover:bg-white hover:shadow-[0_8px_26px_rgba(52,78,24,0.09)]">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#dbe6cf] bg-white text-landingPageIcons shadow-[0_3px_10px_rgba(52,78,24,0.07)] transition group-hover:bg-landingPageIcons group-hover:text-white">
                                                    <Icon size={16} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-greenDark">{r.title}</p>
                                                    <p className="truncate text-xs text-greenMid">{r.desc}</p>
                                                </div>
                                                <ExternalLink size={13} className="shrink-0 text-greenMid/40 transition group-hover:text-landingPageIcons" />
                                            </motion.a>
                                        );
                                    })}
                                </div>
                            </div>
                        </Reveal>

                        <div className="text-center">
                            <p className="font-mono text-[10px] text-greenMid/35">ID {plant.id}</p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
