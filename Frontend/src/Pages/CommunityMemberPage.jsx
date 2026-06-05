import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, PenTool, Sprout, Users } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import CommunityPostCard from "../components/community/CommunityPostCard.jsx";
import {
    CommunityAvatar,
    CommunityRoleBadge,
    CommunitySavedGardenTeaser,
    CommunityStatChip,
} from "../components/community/CommunityBits.jsx";
import { usePageScrollRestoration } from "../hooks/usePagePersistence.js";
import { formatRelativeDate } from "../data/communityData.js";
import { fetchCommunityMemberDetailRequest } from "../services/communityService.jsx";

export default function CommunityMemberPage() {
    const { username } = useParams();
    const [member, setMember] = useState(null);
    const [memberPosts, setMemberPosts] = useState([]);
    const [memberGardens, setMemberGardens] = useState([]);
    const [activeTab, setActiveTab] = useState("posts");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    usePageScrollRestoration(`page:community-member:${username}`);

    useEffect(() => {
        let ignore = false;

        const loadMember = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await fetchCommunityMemberDetailRequest(username);
                if (ignore) return;

                setMember(data?.member || null);
                setMemberPosts(Array.isArray(data?.posts) ? data.posts : []);
                setMemberGardens(Array.isArray(data?.gardens) ? data.gardens : []);
            } catch (requestError) {
                if (ignore) return;
                setError(requestError.message || "Failed to load community member.");
                setMember(null);
                setMemberPosts([]);
                setMemberGardens([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        loadMember();

        return () => {
            ignore = true;
        };
    }, [username]);

    if (loading) {
        return (
            <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
                <Navbar />
                <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 md:px-6">
                    <div className="rounded-[34px] border border-white/70 bg-white/92 p-8 text-center shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                        <h1 className="font-playfair text-4xl text-greenDark">Loading member profile...</h1>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-greenMid">
                            Fetching the member profile, posts, and shared gardens.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
                <Navbar />
                <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 md:px-6">
                    <div className="rounded-[34px] border border-white/70 bg-white/92 p-8 text-center shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                        <h1 className="font-playfair text-4xl text-greenDark">{error ? "Community member unavailable" : "Member not found"}</h1>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-greenMid">
                            {error || "This profile could not be found in the current community dataset."}
                        </p>
                        <Link
                            to="/community"
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                        >
                            Return to community
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-6">
                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                >
                    <ArrowLeft size={14} />
                    Back to community
                </Link>

                <section className="mt-6 rounded-[36px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_60px_rgba(52,78,24,0.12)] md:p-8">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start">
                        <CommunityAvatar member={member} size="xl" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="font-playfair text-4xl text-greenDark">{member.name}</h1>
                                <CommunityRoleBadge member={member} />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-greenMid">@{member.username}</p>
                            <p className="mt-4 max-w-3xl text-sm leading-7 text-greenMid">{member.bio}</p>
                            <div className="mt-4 flex flex-wrap gap-3 text-sm text-greenDark">
                                <span className="rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-1.5">
                                    {member.location}
                                </span>
                                <span className="rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-1.5">
                                    Joined {formatRelativeDate(member.joinedAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <CommunityStatChip icon={MessageCircle} value={member.stats.posts} label="Posts" />
                        <CommunityStatChip icon={Sprout} value={member.stats.helpfulAnswers} label="Helpful answers" />
                        <CommunityStatChip icon={PenTool} value={member.stats.showcases} label="Showcases" />
                        <CommunityStatChip icon={Users} value={member.stats.followers} label="Followers" />
                    </div>
                </section>

                <section className="mt-8">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: "posts", label: `Posts (${memberPosts.length})` },
                            { value: "gardens", label: `Shared gardens (${memberGardens.length})` },
                            { value: "highlights", label: "Highlights" },
                        ].map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setActiveTab(tab.value)}
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                    activeTab === tab.value
                                        ? "border-landingPageIcons bg-landingPageIcons text-white"
                                        : "border-[#dbe6cf] bg-white text-greenDark hover:bg-[#f8fbf3]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5">
                        {activeTab === "posts" ? (
                            <div className="space-y-4">
                                {memberPosts.map((post) => (
                                    <CommunityPostCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : null}

                        {activeTab === "gardens" ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {memberGardens.map((garden) => (
                                    <CommunitySavedGardenTeaser key={garden.id} garden={garden} />
                                ))}
                            </div>
                        ) : null}

                        {activeTab === "highlights" ? (
                            <div className="rounded-[30px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                                <h2 className="font-playfair text-3xl text-greenDark">Contribution snapshot</h2>
                                <p className="mt-4 text-sm leading-7 text-greenMid">
                                    {member.name} is strongest when translating attractive concepts into clearer, more maintainable decisions. Their posts tend to focus on realism, palette restraint, and practical tradeoffs rather than pure inspiration.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </section>
            </main>
        </div>
    );
}
