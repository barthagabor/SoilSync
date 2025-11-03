import { Link } from "react-router-dom";
import Avatar from "../assets/icons/Avatar.svg";

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 w-full bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <span className="font-bold text-base relative pr-3 after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:border-r-2 after:border-black">
                        SoilSync
                    </span>
                </div>

                <Link
                    to="/plants"
                    className="text-landingPageIcons font-semibold hover:text-darkLandingPageIcons transition"
                >
                    Plant Search Features
                </Link>


                <Link
                    to="/register"
                    className="flex items-center gap-1 bg-landingPageIcons hover:bg-darkLandingPageIcons
                               text-white px-4 py-2 rounded-full transition"
                >
                    <img src={Avatar} alt="profile icon" className="w-6 h-6" />
                    Sign up
                </Link>
            </div>
        </nav>
    );
}
