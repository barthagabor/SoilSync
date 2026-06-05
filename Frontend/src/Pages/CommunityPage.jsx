import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Compass, Plus } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePageScrollRestoration } from "../hooks/usePagePersistence.js";
import CommunityPostCard from "../components/community/CommunityPostCard.jsx";
import { CommunitySearchField, CommunitySidebar } from "../components/community/CommunitySidebar.jsx";
import { communityFeedFilters, getCommunityRegionLabel } from "../data/communityData.js";
import { fetchCommunityFeedRequest } from "../services/communityService.jsx";

export default function CommunityPage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeFilter, setActiveFilter] = useState(searchParams.get("filter") || "all");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTag, setActiveTag] = useState(searchParams.get("tag") || "");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [posts, setPosts] = useState([]);
    const [topicCards, setTopicCards] = useState([]);
    const [suggestedMembers, setSuggestedMembers] = useState([]);

    usePageScrollRestoration("page:community");

    useEffect(() => {
        setActiveFilter(searchParams.get("filter") || "all");
        setActiveTag(searchParams.get("tag") || "");
    }, [searchParams]);

    const currentRegion = getCommunityRegionLabel(user?.location);

    useEffect(() => {
        let ignore = false;
        const timeoutId = window.setTimeout(async () => {
            try {
                setLoading(true);
                setError("");
                const data = await fetchCommunityFeedRequest({
                    filter: activeFilter,
                    search: searchTerm,
                    tag: activeTag,
                    location: currentRegion,
                });

                if (ignore) return;

                setPosts(Array.isArray(data?.posts) ? data.posts : []);
                setTopicCards(Array.isArray(data?.topicCards) ? data.topicCards : []);
                setSuggestedMembers(Array.isArray(data?.suggestedMembers) ? data.suggestedMembers : []);
            } catch (requestError) {
                if (ignore) return;
                setError(requestError.message || "Failed to load the community feed.");
                setPosts([]);
                setTopicCards([]);
                setSuggestedMembers([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        }, 160);

        return () => {
            ignore = true;
            window.clearTimeout(timeoutId);
        };
    }, [activeFilter, searchTerm, activeTag, currentRegion]);

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <Navbar />
            <main className="mx-auto max-w-7xl px-4 pb-20 pt-28 md:px-6">
                <section className="grid gap-8 xl:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                        <div className="rounded-[30px] border border-white/70 bg-white/90 p-5 shadow-[0_16px_48px_rgba(52,78,24,0.08)] md:p-6">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <CommunitySearchField value={searchTerm} onChange={setSearchTerm} />
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                        to="/community/topics"
                                        className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm font-semibold text-greenDark transition hover:bg-white"
                                    >
                                        <Compass size={15} />
                                        Topics
                                    </Link>
                                    <Link
                                        to="/community/create"
                                        className="inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                                    >
                                        <Plus size={15} />
                                        New post
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {communityFeedFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        type="button"
                                        onClick={() => {
                                            setActiveFilter(filter.value);
                                            const next = new URLSearchParams(searchParams);
                                            if (filter.value === "all") {
                                                next.delete("filter");
                                            } else {
                                                next.set("filter", filter.value);
                                            }
                                            setSearchParams(next);
                                        }}
                                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                            activeFilter === filter.value
                                                ? "border-landingPageIcons bg-landingPageIcons text-white"
                                                : "border-[#dbe6cf] bg-[#f8fbf3] text-greenDark hover:bg-white"
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {topicCards.slice(0, 8).map((topic) => {
                                    const active = activeTag === topic.slug;
                                    return (
                                        <button
                                            key={topic.slug}
                                            type="button"
                                            onClick={() => {
                                                const nextTag = active ? "" : topic.slug;
                                                setActiveTag(nextTag);
                                                const next = new URLSearchParams(searchParams);
                                                if (nextTag) {
                                                    next.set("tag", nextTag);
                                                } else {
                                                    next.delete("tag");
                                                }
                                                setSearchParams(next);
                                            }}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                active
                                                    ? "border-[#345b83] bg-[#f1f7fd] text-[#345b83]"
                                                    : "border-[#dbe6cf] bg-white text-greenMid hover:bg-[#f8fbf3]"
                                            }`}
                                        >
                                            #{topic.slug}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                <div className="rounded-[30px] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-[0_12px_34px_rgba(52,78,24,0.06)]">
                                    <h2 className="font-playfair text-3xl text-greenDark">Loading community posts...</h2>
                                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-greenMid">
                                        Fetching the latest discussions, garden showcases, and local notes.
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="rounded-[30px] border border-[#f4c9c5] bg-[#fff2f0] px-6 py-10 text-center shadow-[0_12px_34px_rgba(52,78,24,0.06)]">
                                    <h2 className="font-playfair text-3xl text-[#8f352f]">Community feed unavailable</h2>
                                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#8f352f]/80">{error}</p>
                                </div>
                            ) : posts.length ? (
                                posts.map((post) => <CommunityPostCard key={post.id} post={post} />)
                            ) : (
                                <div className="rounded-[30px] border border-dashed border-[#dbe6cf] bg-white/80 px-6 py-10 text-center shadow-[0_12px_34px_rgba(52,78,24,0.06)]">
                                    <h2 className="font-playfair text-3xl text-greenDark">No matching posts yet</h2>
                                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-greenMid">
                                        Try clearing the search or switching the active filter. Once members publish posts, this feed will surface questions, showcases, local notes, and progress updates here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="space-y-4">
                        <CommunitySidebar
                            currentRegion={currentRegion}
                            topicCards={topicCards}
                            suggestedMembers={suggestedMembers}
                        />
                    </aside>
                </section>
            </main>
        </div>
    );
}
