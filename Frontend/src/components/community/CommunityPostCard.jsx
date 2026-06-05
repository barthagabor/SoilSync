import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Heart, MessageCircle, Share2, Sparkles } from "lucide-react";
import {
    CommunityAvatar,
    CommunityMetaRow,
    CommunityPlantTags,
    CommunityRoleBadge,
    CommunitySavedGardenTeaser,
    CommunityTypePill,
} from "./CommunityBits.jsx";
import { truncateCommunityText } from "../../data/communityData.js";
import {
    toggleCommunityPostLikeRequest,
    toggleCommunityPostSaveRequest,
} from "../../services/communityService.jsx";
import CommunityCommentsPanel from "./CommunityCommentsPanel.jsx";

const getStoredToken = () => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("token") || "";
};

export default function CommunityPostCard({
    post,
    variant = "feed",
    interactive = true,
    onPostUpdate,
    onCommentClick,
}) {
    const [localPost, setLocalPost] = useState(post);
    const [likeLoading, setLikeLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    useEffect(() => {
        setLocalPost(post);
    }, [post]);

    useEffect(() => {
        setCommentsOpen(false);
        setActionMessage(null);
    }, [post?.id]);

    useEffect(() => {
        if (!actionMessage) return undefined;

        const timeoutId = window.setTimeout(() => {
            setActionMessage(null);
        }, 2600);

        return () => window.clearTimeout(timeoutId);
    }, [actionMessage]);

    if (!localPost) return null;

    const isDetail = variant === "detail";
    const canInteract = Boolean(interactive && localPost.id && localPost.id !== "draft-preview");
    const canToggleInlineComments = canInteract && !isDetail && typeof onCommentClick !== "function";
    const content = isDetail ? localPost.body : truncateCommunityText(localPost.body, 240);

    const applyPostUpdate = (nextPost) => {
        setLocalPost(nextPost);
        onPostUpdate?.(nextPost);
    };

    const requireToken = () => {
        const token = getStoredToken();
        if (!token) {
            setActionMessage({
                type: "error",
                text: "Sign in to use this community action.",
            });
        }
        return token;
    };

    const handleLike = async () => {
        if (!canInteract || likeLoading) return;

        const token = requireToken();
        if (!token) return;

        const likedNow = !localPost.likedByCurrentUser;
        const previousPost = localPost;
        const optimisticPost = {
            ...localPost,
            likedByCurrentUser: likedNow,
            likes: Math.max(0, Number(localPost.likes || 0) + (likedNow ? 1 : -1)),
        };

        applyPostUpdate(optimisticPost);
        setLikeLoading(true);

        try {
            const data = await toggleCommunityPostLikeRequest(token, localPost.id);
            applyPostUpdate({
                ...optimisticPost,
                likedByCurrentUser: Boolean(data?.liked),
                likes: Number(data?.likes ?? optimisticPost.likes ?? 0),
            });
        } catch (error) {
            applyPostUpdate(previousPost);
            setActionMessage({
                type: "error",
                text: error.message || "Could not update the like right now.",
            });
        } finally {
            setLikeLoading(false);
        }
    };

    const handleSave = async () => {
        if (!canInteract || saveLoading) return;

        const token = requireToken();
        if (!token) return;

        const previousPost = localPost;
        const optimisticPost = {
            ...localPost,
            savedByCurrentUser: !localPost.savedByCurrentUser,
        };

        applyPostUpdate(optimisticPost);
        setSaveLoading(true);

        try {
            const data = await toggleCommunityPostSaveRequest(token, localPost.id);
            const saved = Boolean(data?.saved);
            applyPostUpdate({
                ...optimisticPost,
                savedByCurrentUser: saved,
            });
            setActionMessage({
                type: "success",
                text: saved ? "Post saved to your community collection." : "Post removed from saved items.",
            });
        } catch (error) {
            applyPostUpdate(previousPost);
            setActionMessage({
                type: "error",
                text: error.message || "Could not update the saved state right now.",
            });
        } finally {
            setSaveLoading(false);
        }
    };

    const handleShare = async () => {
        if (!canInteract) return;

        const shareUrl = new URL(`/community/post/${localPost.id}`, window.location.origin).toString();
        const sharePayload = {
            title: localPost.title,
            text: truncateCommunityText(localPost.body, 120),
            url: shareUrl,
        };

        try {
            if (navigator.share) {
                await navigator.share(sharePayload);
                setActionMessage({ type: "success", text: "Post share sheet opened." });
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                setActionMessage({ type: "success", text: "Post link copied to clipboard." });
                return;
            }

            throw new Error("Sharing is not supported in this browser.");
        } catch (error) {
            if (error?.name === "AbortError") return;

            setActionMessage({
                type: "error",
                text: error.message || "Could not share the post right now.",
            });
        }
    };

    const handleComment = () => {
        if (!canInteract) return;

        if (typeof onCommentClick === "function") {
            onCommentClick();
            return;
        }

        setCommentsOpen((prev) => !prev);
    };

    const handleCommentCountChange = (nextCount) => {
        applyPostUpdate({
            ...localPost,
            comments: Number(nextCount || 0),
        });
    };

    const authorBlock = (
        <>
            <CommunityAvatar member={localPost.author} />
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-greenDark">{localPost.author.name}</p>
                    <CommunityRoleBadge member={localPost.author} />
                </div>
                <p className="truncate text-xs text-greenMid">@{localPost.author.username}</p>
            </div>
        </>
    );

    return (
        <article className="overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_18px_52px_rgba(52,78,24,0.09)]">
            <div className="p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    {canInteract ? (
                        <Link to={`/community/member/${localPost.author.username}`} className="flex min-w-0 items-center gap-3">
                            {authorBlock}
                        </Link>
                    ) : (
                        <div className="flex min-w-0 items-center gap-3">{authorBlock}</div>
                    )}
                    <CommunityTypePill type={localPost.type} />
                </div>

                <CommunityMetaRow post={localPost} />

                {isDetail ? (
                    <h1 className="mt-4 font-playfair text-4xl leading-tight text-greenDark">{localPost.title}</h1>
                ) : canInteract ? (
                    <Link to={`/community/post/${localPost.id}`} className="group block">
                        <h2 className="mt-4 font-playfair text-3xl leading-tight text-greenDark transition group-hover:text-landingPageIcons">
                            {localPost.title}
                        </h2>
                    </Link>
                ) : (
                    <h2 className="mt-4 font-playfair text-3xl leading-tight text-greenDark">{localPost.title}</h2>
                )}

                {localPost.solved && localPost.solvedBy ? (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d2e3f2] bg-[#f1f7fd] px-3 py-1.5 text-xs font-semibold text-[#345b83]">
                        <Sparkles size={13} />
                        Marked solved by {localPost.solvedBy.name}
                    </div>
                ) : null}

                <p className="mt-4 text-[0.96rem] leading-8 text-greenMid">{content}</p>

                {localPost.images?.length ? (
                    <div className={`mt-5 grid gap-3 ${localPost.images.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                        {localPost.images.slice(0, isDetail ? localPost.images.length : 2).map((image) => (
                            <div key={image.id} className="relative overflow-hidden rounded-[24px] border border-[#dbe6cf] bg-[#f4f8ed]">
                                <img
                                    src={image.src}
                                    alt={image.alt}
                                    className={`w-full object-cover ${localPost.images.length > 1 ? "h-64" : "h-[340px]"}`}
                                />
                                {image.isBefore || image.isAfter ? (
                                    <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-greenDark">
                                        {image.isBefore ? "Before" : "After"}
                                    </span>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                <CommunityPlantTags plants={localPost.plants} />
                <CommunitySavedGardenTeaser garden={localPost.savedGarden} compact={!isDetail} />

                {localPost.tags?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {localPost.tags.map((tag) =>
                            canInteract ? (
                                <Link
                                    key={tag}
                                    to={`/community/topics?tag=${tag}`}
                                    className="rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons transition hover:bg-white"
                                >
                                    #{tag}
                                </Link>
                            ) : (
                                <span
                                    key={tag}
                                    className="rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons"
                                >
                                    #{tag}
                                </span>
                            )
                        )}
                    </div>
                ) : null}
            </div>

            <div className="border-t border-[#e6edde] px-5 py-4 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <ActionButton
                            icon={Heart}
                            label={localPost.likes}
                            onClick={handleLike}
                            active={Boolean(localPost.likedByCurrentUser)}
                            disabled={!canInteract}
                            loading={likeLoading}
                            ariaLabel={localPost.likedByCurrentUser ? "Unlike post" : "Like post"}
                        />
                        <ActionButton
                            icon={MessageCircle}
                            label={localPost.comments}
                            onClick={handleComment}
                            active={canToggleInlineComments && commentsOpen}
                            disabled={!canInteract}
                            ariaLabel={
                                canToggleInlineComments
                                    ? commentsOpen
                                        ? "Hide comments"
                                        : "Show comments"
                                    : "Open comments"
                            }
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <ActionButton
                            icon={Bookmark}
                            label={localPost.savedByCurrentUser ? "Saved" : "Save"}
                            onClick={handleSave}
                            active={Boolean(localPost.savedByCurrentUser)}
                            disabled={!canInteract}
                            loading={saveLoading}
                            ariaLabel={localPost.savedByCurrentUser ? "Remove saved post" : "Save post"}
                        />
                        <ActionButton
                            icon={Share2}
                            label="Share"
                            onClick={handleShare}
                            disabled={!canInteract}
                            ariaLabel="Share post"
                        />
                    </div>
                </div>

                {actionMessage ? (
                    <div
                        className={`mt-3 rounded-[18px] px-4 py-3 text-sm ${
                            actionMessage.type === "error"
                                ? "border border-[#f4c9c5] bg-[#fff2f0] text-[#8f352f]"
                                : "border border-[#d2e3f2] bg-[#f1f7fd] text-[#345b83]"
                        }`}
                    >
                        {actionMessage.text}
                    </div>
                ) : null}

                <CommunityCommentsPanel
                    postId={localPost.id}
                    open={commentsOpen}
                    onCommentCountChange={handleCommentCountChange}
                    commentCount={localPost.comments}
                />
            </div>
        </article>
    );
}

function ActionButton({
    icon: Icon,
    label,
    onClick,
    active = false,
    disabled = false,
    loading = false,
    ariaLabel,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                    ? "border-landingPageIcons bg-[#edf4e3] text-landingPageIcons"
                    : "border-[#dbe6cf] bg-white text-greenDark hover:bg-[#f8fbf3]"
            } ${disabled || loading ? "cursor-not-allowed opacity-60" : ""}`}
        >
            <Icon size={14} />
            <span>{loading ? "..." : label}</span>
        </button>
    );
}
