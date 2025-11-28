import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AvatarPlaceholder from "../assets/icons/profile_icon.svg";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const { user } = useAuth(); // Itt érjük el a bejelentkezett felhasználót

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                scrolled ? "backdrop-blur-md bg-garden shadow-md" : "bg-garden/95"
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-white">
                <Link
                    to="/"
                    className="text-2xl font-small tracking-wide text-landingPageIcons drop-shadow-md hover:opacity-80 transition"
                >
                    SoilSync
                </Link>

                <div className="flex items-center gap-6">
                    <Link
                        to="/plants"
                        className="text-landingPageIcons hover:text-emerald-200 font-medium transition"
                    >
                        Plant Library
                    </Link>

                    {user ? (
                        <Link
                            to="/profile"
                            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full transition border border-white/20"
                        >
                            <span className="font-semibold text-sm text-white hidden md:block">
                                {user.name.split(" ")[0]}
                            </span>
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