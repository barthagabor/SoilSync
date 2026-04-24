import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Map, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AvatarPlaceholder from "../assets/icons/profile_icon.svg";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const systemRole = String(user?.systemRole || "").trim().toLowerCase();
    const roleBadgeLabel = systemRole === "superadmin" ? "superadmin" : systemRole === "admin" ? "admin" : "";
    const roleBadgeClass =
        systemRole === "superadmin"
            ? "bg-[#fff1d6] text-[#9d6b09]"
            : systemRole === "admin"
                ? "bg-[#e9f6dc] text-[#49661d]"
                : "";

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleGardenClick = (e) => {
        if (!user) {
            e.preventDefault();
            navigate("/login");
        } else {
            navigate("/garden-drawer");
        }
    };

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                scrolled ? "backdrop-blur-md bg-garden/90 shadow-md" : "bg-garden/95"
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-white">
                <Link
                    to="/"
                    className="text-2xl tracking-wide text-landingPageIcons drop-shadow-md hover:opacity-80 transition"
                >
                    SoilSync
                </Link>

                <div className="flex items-center gap-4">
                    <Link
                        to="/plants"
                        className="inline-flex items-center gap-2 text-landingPageIcons hover:text-darkLandingPageIcons font-semibold transition px-3 py-2 rounded-full hover:bg-white/30"
                    >
                        <BookOpen size={16} />
                        Plant Library
                    </Link>

                    <button
                        type="button"
                        title="Community page coming soon"
                        className="inline-flex cursor-default items-center gap-2 rounded-full px-3 py-2 font-semibold text-landingPageIcons/70 transition hover:bg-white/20"
                    >
                        <Users size={16} />
                        Community
                    </button>

                    {isAdmin && (
                        <Link
                            to="/admin"
                            className="inline-flex items-center gap-2 text-landingPageIcons hover:text-darkLandingPageIcons font-semibold transition px-3 py-2 rounded-full hover:bg-white/30"
                        >
                            <ShieldCheck size={16} />
                            Admin
                        </Link>
                    )}

                    <div className="flex items-center gap-3 rounded-full bg-white/20 border border-white/25 px-2.5 py-2 backdrop-blur-sm">
                        <Link
                            to="/recommender"
                            className="inline-flex items-center gap-2 text-[#23470b] bg-[#e9fff0] hover:bg-[#d8f7e1] px-4 py-2 rounded-full font-bold transition shadow-sm"
                        >
                            <Sparkles size={16} />
                            Plant Recommender
                        </Link>

                        <button
                            onClick={handleGardenClick}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold transition shadow-sm hover:shadow-md ${
                                user
                                    ? "text-white bg-landingPageIcons hover:bg-darkLandingPageIcons cursor-pointer"
                                    : "text-white bg-[#6a7b55] hover:bg-[#596948] cursor-pointer"
                            }`}
                            title={user ? "Plan your garden layout" : "Sign in to use this feature"}
                        >
                            <Map size={16} />
                            Garden Planner
                        </button>
                    </div>

                    {user ? (
                        <Link
                            to="/profile"
                            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full transition border border-white/20"
                        >
                            <div className="hidden min-w-0 md:block">
                                <div className="truncate font-semibold text-sm text-white">
                                    {user.name.split(" ")[0]}
                                </div>
                                {roleBadgeLabel ? (
                                    <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${roleBadgeClass}`}>
                                        {roleBadgeLabel}
                                    </div>
                                ) : null}
                            </div>
                            <img
                                src={user.profileImage || AvatarPlaceholder}
                                alt="Profile"
                                className="w-8 h-8 rounded-full object-cover border-2 border-landingPageIcons bg-white"
                            />
                        </Link>
                    ) : (
                        <Link
                            to="/register"
                            className="flex items-center gap-2 bg-landingPageIcons hover:bg-darkLandingPageIcons text-white px-5 py-2 rounded-full font-semibold transition shadow-sm"
                        >
                            Sign Up
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
