import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Avatar from "../assets/icons/Avatar.svg";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                scrolled
                    ? "backdrop-blur-md bg-garden shadow-md"
                    : "bg-garden/95"

            }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-white">
                <Link
                    to="/"
                    className="text-2xl font-small tracking-wide text-landingPageIcons drop-shadow-md"
                >
                    SoilSync
                </Link>

                <div className="flex items-center gap-8">
                    <Link
                        to="/plants"
                        className="text-landingPageIcons hover:text-emerald-200 font-medium transition"
                    >
                        PlantList
                    </Link>

                    <Link
                        to="/register"
                        className="flex items-center gap-2 bg-landingPageIcons hover:bg-darkLandingPageIcons
                                   text-white px-4 py-2 rounded-full font-semibold transition"
                    >
                        <img src={Avatar} alt="profile" className="w-5 h-5" />
                        Sign Up
                    </Link>
                </div>
            </div>
        </nav>
    );
}
