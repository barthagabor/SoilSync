import Navbar from "../components/Navbar";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-garden to-landingPage flex flex-col">
            {/* Navbar */}
            <Navbar />

            {/* Hero section */}
            <div className="flex flex-col md:flex-row items-center justify-between px-10 md:px-20 pt-24 md:pt-32 flex-grow">
                {/* Bal oldal - szöveg */}
                <div className="max-w-xl text-center md:text-left space-y-6">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-landingPageIcons leading-tight">
                        Plant smarter, <br /> grow with <span className="text-emerald-700">AI</span>.
                    </h1>
                    <p className="text-gray-700 text-lg md:text-xl">
                        Discover plants perfect for your garden.
                        SoilSync helps you design and care for your garden with artificial intelligence.
                    </p>
                    <div className="flex justify-center md:justify-start space-x-4">
                        <a
                            href="/register"
                            className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white px-6 py-3 rounded-lg font-semibold transition"
                        >
                            Get Started
                        </a>
                        <a
                            href="/login"
                            className="border border-landingPageIcons text-landingPageIcons hover:bg-landingPageIcons hover:text-white px-6 py-3 rounded-lg font-semibold transition"
                        >
                            Sign In
                        </a>
                    </div>
                </div>

                {/* Jobb oldal - kép */}
                <div className="mt-12 md:mt-0">
                    <img
                        src="./src/assets/icons/SignUpPlant.png"
                        alt="Plant illustration"
                        className="w-[400px] md:w-[500px] h-auto drop-shadow-xl"
                    />
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-6 text-gray-500 text-sm">
                © {new Date().getFullYear()} SoilSync. All rights reserved.
            </footer>
        </div>
    );
}
