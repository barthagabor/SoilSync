import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import CommunityCommentsPanel from "../components/community/CommunityCommentsPanel.jsx";
import CommunityPostCard from "../components/community/CommunityPostCard.jsx";
import { CommunityAvatar, CommunityRoleBadge } from "../components/community/CommunityBits.jsx";
import { usePageScrollRestoration } from "../hooks/usePagePersistence.js";
import { formatRelativeDate } from "../data/communityData.js";
import { fetchCommunityPostDetailRequest } from "../services/communityService.jsx";

export default function CommunityPostPage() {
    const { postId } = useParams();
    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const commentsSectionRef = useRef(null);

    usePageScrollRestoration(`page:community-post:${postId}`);

    useEffect(() => {
        let ignore = false;

        const loadPost = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await fetchCommunityPostDetailRequest(postId);
                if (ignore) return;

                setPost(data?.post || null);
                setRelatedPosts(Array.isArray(data?.relatedPosts) ? data.relatedPosts : []);
            } catch (requestError) {
                if (ignore) return;
                setError(requestError.message || "Failed to load community post.");
                setPost(null);
                setRelatedPosts([]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        loadPost();

        return () => {
            ignore = true;
        };
    }, [postId]);

    useEffect(() => {
        if (loading || !post || window.location.hash !== "#comments") return;

        window.setTimeout(() => {
            commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
    }, [loading, post]);

    const focusComments = () => {
        commentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleCommentCountChange = (nextCount) => {
        setPost((prev) =>
            prev
                ? {
                      ...prev,
                      comments: Number(nextCount || 0),
                  }
                : prev
        );
    };

    if (loading) {
        return (
            <CommunityErrorState
                title="Loading community post..."
                description="Fetching the selected discussion and author context."
            />
        );
    }

    if (!post) {
        return (
            <CommunityErrorState
                title={error ? "Community post unavailable" : "Post not found"}
                description={error || "This community entry does not exist, or it is no longer available."}
            />
        );
    }

    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 pb-20 pt-28 md:px-6">
                <Link
                    to="/community"
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                >
                    <ArrowLeft size={14} />
                    Back to community
                </Link>

                <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_290px]">
                    <div className="space-y-6">
                        <CommunityPostCard
                            post={post}
                            variant="detail"
                            onPostUpdate={setPost}
                            onCommentClick={focusComments}
                        />

                        <section ref={commentsSectionRef}>
                            <CommunityCommentsPanel
                                postId={post.id}
                                open
                                onCommentCountChange={handleCommentCountChange}
                                commentCount={post.comments}
                            />
                        </section>
                    </div>

                    <aside className="space-y-4">
                        <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_12px_34px_rgba(52,78,24,0.08)]">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-greenMid">Author</p>
                            <Link to={`/community/member/${post.author.username}`} className="mt-4 flex items-center gap-3">
                                <CommunityAvatar member={post.author} size="lg" />
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-semibold text-greenDark">{post.author.name}</h3>
                                        <CommunityRoleBadge member={post.author} />
                                    </div>
                                    <p className="text-sm text-greenMid">@{post.author.username}</p>
                                </div>
                            </Link>
                            <p className="mt-4 text-sm leading-7 text-greenMid">{post.author.bio}</p>
                        </section>

                        {relatedPosts.length ? (
                            <section className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_12px_34px_rgba(52,78,24,0.08)]">
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-greenMid">More from this member</p>
                                <div className="mt-4 space-y-3">
                                    {relatedPosts.map((relatedPost) => (
                                        <Link
                                            key={relatedPost.id}
                                            to={`/community/post/${relatedPost.id}`}
                                            className="block rounded-[20px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-4 transition hover:bg-white"
                                        >
                                            <p className="font-semibold text-greenDark">{relatedPost.title}</p>
                                            <p className="mt-2 text-sm text-greenMid">{formatRelativeDate(relatedPost.createdAt)}</p>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </aside>
                </div>
            </main>
        </div>
    );
}

function CommunityErrorState({ title, description }) {
    return (
        <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 pb-20 pt-28 md:px-6">
                <div className="rounded-[34px] border border-white/70 bg-white/92 p-8 text-center shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
                    <h1 className="font-playfair text-4xl text-greenDark">{title}</h1>
                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-greenMid">{description}</p>
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
