import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import CommunityComposer from "../components/community/CommunityComposer.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePageScrollRestoration } from "../hooks/usePagePersistence.js";
import {
    createCommunityPostRequest,
    fetchCommunityComposerContextRequest,
} from "../services/communityService.jsx";

export default function CommunityCreatePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [composerContext, setComposerContext] = useState(null);
    const [loadingContext, setLoadingContext] = useState(Boolean(user));
    const [contextError, setContextError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState(null);

    usePageScrollRestoration("page:community-create");

    useEffect(() => {
        if (!user) {
            setComposerContext(null);
            setLoadingContext(false);
            setContextError("");
            return;
        }

        let ignore = false;

        const loadComposerContext = async () => {
            try {
                setLoadingContext(true);
                setContextError("");
                const token = localStorage.getItem("token");
                const data = await fetchCommunityComposerContextRequest(token);
                if (ignore) return;
                setComposerContext(data || null);
            } catch (error) {
                if (ignore) return;
                setContextError(error.message || "Failed to load the community composer context.");
                setComposerContext(null);
            } finally {
                if (!ignore) setLoadingContext(false);
            }
        };

        loadComposerContext();

        return () => {
            ignore = true;
        };
    }, [user]);

    const handlePublish = async (payload) => {
        const token = localStorage.getItem("token");
        if (!token) {
            setSubmitMessage({ type: "error", text: "You need to be signed in to publish a post." });
            return;
        }

        try {
            setSubmitting(true);
            setSubmitMessage(null);
            const data = await createCommunityPostRequest(token, payload);
            navigate(`/community/post/${data?.post?.id}`);
        } catch (error) {
            setSubmitMessage({
                type: "error",
                text: error.message || "Failed to publish the community post.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 md:px-6">
                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                >
                    <ArrowLeft size={14} />
                    Back to community
                </Link>

                <section className="mt-6">
                    {user ? (
                        loadingContext ? (
                            <div className="mx-auto max-w-3xl rounded-[34px] border border-white/70 bg-white/92 p-8 text-center shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                                <h1 className="font-playfair text-4xl text-greenDark">Loading composer context...</h1>
                                <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-greenMid">
                                    Pulling your saved gardens, plant options, and posting profile.
                                </p>
                            </div>
                        ) : contextError ? (
                            <div className="mx-auto max-w-3xl rounded-[34px] border border-[#f4c9c5] bg-[#fff2f0] p-8 text-center shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                                <h1 className="font-playfair text-4xl text-[#8f352f]">Composer unavailable</h1>
                                <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[#8f352f]/80">
                                    {contextError}
                                </p>
                            </div>
                        ) : (
                            <CommunityComposer
                                user={user}
                                author={composerContext?.author || null}
                                gardenOptions={composerContext?.savedGardens || []}
                                plantOptions={composerContext?.availablePlants || []}
                                postTypeOptions={composerContext?.postTypeOptions || []}
                                suggestedRegion={composerContext?.suggestedRegion || ""}
                                onPublish={handlePublish}
                                submitting={submitting}
                                submitMessage={submitMessage}
                            />
                        )
                    ) : (
                        <div className="mx-auto max-w-3xl rounded-[34px] border border-white/70 bg-white/92 p-8 text-center shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6f3d9] text-[#a57f11]">
                                <Lock size={28} />
                            </div>
                            <h1 className="mt-5 font-playfair text-4xl text-greenDark">Sign in to create community posts</h1>
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-greenMid">
                                Browsing the community is public, but creating a post should stay tied to a real SoilSync profile so it can later connect to favourites, saved gardens, and planner results.
                            </p>
                            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                <Link
                                    to="/login"
                                    className="rounded-full bg-landingPageIcons px-6 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                                >
                                    Go to login
                                </Link>
                                <Link
                                    to="/community"
                                    className="rounded-full border border-[#dbe6cf] bg-white px-6 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                                >
                                    Return to feed
                                </Link>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
