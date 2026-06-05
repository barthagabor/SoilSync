import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock3, Compass, Heart, Layout, MapPin, PenTool, Shield } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import CommunityPostCard from "../components/community/CommunityPostCard.jsx";
import { usePageScrollRestoration } from "../hooks/usePagePersistence.js";
import { fetchCommunityTopicsRequest } from "../services/communityService.jsx";

const iconMap = {
    Layout,
    Shield,
    MapPin,
    Clock3,
    Heart,
    PenTool,
    Compass,
};

export default function CommunityTopicsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTag = searchParams.get("tag") || "";
    const [activeTag, setActiveTag] = useState(initialTag);
    const [topics, setTopics] = useState([]);
    const [focusedPosts, setFocusedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    usePageScrollRestoration("page:community-topics");

    useEffect(() => {
        setActiveTag(searchParams.get("tag") || "");
    }, [searchParams]);

    useEffect(() => {
        let ignore = false;

        const loadTopics = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await fetchCommunityTopicsRequest(activeTag ? { tag: activeTag } : {});
                if (ignore) return;
                setTopics(Array.isArray(data?.topics) ? data.topics : []);
                setFocusedPosts(Array.isArray(data?.focusedPosts) ? data.focusedPosts : []);
            } catch (requestError) {
                if (ignore) return;
                setError(requestError.message || "Failed to load community topics.");
                setTopics([]);
                setFocusedPosts([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        loadTopics();

        return () => {
            ignore = true;
        };
    }, [activeTag]);

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

                <section className="mt-6 rounded-[36px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_60px_rgba(52,78,24,0.12)] md:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                        <Compass size={13} />
                        Topic discovery
                    </div>
                    <h1 className="mt-4 font-playfair text-4xl text-greenDark">Explore the community by topic</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-8 text-greenMid">
                        These topics separate planner-sharing, local notes, plant-health discussion, and practical design thinking so the community stays useful instead of collapsing into one generic feed.
                    </p>
                </section>

                {error ? (
                    <section className="mt-8 rounded-[30px] border border-[#f4c9c5] bg-[#fff2f0] px-6 py-8 shadow-[0_14px_42px_rgba(52,78,24,0.08)]">
                        <h2 className="font-playfair text-3xl text-[#8f352f]">Topic discovery unavailable</h2>
                        <p className="mt-3 text-sm leading-7 text-[#8f352f]/80">{error}</p>
                    </section>
                ) : null}

                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {topics.map((topic) => {
                        const Icon = iconMap[topic.icon] || Compass;
                        const active = activeTag === topic.slug;

                        return (
                            <button
                                key={topic.slug}
                                type="button"
                                onClick={() => {
                                    const nextTag = active ? "" : topic.slug;
                                    setActiveTag(nextTag);
                                    setSearchParams(nextTag ? { tag: nextTag } : {});
                                }}
                                className={`rounded-[30px] border p-5 text-left shadow-[0_14px_42px_rgba(52,78,24,0.08)] transition ${
                                    active
                                        ? "border-landingPageIcons bg-[#edf4e3]"
                                        : "border-white/70 bg-white/92 hover:bg-[#f8fbf3]"
                                }`}
                            >
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-landingPageIcons shadow-[0_8px_20px_rgba(52,78,24,0.08)]">
                                    <Icon size={18} />
                                </div>
                                <h2 className="mt-4 font-playfair text-3xl text-greenDark">{topic.name}</h2>
                                <p className="mt-2 text-sm leading-7 text-greenMid">{topic.description}</p>
                                <div className="mt-4 inline-flex rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-semibold text-greenDark">
                                    {topic.postCount} matching posts
                                </div>
                            </button>
                        );
                    })}
                </section>

                {activeTag ? (
                    <section className="mt-8 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-greenMid">Focused topic</p>
                                <h2 className="mt-1 font-playfair text-3xl text-greenDark">#{activeTag}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTag("");
                                    setSearchParams({});
                                }}
                                className="rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                            >
                                Clear topic
                            </button>
                        </div>

                        {loading ? (
                            <div className="rounded-[30px] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-[0_12px_34px_rgba(52,78,24,0.06)]">
                                <h3 className="font-playfair text-3xl text-greenDark">Loading topic posts...</h3>
                                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-greenMid">
                                    Fetching the current posts for this topic.
                                </p>
                            </div>
                        ) : focusedPosts.length ? (
                            focusedPosts.map((post) => <CommunityPostCard key={post.id} post={post} />)
                        ) : (
                            <div className="rounded-[30px] border border-dashed border-[#dbe6cf] bg-white/80 px-6 py-10 text-center shadow-[0_12px_34px_rgba(52,78,24,0.06)]">
                                <h3 className="font-playfair text-3xl text-greenDark">No posts for this topic yet</h3>
                                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-greenMid">
                                    This topic exists in the system, but no live community post is attached to it yet.
                                </p>
                            </div>
                        )}
                    </section>
                ) : null}
            </main>
        </div>
    );
}
