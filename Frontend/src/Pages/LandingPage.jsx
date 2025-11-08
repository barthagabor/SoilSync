import Navbar from "../components/Navbar";
import ArrowLeft from "../assets/icons/Arrow 1.svg";
import ArrowRight from "../assets/icons/Arrow 2.svg";
import Daylight from "../assets/icons/Group 3.svg";
import Wetness from "../assets/icons/Group 5.svg";
import PlantHero from "../assets/icons/transparent-indoor-plants-free-png 1.svg";
import Garden from "../assets/icons/garden.svg";
import GardenSprinkler from "../assets/icons/garden sprinkler.svg";
import Gardener from "../assets/icons/gardener.svg";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";

export default function LandingPage() {
    return (
        <div className="relative min-h-screen bg-gradient-to-b from-garden to-white">

        {/* Navbar */}
            <Navbar />

            {/* Hero szekció – Swiper slider */}
            <Swiper
                modules={[Pagination]}
                pagination={{ clickable: true }}

                loop={true}
                className="w-full max-w-7xl mx-auto min-h-[90vh] md:min-h-[92vh]"
            >

            {/* 1. Slide */}
                <SwiperSlide>
                    <div className="relative -mt-10 md:-mt-16 flex flex-col-reverse md:flex-row items-center justify-between max-w-[90rem] mx-auto px-10 md:px-24 pt-24 md:pt-36 space-y-8 md:space-y-0">

                    {/* Bal oldal - szöveg */}
                        <div className="max-w-lg text-center md:text-left space-y-4 flex-1">
                            <h1 className="font-inter font-semibold text-[40px] leading-[52.9px] text-gray-700">
                                Design Your Ideal Garden with{" "}
                                <span className="text-landingPageIcons font-semibold">AI Assistance</span>
                            </h1>

                            <p className="text-gray-600 text-lg md:text-xl leading-relaxed">
                                Our smart web application uses advanced{" "}
                                <span className="text-landingPageIcons font-semibold">artificial intelligence</span>{" "}
                                to recommend the best plants for your garden based on your local climate, soil type,
                                sunlight exposure, and common regional pests.
                            </p>

                            <div className="flex justify-center md:justify-start">
                                <a
                                    href="/register"
                                    className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-all duration-300"
                                >
                                    Try the AI now
                                </a>
                            </div>
                        </div>


                        {/* Jobb oldal - növény és díszek */}
                        <div className="flex-1 flex justify-end items-center pr-10 md:pr-20 relative">
                            <div className="relative w-[400px] h-[500px] overflow-visible">
                                <img
                                    src={PlantHero}
                                    alt="Plant"
                                    loading="eager"
                                    className="block w-full h-full object-contain select-none pointer-events-none"
                                />
                                {/* ☀️ Daylight ikon */}
                                <img
                                    src={Daylight}
                                    alt="Daylight info"
                                    className="absolute top-[-2.4%] left-[-22.5%] w-[45%] md:w-[40%] select-none pointer-events-none"
                                />

                                {/* 💧 Wetness ikon */}
                                <img
                                    src={Wetness}
                                    alt="Wetness info"
                                    className="absolute bottom-[13%] left-[-36.5%] w-[40%] md:w-[35%] select-none pointer-events-none"
                                />


                                {/* ⬅️ Bal nyíl */}
                                <img
                                    src={ArrowLeft}
                                    alt="Arrow left"
                                    className="absolute top-[9.5%] left-[13%] w-[30%] select-none pointer-events-none"
                                />

                                {/* ➡️ Jobb nyíl */}
                                <img
                                    src={ArrowRight}
                                    alt="Arrow right"
                                    className="absolute top-[63%] left-[-1.5%] w-[25%] select-none pointer-events-none"
                                />
                            </div>
                        </div>
                    </div>
                </SwiperSlide>

                {/* 2. Slide – AI-Powered Gardening rész */}
                <SwiperSlide>
                    <div className="flex flex-col items-center justify-center text-center py-32 space-y-8 px-8">
                        <h2 className="text-4xl md:text-5xl font-bold text-emerald-700">
                            AI-Powered Gardening Made Easy
                        </h2>
                        <p className="text-gray-600 text-lg max-w-2xl">
                            Your smart gardening companion for personalized recommendations,
                            interactive planning, and care reminders.
                        </p>
                        <a
                            href="/register"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-4 rounded-full transition"
                        >
                            Start for Free
                        </a>
                    </div>
                </SwiperSlide>
            </Swiper>
            {/* AI Features Section */}
            <section className="bg-white py-20">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
                        AI-Powered Gardening Made Easy
                    </h2>
                    <p className="text-gray-500 mt-2 mb-12">
                        Your Smart Gardening Companion
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Card 1 */}
                        <div className="bg-white shadow-md rounded-2xl p-8 hover:shadow-xl transition flex flex-col justify-between">
                            <div>
                                <img
                                    src={Gardener}
                                    alt="Garden Icon"
                                    className="mx-auto mb-6 w-16 h-16"
                                />
                                <h3 className="text-xl font-semibold mb-3">
                                    Personalized Plant Recommendations
                                </h3>
                                <p className="text-gray-600">
                                    The AI considers soil type, climate, light conditions, and pests.
                                </p>
                            </div>

                            <div className="mt-8 flex justify-center">
                                <a
                                    href="#"
                                    className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold py-2 px-6 rounded-full transition"
                                >
                                    More
                                </a>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white shadow-md rounded-2xl p-8 hover:shadow-xl transition flex flex-col justify-between">
                            <div>
                                <img
                                    src={Garden}
                                    alt="Garden Sprinkler Icon"
                                    className="mx-auto mb-6 w-16 h-16"
                                />
                                <h3 className="text-xl font-semibold mb-3">
                                    Interactive Garden Planner
                                </h3>
                                <p className="text-gray-600">
                                    Drag and drop plants onto your garden map.
                                </p>
                            </div>

                            <div className="mt-8 flex justify-center">
                                <a
                                    href="#"
                                    className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold py-2 px-6 rounded-full transition"
                                >
                                    More
                                </a>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white shadow-md rounded-2xl p-8 hover:shadow-xl transition flex flex-col justify-between">
                            <div>
                                <img
                                    src={GardenSprinkler}
                                    alt="Gardener Icon"
                                    className="mx-auto mb-6 w-16 h-16"
                                />
                                <h3 className="text-xl font-semibold mb-3">Plant Care Assistant</h3>
                                <p className="text-gray-600">
                                    Automatic reminders for watering, pruning, and fertilizing.
                                </p>
                            </div>

                            <div className="mt-8 flex justify-center">
                                <a
                                    href="#"
                                    className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold py-2 px-6 rounded-full transition"
                                >
                                    More
                                </a>
                            </div>
                        </div>
                    </div>


                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 text-center py-10 text-gray-500 text-sm">
                © {new Date().getFullYear()} SoilSync. All rights reserved.
            </footer>
        </div>
    );
}
