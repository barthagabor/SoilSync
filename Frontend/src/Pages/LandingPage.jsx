import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    BookOpen,
    Bug,
    Compass,
    Leaf,
    Menu,
    PenTool,
    ShieldCheck,
    Sparkles,
    Sprout,
    Sun,
    Trees,
    User,
    Users,
    X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePremiumAssistant } from "../hooks/usePremiumAssistant.js";
import { PremiumAssistantFloatingWidget } from "../components/premium/PremiumAssistantSurface.jsx";
import { buildUrl } from "../services/authService.jsx";
import PlannerStoneGravel from "../assets/landing/planner_stone_gravel.jpg";
import PlannerModernMinimal from "../assets/landing/planner_modern_minimal.jpg";
import PlannerMediterraneanOne from "../assets/landing/planner_mediterranean_1.jpg";
import PlannerMediterraneanTwo from "../assets/landing/planner_mediterranean_2.jpg";
import PlannerJapaneseZenOne from "../assets/landing/planner_japanese_zen_1.jpg";
import PlannerJapaneseZenTwo from "../assets/landing/planner_japanese_zen_2.jpg";
import AvatarPlaceholder from "../assets/icons/profile_icon.svg";

const ease = [0.22, 1, 0.36, 1];

const ribbonItems = [
    "EPPO-backed pest intelligence",
    "2,880 plant profiles",
    "AI garden concept generation",
    "Personalized plant matching",
    "Sunlight and soil fit",
    "Favourites and saved gardens",
];

const plannerShowcaseImages = [
    {
        src: PlannerModernMinimal,
        alt: "Modern minimal AI-generated garden concept",
        label: "Modern minimal",
        className: "lg:col-span-7 lg:row-span-2",
    },
    {
        src: PlannerJapaneseZenOne,
        alt: "Japanese zen AI-generated garden concept",
        label: "Japanese zen",
        className: "lg:col-span-5 lg:row-span-1",
    },
    {
        src: PlannerMediterraneanTwo,
        alt: "Mediterranean AI-generated garden concept",
        label: "Mediterranean",
        className: "lg:col-span-5 lg:row-span-1",
    },
    {
        src: PlannerStoneGravel,
        alt: "Stone gravel AI-generated garden concept",
        label: "Stone gravel",
        className: "lg:col-span-4 lg:row-span-1",
    },
    {
        src: PlannerMediterraneanOne,
        alt: "Courtyard Mediterranean AI-generated garden concept",
        label: "Courtyard escape",
        className: "lg:col-span-4 lg:row-span-1",
    },
    {
        src: PlannerJapaneseZenTwo,
        alt: "Japanese courtyard AI-generated garden concept",
        label: "Calm courtyard",
        className: "lg:col-span-4 lg:row-span-1",
    },
];

const getPlantImage = (plant) =>
    plant?.default_image?.regular_url ||
    plant?.default_image?.medium_url ||
    plant?.default_image?.small_url ||
    "https://via.placeholder.com/900x1100?text=Plant";

const buildHeroBackgroundRows = (plants) => {
    const source = Array.isArray(plants) ? plants.filter(Boolean) : [];
    if (!source.length) {
        return [
            Array.from({ length: 8 }, () => null),
            Array.from({ length: 8 }, () => null),
            Array.from({ length: 8 }, () => null),
        ];
    }

    const expanded = Array.from({ length: 12 }, (_, index) => source[index % source.length]);
    return [
        expanded.slice(0, 6),
        expanded.slice(2, 8),
        expanded.slice(4, 10),
    ];
};

const Reveal = ({ children, className = "", delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 68, scale: 0.965, filter: "blur(10px)" }}
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.16, margin: "0px 0px -72px 0px" }}
        transition={{ duration: 1.02, delay, ease }}
        className={className}
    >
        {children}
    </motion.div>
);

function LandingNavbar({ user, onPlanner }) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const profileName = String(user?.name || user?.email || "Profile").trim();
    const systemRole = String(user?.systemRole || "").trim().toLowerCase();
    const isAdmin = systemRole === "admin" || systemRole === "superadmin";
    const roleBadgeLabel = systemRole === "superadmin" ? "superadmin" : systemRole === "admin" ? "admin" : "";
    const roleBadgeClass =
        systemRole === "superadmin"
            ? "bg-[#fff1d6] text-[#9d6b09]"
            : systemRole === "admin"
                ? "bg-[#e9f6dc] text-[#49661d]"
                : "";

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const links = [
        { label: "Library", to: "/plants", icon: BookOpen },
        { label: "Recommender", to: "/recommender", icon: Compass },
        { label: "Planner", icon: PenTool, action: onPlanner },
        ...(isAdmin ? [{ label: "Admin", to: "/admin", icon: ShieldCheck }] : []),
        { label: "Community", to: "/community", icon: Users },
        { label: "Profile", to: user ? "/profile" : "/login", icon: User },
    ];
    const desktopLinks = links.filter((item) => item.label !== "Profile");

    return (
        <motion.nav
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease }}
            className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6"
        >
            <div className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-4 py-3 transition-all duration-300 md:px-6 ${scrolled ? "border-white/60 bg-[rgba(247,250,242,0.82)] shadow-[0_18px_50px_rgba(52,78,24,0.16)] backdrop-blur-xl" : "border-white/40 bg-[rgba(255,255,255,0.62)] shadow-[0_10px_35px_rgba(52,78,24,0.08)] backdrop-blur-lg"}`}>
                <Link to="/" className="flex items-center gap-3 text-greenDark">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-landingPageIcons text-white shadow-green-btn">
                        <Leaf size={20} />
                    </div>
                    <div>
                        <div className="font-playfair text-2xl font-semibold leading-none">SoilSync</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-greenMid">Garden Intelligence</div>
                    </div>
                </Link>

                <div className="hidden items-center gap-2 lg:flex">
                    {desktopLinks.map((item) =>
                        item.action ? (
                            <button key={item.label} onClick={() => { item.action(); setOpen(false); }} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-greenMid transition hover:bg-white/70 hover:text-greenDark">
                                <item.icon size={16} />
                                {item.label}
                            </button>
                        ) : (
                            <Link key={item.label} to={item.to} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-greenMid transition hover:bg-white/70 hover:text-greenDark">
                                <item.icon size={16} />
                                {item.label}
                            </Link>
                        )
                    )}
                </div>

                <div className="hidden items-center gap-3 lg:flex">
                    {user ? (
                        <Link
                            to="/profile"
                            className="group inline-flex max-w-[190px] items-center gap-2.5 rounded-full border border-[#dbe6cf] bg-white/88 px-2.5 py-2 text-left shadow-[0_12px_30px_rgba(52,78,24,0.08)] transition hover:border-landingPageIcons hover:bg-white"
                            title={profileName}
                        >
                            <img
                                src={user.profileImage || AvatarPlaceholder}
                                alt={profileName}
                                className="h-10 w-10 shrink-0 rounded-full border-2 border-landingPageIcons bg-white object-cover shadow-sm"
                            />
                            <div className="min-w-0 max-w-[118px]">
                                <div className="truncate text-sm font-semibold text-greenDark transition group-hover:text-landingPageIcons">
                                    {profileName}
                                </div>
                                {roleBadgeLabel ? (
                                    <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${roleBadgeClass}`}>
                                        {roleBadgeLabel}
                                    </div>
                                ) : null}
                            </div>
                        </Link>
                    ) : (
                        <Link
                            to="/register"
                            className="rounded-full border border-[#dbe6cf] bg-white/80 px-4 py-2 text-sm font-semibold text-greenDark transition hover:border-landingPageIcons hover:bg-white"
                        >
                            Create Account
                        </Link>
                    )}
                </div>

                <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe6cf] bg-white/75 text-greenDark lg:hidden">
                    {open ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            <AnimatePresence>
                {open ? (
                    <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.25 }} className="mx-auto mt-3 max-w-7xl overflow-hidden rounded-[26px] border border-white/70 bg-[rgba(247,250,242,0.95)] p-4 shadow-[0_18px_50px_rgba(52,78,24,0.12)] backdrop-blur-xl lg:hidden">
                        <div className="grid gap-2">
                            {links.map((item) =>
                                item.action ? (
                                    <button key={item.label} onClick={() => { item.action(); setOpen(false); }} className="flex items-center justify-between rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-greenDark">
                                        <span className="inline-flex items-center gap-3 font-semibold"><item.icon size={16} />{item.label}</span>
                                        <ArrowRight size={15} />
                                    </button>
                                ) : (
                                    <Link key={item.label} to={item.to} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-greenDark">
                                        <span className="inline-flex items-center gap-3 font-semibold"><item.icon size={16} />{item.label}</span>
                                        <ArrowRight size={15} />
                                    </Link>
                                )
                            )}
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.nav>
    );
}

function PlantTile({ plant, className = "" }) {
    if (!plant) {
        return <div className={`rounded-[26px] bg-[linear-gradient(135deg,#eef4e3,#dde8ca)] animate-pulse ${className}`} />;
    }

    const scientificName = Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : plant.scientific_name;

    return (
        <motion.div whileHover={{ y: -6 }} className={`overflow-hidden rounded-[26px] border border-[#dbe6cf] bg-[#f1f5ea] shadow-green-sm ${className}`}>
            <Link to={`/plant/${plant.id}`} className="group relative block h-full">
                <img src={getPlantImage(plant)} alt={plant.common_name || "Plant preview"} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#18250c]/88 via-[#18250c]/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="mb-2 flex flex-wrap gap-2">
                        {plant.type ? <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">{plant.type}</span> : null}
                    </div>
                    <div className="font-playfair text-2xl font-semibold leading-tight">{plant.common_name || "Unknown plant"}</div>
                    <div className="mt-1 text-sm italic text-white/75">{scientificName || "Scientific name unavailable"}</div>
                </div>
            </Link>
        </motion.div>
    );
}

function HeroPlantBackdrop({ plants }) {
    const rows = buildHeroBackgroundRows(plants);
    const rowDurations = [42, 50, 46];
    const rowOffsets = ["translate-x-8 md:translate-x-16", "-translate-x-10 md:-translate-x-24", "translate-x-6 md:translate-x-12"];
    const heightPatterns = [
        ["h-[160px] w-[118px]", "h-[180px] w-[140px]", "h-[170px] w-[124px]", "h-[200px] w-[150px]", "h-[176px] w-[132px]", "h-[190px] w-[142px]"],
        ["h-[148px] w-[112px]", "h-[192px] w-[146px]", "h-[168px] w-[126px]", "h-[184px] w-[136px]", "h-[174px] w-[130px]", "h-[198px] w-[148px]"],
        ["h-[172px] w-[128px]", "h-[182px] w-[136px]", "h-[162px] w-[120px]", "h-[196px] w-[148px]", "h-[178px] w-[132px]", "h-[188px] w-[142px]"],
    ];

    return (
        <div className="absolute inset-0 overflow-hidden">
            <motion.div
                animate={{ x: [0, 16, 0], y: [0, -10, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[-60px] top-[100px] h-[260px] w-[260px] rounded-full bg-[#cfddb6]/46 blur-3xl"
            />
            <motion.div
                animate={{ x: [0, -18, 0], y: [0, 18, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute right-[-100px] top-[180px] h-[320px] w-[320px] rounded-full bg-[#f2e5c6]/50 blur-3xl"
            />
            <motion.div
                animate={{ x: [0, 12, 0], y: [0, 14, 0] }}
                transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-40px] left-[24%] h-[260px] w-[320px] rounded-full bg-[#dce8c9]/35 blur-3xl"
            />

            <div
                className="absolute inset-y-[8%] left-[28%] right-[-6%] hidden overflow-hidden lg:block"
                style={{
                    WebkitMaskImage:
                        "linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.88) 8%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 84%, rgba(0,0,0,0.82) 92%, rgba(0,0,0,0) 100%)",
                    maskImage:
                        "linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.88) 8%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 84%, rgba(0,0,0,0.82) 92%, rgba(0,0,0,0) 100%)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                }}
            >
                <div className="absolute right-[-2%] top-[2%] w-[94%] rotate-[-6deg] space-y-5 opacity-95">
                    {rows.map((row, rowIndex) => (
                        <motion.div
                            key={`hero-row-${rowIndex}`}
                            animate={{ x: rowIndex % 2 === 0 ? ["0%", "-50%"] : ["-50%", "0%"] }}
                            transition={{ duration: rowDurations[rowIndex], repeat: Infinity, ease: "linear" }}
                            className={`flex w-max gap-4 ${rowOffsets[rowIndex]}`}
                        >
                            {[...row, ...row].map((plant, index) => {
                                const imageSrc = plant ? getPlantImage(plant) : null;
                                const sizeClass = heightPatterns[rowIndex][index % heightPatterns[rowIndex].length];
                                return (
                                    <div
                                        key={`${plant?.id || "hero-placeholder"}-${rowIndex}-${index}`}
                                        className={`relative shrink-0 overflow-hidden ${sizeClass}`}
                                        style={{ borderRadius: "22px" }}
                                    >
                                        {imageSrc ? (
                                            <>
                                                <img
                                                    src={imageSrc}
                                                    alt={plant?.common_name || "Plant preview"}
                                                    loading={rowIndex === 0 && index < row.length ? "eager" : "lazy"}
                                                    className="h-full w-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,30,6,0.08),rgba(17,30,6,0.22))]" />
                                            </>
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#eef4e3,#dde8ca)] text-landingPageIcons/65">
                                                <Leaf size={24} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[72%] bg-[linear-gradient(90deg,rgba(241,245,234,0.98)_0%,rgba(241,245,234,0.96)_26%,rgba(241,245,234,0.86)_46%,rgba(241,245,234,0.34)_68%,rgba(241,245,234,0)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[rgba(241,245,234,0.96)] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(239,244,231,0.9)] to-transparent" />
        </div>
    );
}

function PlannerBentoShowcase({ images }) {
    const [hoverVector, setHoverVector] = useState({ x: 0, y: 0 });
    const parallaxDepth = [18, 10, 12, 8, 9, 7];

    const handleMouseMove = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        setHoverVector({ x, y });
    };

    const resetHover = () => setHoverVector({ x: 0, y: 0 });

    return (
        <div className="relative overflow-hidden py-2">
            <motion.div
                animate={{ x: [0, 14, 0], y: [0, -8, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[8%] top-[8%] h-[220px] w-[220px] rounded-full bg-[#dce7c8]/42 blur-3xl"
            />
            <motion.div
                animate={{ x: [0, -16, 0], y: [0, 10, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute right-[6%] bottom-[10%] h-[260px] w-[260px] rounded-full bg-[#efe3c8]/30 blur-3xl"
            />

            <div
                onMouseMove={handleMouseMove}
                onMouseLeave={resetHover}
                className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[112px]"
            >
                {images.map((image, index) => {
                    const depth = parallaxDepth[index] || 10;
                    const translateX = hoverVector.x * depth;
                    const translateY = hoverVector.y * depth * -0.7;

                    return (
                        <motion.div
                            key={image.alt}
                            whileHover={{ scale: 1.02, y: -6 }}
                            transition={{ duration: 0.35, ease }}
                            className={`group relative overflow-hidden rounded-[30px] shadow-[0_24px_70px_rgba(52,78,24,0.14)] h-[220px] sm:h-[250px] lg:h-auto ${image.className}`}
                            style={{
                                transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
                                willChange: "transform",
                            }}
                        >
                            <img
                                src={image.src}
                                alt={image.alt}
                                loading={index < 2 ? "eager" : "lazy"}
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#16250a]/80 via-[#16250a]/12 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                                <div className="inline-flex rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur-sm">
                                    {image.label}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default function LandingPage() {
    const { user, isPremium } = useAuth();
    const navigate = useNavigate();
    const [livePlants, setLivePlants] = useState([]);
    const [totalPlants, setTotalPlants] = useState(2880);
    const [loadingPlants, setLoadingPlants] = useState(true);
    const premiumAssistant = usePremiumAssistant({
        storagePrefix: "page:premium-assistant",
        user,
    });

    const loadPlants = async () => {
        try {
            setLoadingPlants(true);
            const randomPage = Math.floor(Math.random() * 16) + 1;
            const res = await fetch(`${buildUrl("/plants")}?page=${randomPage}&limit=8`);
            if (!res.ok) throw new Error("Failed to load plants");
            const data = await res.json();
            setLivePlants(Array.isArray(data?.data) ? data.data : []);
            if (typeof data?.total === "number") setTotalPlants(data.total);
        } catch {
            setLivePlants([]);
        } finally {
            setLoadingPlants(false);
        }
    };

    useEffect(() => {
        loadPlants();
    }, []);

    const plannerAction = () => navigate(user ? "/garden-drawer" : "/login");
    const premiumUpgradeAction = () => navigate(user ? "/profile" : "/login");
    const primaryHref = user ? "/recommender" : "/register";
    const primaryLabel = user ? "Open Plant Recommender" : "Create Your Garden Profile";

    return (
        <div className="overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <LandingNavbar user={user} onPlanner={plannerAction} />

            <main>
                {/* HERO */}
                <section className="relative overflow-hidden px-4 pb-20 pt-32 md:px-6 md:pt-36">
                    <HeroPlantBackdrop plants={livePlants} />

                    <div className="relative z-20 mx-auto max-w-7xl">
                        <div className="max-w-[580px]">
                            <Reveal><h1 className="font-playfair text-[clamp(3rem,7vw,6.2rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-greenDark">Grow a garden<span className="mt-2 block text-landingPageIcons italic">that fits your world</span></h1></Reveal>
                            <Reveal delay={0.08} className="mt-7 max-w-2xl"><p className="text-lg leading-8 text-greenMid md:text-xl">SoilSync helps gardeners choose better plants, understand local pest pressure, and turn good selections into visual garden concepts without needing expert-level horticultural knowledge.</p></Reveal>
                            <Reveal delay={0.16} className="mt-10 grid gap-4 sm:grid-cols-3">
                                {[
                                    { value: Number(totalPlants).toLocaleString(), label: "Plant profiles", icon: Leaf },
                                    { value: "EPPO", label: "Local pest context", icon: Bug },
                                    { value: "AI", label: "Visual planning", icon: Sparkles },
                                ].map((item) => (
                                    <motion.div key={item.label} whileHover={{ y: -4 }} className="rounded-[24px] border border-greenBorder bg-greenLight/95 p-4 shadow-green-sm backdrop-blur-sm">
                                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-garden text-landingPageIcons"><item.icon size={19} /></div>
                                        <div className="mt-4 font-playfair text-3xl font-semibold text-greenDark">{item.value}</div>
                                        <div className="text-sm text-greenMid">{item.label}</div>
                                    </motion.div>
                                ))}
                            </Reveal>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden border-y border-[#dbe6cf] bg-landingPageIcons py-5">
                    <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} className="flex w-max">
                        {[...ribbonItems, ...ribbonItems].map((item, index) => (
                            <div key={`${item}-${index}`} className="mx-4 inline-flex items-center gap-3 text-sm font-medium tracking-[0.08em] text-white/85">
                                <span className="inline-block h-2 w-2 rounded-full bg-white/55" />
                                {item}
                            </div>
                        ))}
                    </motion.div>
                </section>

                <section className="px-4 py-24 md:px-6">
                    <div className="mx-auto max-w-7xl">
                        <Reveal className="text-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-landingPageIcons shadow-green-sm"><Trees size={13} />Product Surface</div>
                            <h2 className="mt-6 font-playfair text-[clamp(2.2rem,5vw,4.3rem)] font-semibold leading-tight text-greenDark">Four clear ways into the product</h2>
                            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-greenMid">SoilSync is not one gimmick. It is a connected workflow: discover, compare, plan, and save.</p>
                        </Reveal>

                        <div className="mt-12 grid gap-5 lg:grid-cols-4">
                            {[
                                { title: "Plant Library", body: "Browse detailed plant profiles with care needs, images, botanical facts, and EPPO-enriched intelligence.", to: "/plants", icon: BookOpen, badge: "Browse the collection", accent: "from-greenLight to-garden" },
                                { title: "Plant Recommender", body: "Generate smarter shortlists from sunlight, soil, watering, hardiness, care level, medicinal value, and pet safety.", to: "/recommender", icon: Compass, badge: "Get a shortlist", accent: "from-garden to-greenLight" },
                                { title: "Garden Planner", body: "Turn chosen plants into a visual garden concept with an AI-assisted planner built for fast iteration and inspiration.", icon: PenTool, badge: "Build a concept", accent: "from-greenLight to-garden" },
                                { title: "Profile", body: "Keep favourites, saved garden plans, and your personal garden context together in one place.", to: user ? "/profile" : "/login", icon: User, badge: "Save your work", accent: "from-garden to-greenLight" },
                            ].map((area, index) => (
                                <Reveal key={area.title} delay={index * 0.08}>
                                    <motion.div whileHover={{ y: -8 }} className={`h-full rounded-[30px] border border-greenBorder bg-gradient-to-br ${area.accent} p-6 shadow-[0_22px_60px_rgba(52,78,24,0.08)]`}>
                                        <div className="flex h-full flex-col">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-greenLight text-landingPageIcons shadow-green-sm"><area.icon size={24} /></div>
                                                <span className="rounded-full border border-greenBorder bg-greenLight px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-greenMid">{area.badge}</span>
                                            </div>
                                            <h3 className="mt-6 font-playfair text-3xl font-semibold text-greenDark">{area.title}</h3>
                                            <p className="mt-4 flex-1 text-sm leading-7 text-text-fern">{area.body}</p>
                                            {area.title === "Garden Planner" ? (
                                                <button onClick={plannerAction} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-landingPageIcons">Open planner<ArrowRight size={16} /></button>
                                            ) : (
                                                <Link to={area.to} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-landingPageIcons">Open {area.title}<ArrowRight size={16} /></Link>
                                            )}
                                        </div>
                                    </motion.div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="space-y-24 px-4 pb-24 md:px-6">
                    <section>
                        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
                            <Reveal>
                                <div className="rounded-[34px] border border-greenBorder bg-greenLight/95 p-6 shadow-[0_28px_80px_rgba(52,78,24,0.12)] backdrop-blur-sm md:p-7">
                                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">Live Plant Library</div>
                                            <h3 className="mt-2 font-playfair text-3xl font-semibold text-greenDark">Browse from {Number(totalPlants || 0).toLocaleString()} plant profiles</h3>
                                        </div>
                                        <button type="button" onClick={loadPlants} className="rounded-full border border-greenBorder bg-garden px-4 py-2 text-sm font-semibold text-landingPageIcons transition hover:border-landingPageIcons hover:bg-greenLight">Shuffle selection</button>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-12">
                                        <PlantTile plant={loadingPlants ? null : livePlants[0]} className="h-[270px] md:col-span-4" />
                                        <PlantTile plant={loadingPlants ? null : livePlants[1]} className="h-[220px] md:col-span-3" />
                                        <PlantTile plant={loadingPlants ? null : livePlants[2]} className="h-[270px] md:col-span-5" />
                                        <PlantTile plant={loadingPlants ? null : livePlants[3]} className="h-[250px] md:col-span-5" />
                                        <PlantTile plant={loadingPlants ? null : livePlants[4]} className="h-[220px] md:col-span-3" />
                                        <PlantTile plant={loadingPlants ? null : livePlants[5]} className="h-[250px] md:col-span-4" />
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal delay={0.08}>
                                <div className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-landingPageIcons shadow-green-sm"><Sparkles size={13} />Plant Library</div>
                                <h2 className="mt-6 font-playfair text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-tight text-greenDark">A living catalog instead of a flat list</h2>
                                <p className="mt-5 max-w-2xl text-lg leading-8 text-greenMid">SoilSync starts with plant discovery: images, botanical facts, care requirements, and profiles that are useful enough to compare, not just browse.</p>
                                <Link to="/plants" className="mt-8 inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-6 py-3 text-sm font-bold text-white shadow-green-btn transition hover:-translate-y-0.5 hover:bg-darkLandingPageIcons">Explore the library<ArrowRight size={16} /></Link>
                            </Reveal>
                        </div>
                    </section>

                    <section>
                        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
                            <Reveal className="lg:order-2">
                                <div className="rounded-[34px] border border-greenBorder bg-[linear-gradient(160deg,theme(colors.greenLight),theme(colors.garden))] p-6 shadow-[0_26px_80px_rgba(52,78,24,0.14)]">
                                    <div className="mb-5 flex items-center justify-between">
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">Plant Recommender</div>
                                            <div className="mt-2 font-playfair text-3xl font-semibold text-greenDark">Smarter shortlist building</div>
                                        </div>
                                        <div className="rounded-full border border-greenBorder bg-greenLight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">Local fit aware</div>
                                    </div>
                                    <div className="mb-5 flex flex-wrap gap-2">{["Part shade", "Loamy soil", "Zone 7", "Pet safe", "Low maintenance"].map((chip) => <span key={chip} className="rounded-full border border-greenBorder bg-garden px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons">{chip}</span>)}</div>
                                    <div className="space-y-3">
                                        {[
                                            { name: "European Silver Fir", fit: "Excellent fit", risk: "High local risk", tone: "bg-[#ffece7] text-[#aa493a]" },
                                            { name: "Japanese Maple", fit: "Strong fit", risk: "Low local risk", tone: "bg-[#eef7de] text-[#4b6a1e]" },
                                            { name: "Hydrangea", fit: "Good fit", risk: "Use with caution", tone: "bg-[#fff3dc] text-[#9d6c0f]" },
                                        ].map((row) => (
                                            <div key={row.name} className="rounded-[24px] border border-greenBorder bg-greenLight p-4 shadow-green-sm">
                                                <div className="flex flex-wrap items-start justify-between gap-4">
                                                    <div><div className="font-semibold text-greenDark">{row.name}</div><div className="mt-1 text-sm text-greenMid">{row.fit}</div></div>
                                                    <div className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${row.tone}`}>{row.risk}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal delay={0.08} className="lg:order-1">
                                <div className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-landingPageIcons shadow-green-sm"><Compass size={13} />Smart Matching</div>
                                <h2 className="mt-6 font-playfair text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-tight text-greenDark">Recommendations shaped by real garden constraints</h2>
                                <p className="mt-5 max-w-2xl text-lg leading-8 text-greenMid">The recommender turns scattered conditions into a shortlist you can act on, combining fit explanations, care expectations, and local pest awareness.</p>
                                <Link to="/recommender" className="mt-8 inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-6 py-3 text-sm font-bold text-white shadow-green-btn transition hover:-translate-y-0.5 hover:bg-darkLandingPageIcons">Try the recommender<ArrowRight size={16} /></Link>
                            </Reveal>
                        </div>
                    </section>

                    <section>
                        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
                            <Reveal>
                                <div className="relative overflow-hidden rounded-[40px] border border-greenBorder bg-[linear-gradient(145deg,theme(colors.greenLight),theme(colors.garden))] p-4 shadow-[0_30px_90px_rgba(52,78,24,0.14)] backdrop-blur-md md:p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
                                            <PenTool size={12} />
                                            AI Garden Planner
                                        </div>
                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">Saved concept gallery</div>
                                    </div>
                                    <PlannerBentoShowcase images={plannerShowcaseImages} />
                                </div>
                            </Reveal>

                            <Reveal delay={0.08}>
                                <div className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-landingPageIcons shadow-green-sm"><PenTool size={13} />Visual Planning</div>
                                <h2 className="mt-6 font-playfair text-[clamp(2rem,4vw,3.7rem)] font-semibold leading-tight text-greenDark">Plan the mood, not just the species list</h2>
                                <p className="mt-5 max-w-2xl text-lg leading-8 text-greenMid">These saved concepts come from the actual SoilSync planner, showing how the same flow can land in a modern minimal courtyard, a Mediterranean garden, or a calmer Japanese composition.</p>
                                <div className="mt-6 flex flex-wrap gap-2">
                                    {["Modern minimal", "Japanese calm", "Mediterranean warmth", "Stone gravel", "Generated and saved in profile"].map((chip) => (
                                        <span key={chip} className="rounded-full border border-greenBorder bg-garden px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons shadow-green-sm">
                                            {chip}
                                        </span>
                                    ))}
                                </div>
                                <button onClick={plannerAction} className="mt-8 inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-6 py-3 text-sm font-bold text-white shadow-green-btn transition hover:-translate-y-0.5 hover:bg-darkLandingPageIcons">{user ? "Open the planner" : "Sign in to plan"}<ArrowRight size={16} /></button>
                            </Reveal>
                        </div>
                    </section>
                </section>

                <section className="bg-[linear-gradient(135deg,#214109_0%,#3F620F_45%,#628e1e_100%)] px-4 py-24 text-white md:px-6">
                    <div className="mx-auto max-w-7xl">
                        <Reveal className="text-center">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/80"><ShieldCheck size={13} />Workflow</div>
                            <h2 className="mt-6 font-playfair text-[clamp(2.2rem,5vw,4.3rem)] font-semibold leading-tight">From rough idea to a garden plan you can actually use</h2>
                            <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-white/75">The point is not just to browse pretty plants. The point is to reduce bad decisions and make the path to a coherent garden faster.</p>
                        </Reveal>
                        <div className="mt-12 grid gap-5 lg:grid-cols-4">
                            {[
                                { title: "Describe your garden conditions", body: "Capture the practical things first: light, soil, watering, care expectations, and hardiness context.", icon: Sun },
                                { title: "Compare recommended plants", body: "See why a plant fits, where it is risky, and which ones deserve to move from shortlist to plan.", icon: Sprout },
                                { title: "Check local pest context", body: "Use EPPO-linked signals to spot plant choices that may deserve extra caution in your country.", icon: Bug },
                                { title: "Generate a garden concept", body: "Bring selected plants into the planner and create a visual concept image you can save and iterate on.", icon: Sparkles },
                            ].map((step, index) => (
                                <Reveal key={step.title} delay={index * 0.08}>
                                    <motion.div whileHover={{ y: -6 }} className="h-full rounded-[30px] border border-white/14 bg-white/10 p-6 backdrop-blur-sm">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/16 text-white"><step.icon size={24} /></div>
                                        <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">Step 0{index + 1}</div>
                                        <h3 className="mt-3 font-playfair text-3xl font-semibold">{step.title}</h3>
                                        <p className="mt-4 text-sm leading-7 text-white/72">{step.body}</p>
                                    </motion.div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-24 md:px-6">
                    <div className="mx-auto max-w-5xl overflow-hidden rounded-[40px] border border-greenBorder bg-[linear-gradient(135deg,theme(colors.greenLight),theme(colors.garden))] px-8 py-12 text-center shadow-[0_34px_90px_rgba(52,78,24,0.12)] md:px-14 md:py-16">
                        <Reveal>
                            <div className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-landingPageIcons shadow-green-sm"><Leaf size={13} />Ready to start</div>
                            <h2 className="mt-6 font-playfair text-[clamp(2.4rem,5vw,4.4rem)] font-semibold leading-tight text-greenDark">Build a smarter garden, not just a prettier wishlist</h2>
                            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-greenMid">Explore the library, create a garden profile, compare recommendations, and move your best ideas straight into the planner.</p>
                            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                                <Link to={primaryHref} className="inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-7 py-4 text-sm font-bold text-white shadow-green-btn transition hover:-translate-y-0.5 hover:bg-darkLandingPageIcons">{primaryLabel}<ArrowRight size={16} /></Link>
                                <Link to="/plants" className="inline-flex items-center gap-2 rounded-full border border-greenBorder bg-greenLight px-7 py-4 text-sm font-semibold text-greenDark transition hover:border-landingPageIcons hover:bg-garden">Browse the Plant Library</Link>
                            </div>
                        </Reveal>
                    </div>
                </section>
            </main>

            <footer className="border-t border-[#dbe6cf] bg-[#142409] px-4 py-12 text-white md:px-6">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#214109]"><Leaf size={22} /></div>
                            <div><div className="font-playfair text-3xl font-semibold">SoilSync</div><div className="text-xs uppercase tracking-[0.22em] text-white/45">AI garden planning</div></div>
                        </div>
                        <p className="mt-5 max-w-xl text-sm leading-7 text-white/64">A garden-focused web platform for plant discovery, recommendation, local pest context, and AI-assisted visual planning.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Product</div>
                            <div className="mt-4 grid gap-3 text-sm">
                                <Link to="/plants" className="text-white/75 transition hover:text-white">Plant Library</Link>
                                <Link to="/recommender" className="text-white/75 transition hover:text-white">Plant Recommender</Link>
                                <button onClick={plannerAction} className="text-left text-white/75 transition hover:text-white">Garden Planner</button>
                                <Link to={user ? "/profile" : "/login"} className="text-white/75 transition hover:text-white">Profile</Link>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Access</div>
                            <div className="mt-4 grid gap-3 text-sm">
                                <Link to="/register" className="text-white/75 transition hover:text-white">Create account</Link>
                                <Link to="/login" className="text-white/75 transition hover:text-white">Sign in</Link>
                                <Link to="/forgot-password" className="text-white/75 transition hover:text-white">Reset password</Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-sm text-white/40">© {new Date().getFullYear()} SoilSync. Local-first, thesis-ready, and built for smarter garden decisions.</div>
            </footer>

            <PremiumAssistantFloatingWidget
                controller={premiumAssistant}
                user={user}
                isPremium={isPremium}
                onNavigateUpgrade={premiumUpgradeAction}
            />
        </div>
    );
}
