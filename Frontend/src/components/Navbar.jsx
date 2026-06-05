import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowRight,
    BookOpen,
    Compass,
    Leaf,
    Menu,
    PenTool,
    ShieldCheck,
    User,
    Users,
    X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AvatarPlaceholder from "../assets/icons/profile_icon.svg";

const ease = [0.22, 1, 0.36, 1];

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
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

    const plannerAction = () => navigate(user ? "/garden-drawer" : "/login");
    const links = [
        { label: "Library", to: "/plants", icon: BookOpen },
        { label: "Recommender", to: "/recommender", icon: Compass },
        { label: "Planner", icon: PenTool, action: plannerAction },
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
            <div
                className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-4 py-3 transition-all duration-300 md:px-6 ${
                    scrolled
                        ? "border-white/60 bg-[rgba(247,250,242,0.82)] shadow-[0_18px_50px_rgba(52,78,24,0.16)] backdrop-blur-xl"
                        : "border-white/40 bg-[rgba(255,255,255,0.62)] shadow-[0_10px_35px_rgba(52,78,24,0.08)] backdrop-blur-lg"
                }`}
            >
                <Link to="/" className="flex items-center gap-3 text-greenDark no-underline">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-landingPageIcons text-white shadow-green-btn">
                        <Leaf size={20} />
                    </div>
                    <div>
                        <div className="font-playfair text-2xl font-semibold leading-none">SoilSync</div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-greenMid">
                            Garden Intelligence
                        </div>
                    </div>
                </Link>

                <div className="hidden items-center gap-2 lg:flex">
                    {desktopLinks.map((item) =>
                        item.action ? (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                    item.action();
                                    setOpen(false);
                                }}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-greenMid transition hover:bg-white/70 hover:text-greenDark"
                            >
                                <item.icon size={16} />
                                {item.label}
                            </button>
                        ) : (
                            <Link
                                key={item.label}
                                to={item.to}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-greenMid no-underline transition hover:bg-white/70 hover:text-greenDark"
                            >
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
                            className="group inline-flex max-w-[190px] items-center gap-2.5 rounded-full border border-[#dbe6cf] bg-white/88 px-2.5 py-2 text-left no-underline shadow-[0_12px_30px_rgba(52,78,24,0.08)] transition hover:border-landingPageIcons hover:bg-white"
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
                                    <div
                                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${roleBadgeClass}`}
                                    >
                                        {roleBadgeLabel}
                                    </div>
                                ) : null}
                            </div>
                        </Link>
                    ) : (
                        <Link
                            to="/register"
                            className="rounded-full border border-[#dbe6cf] bg-white/80 px-4 py-2 text-sm font-semibold text-greenDark no-underline transition hover:border-landingPageIcons hover:bg-white"
                        >
                            Create Account
                        </Link>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#dbe6cf] bg-white/75 text-greenDark lg:hidden"
                >
                    {open ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            <AnimatePresence>
                {open ? (
                    <motion.div
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -18 }}
                        transition={{ duration: 0.25 }}
                        className="mx-auto mt-3 max-w-7xl overflow-hidden rounded-[26px] border border-white/70 bg-[rgba(247,250,242,0.95)] p-4 shadow-[0_18px_50px_rgba(52,78,24,0.12)] backdrop-blur-xl lg:hidden"
                    >
                        <div className="grid gap-2">
                            {links.map((item) =>
                                item.action ? (
                                    <button
                                        key={item.label}
                                        type="button"
                                        onClick={() => {
                                            item.action();
                                            setOpen(false);
                                        }}
                                        className="flex items-center justify-between rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-greenDark"
                                    >
                                        <span className="inline-flex items-center gap-3 font-semibold">
                                            <item.icon size={16} />
                                            {item.label}
                                        </span>
                                        <ArrowRight size={15} />
                                    </button>
                                ) : (
                                    <Link
                                        key={item.label}
                                        to={item.to}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center justify-between rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-greenDark no-underline"
                                    >
                                        <span className="inline-flex items-center gap-3 font-semibold">
                                            <item.icon size={16} />
                                            {item.label}
                                        </span>
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
