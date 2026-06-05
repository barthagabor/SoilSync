import { Link, useNavigate } from "react-router-dom";
import { Crown, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { usePageScrollRestoration } from "../hooks/usePagePersistence";
import { usePremiumAssistant } from "../hooks/usePremiumAssistant.js";
import { PremiumAssistantPageSurface } from "../components/premium/PremiumAssistantSurface.jsx";

export default function PremiumAssistant() {
    const { user, isPremium } = useAuth();
    const navigate = useNavigate();
    const controller = usePremiumAssistant({
        storagePrefix: "page:premium-assistant",
        user,
        redirectOnMissingUser: true,
        navigate,
    });

    usePageScrollRestoration("page:premium-assistant", !controller.loading);

    if (!user) {
        return null;
    }

    if (!isPremium) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(228,237,216,0.96)_36%,_rgba(205,219,188,0.98)_100%)] px-4 pb-12 pt-28 font-dm">
                <div className="mx-auto max-w-4xl rounded-[34px] border border-white/70 bg-white/88 p-10 text-center shadow-[0_28px_90px_rgba(52,78,24,0.14)]">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f6f3d9] text-[#a57f11]">
                        <Crown size={30} />
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#efe4b2] bg-[#fff8df] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#9d7a10]">
                        <Sparkles size={13} />
                        Premium Feature
                    </div>
                    <h1 className="mt-5 font-playfair text-4xl text-greenDark">Premium AI Garden Consultant</h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-greenMid">
                        This assistant uses your SoilSync profile, favourites, saved gardens, selected plants, and the existing planner and recommender routes.
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <Link to="/profile" className="rounded-full bg-landingPageIcons px-6 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons">
                            Go to Profile
                        </Link>
                        <Link to="/recommender" className="rounded-full border border-[#dbe6cf] bg-white px-6 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]">
                            Use Recommender Instead
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <PremiumAssistantPageSurface controller={controller} />;
}
