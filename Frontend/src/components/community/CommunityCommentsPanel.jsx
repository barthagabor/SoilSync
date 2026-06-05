import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, MoreHorizontal, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatRelativeDate } from "../../data/communityData.js";
import {
    createCommunityCommentRequest,
    fetchCommunityPostDetailRequest,
} from "../../services/communityService.jsx";
import { CommunityAvatar, CommunityRoleBadge } from "./CommunityBits.jsx";

function insertReplyIntoRoot(comments, rootCommentId, nextComment) {
    return comments.map((comment) => {
        if (comment.id === rootCommentId) {
            return {
                ...comment,
                replies: [...flattenReplies(comment.replies), nextComment],
            };
        }

        return comment;
    });
}

function flattenReplies(replies = []) {
    return replies.reduce((allReplies, reply) => {
        allReplies.push({ ...reply, replies: [] });

        if (Array.isArray(reply.replies) && reply.replies.length) {
            allReplies.push(...flattenReplies(reply.replies));
        }

        return allReplies;
    }, []);
}

function countComments(comments = []) {
    return comments.reduce(
        (total, comment) => total + 1 + flattenReplies(Array.isArray(comment.replies) ? comment.replies : []).length,
        0
    );
}

export default function CommunityCommentsPanel({
    postId,
    open = false,
    onCommentCountChange,
}) {
    const { user } = useAuth();
    const replyComposerRef = useRef(null);
    const onCommentCountChangeRef = useRef(onCommentCountChange);
    const [comments, setComments] = useState([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [commentBody, setCommentBody] = useState("");
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [commentMessage, setCommentMessage] = useState(null);
    const [replyTarget, setReplyTarget] = useState(null);
    const [replyBody, setReplyBody] = useState("");
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [replyMessage, setReplyMessage] = useState(null);
    const [expandedThreads, setExpandedThreads] = useState({});

    useEffect(() => {
        setComments([]);
        setHasLoaded(false);
        setLoading(false);
        setError("");
        setCommentBody("");
        setCommentSubmitting(false);
        setCommentMessage(null);
        setReplyTarget(null);
        setReplyBody("");
        setReplySubmitting(false);
        setReplyMessage(null);
        setExpandedThreads({});
    }, [postId]);

    useEffect(() => {
        if (!commentMessage) return undefined;

        const timeoutId = window.setTimeout(() => {
            setCommentMessage(null);
        }, 2600);

        return () => window.clearTimeout(timeoutId);
    }, [commentMessage]);

    useEffect(() => {
        if (!replyMessage) return undefined;

        const timeoutId = window.setTimeout(() => {
            setReplyMessage(null);
        }, 2600);

        return () => window.clearTimeout(timeoutId);
    }, [replyMessage]);

    useEffect(() => {
        onCommentCountChangeRef.current = onCommentCountChange;
    }, [onCommentCountChange]);

    useEffect(() => {
        if (!replyTarget) return undefined;

        const frameId = window.requestAnimationFrame(() => {
            replyComposerRef.current?.focus();
            replyComposerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [replyTarget]);

    useEffect(() => {
        if (!open || !postId || hasLoaded) return undefined;

        let ignore = false;

        const loadComments = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await fetchCommunityPostDetailRequest(postId);
                if (ignore) return;

                const loadedComments = Array.isArray(data?.comments) ? data.comments : [];
                setComments(
                    loadedComments.map((comment) => ({
                        ...comment,
                        replies: flattenReplies(comment.replies),
                    }))
                );
                setHasLoaded(true);

                if (typeof onCommentCountChangeRef.current === "function") {
                    const countFromPost = Number(data?.post?.comments);
                    onCommentCountChangeRef.current(
                        Number.isFinite(countFromPost) ? countFromPost : loadedComments.length
                    );
                }
            } catch (requestError) {
                if (ignore) return;
                setError(requestError.message || "Failed to load comments.");
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        loadComments();

        return () => {
            ignore = true;
        };
    }, [hasLoaded, open, postId]);

    const setReplyToThread = (rootComment, targetComment = rootComment) => {
        setReplyTarget({
            rootCommentId: rootComment.id,
            targetCommentId: targetComment.id,
            authorName: targetComment.author?.name || "member",
        });
        setExpandedThreads((prev) => ({ ...prev, [rootComment.id]: true }));
        setReplyBody("");
        setReplyMessage(null);
    };

    const clearReplyTarget = () => {
        setReplyTarget(null);
        setReplyBody("");
        setReplyMessage(null);
    };

    const toggleThread = (rootCommentId) => {
        setExpandedThreads((prev) => ({
            ...prev,
            [rootCommentId]: !prev[rootCommentId],
        }));
    };

    const handleCommentSubmit = async (event) => {
        event.preventDefault();

        const trimmedBody = commentBody.trim();
        if (!trimmedBody) {
            setCommentMessage({ type: "error", text: "Write a short message before posting." });
            return;
        }

        const token = window.localStorage.getItem("token");
        if (!token) {
            setCommentMessage({ type: "error", text: "You need to be signed in to comment." });
            return;
        }

        try {
            setCommentSubmitting(true);
            setCommentMessage(null);
            const data = await createCommunityCommentRequest(token, postId, { body: trimmedBody });
            const createdComment = data?.comment;

            if (createdComment) {
                setComments((prev) => {
                    const nextComments = [...prev, { ...createdComment, replies: [] }];

                    onCommentCountChangeRef.current?.(countComments(nextComments));
                    return nextComments;
                });
            }

            setCommentBody("");
        } catch (requestError) {
            setCommentMessage({
                type: "error",
                text: requestError.message || "Failed to post the comment.",
            });
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleReplySubmit = async (event) => {
        event.preventDefault();

        const trimmedBody = replyBody.trim();
        if (!trimmedBody) {
            setReplyMessage({ type: "error", text: "Write a short reply before posting." });
            return;
        }

        const token = window.localStorage.getItem("token");
        if (!token) {
            setReplyMessage({ type: "error", text: "You need to be signed in to reply." });
            return;
        }

        if (!replyTarget?.rootCommentId) {
            setReplyMessage({ type: "error", text: "Select a comment to reply to." });
            return;
        }

        try {
            setReplySubmitting(true);
            setReplyMessage(null);

            const data = await createCommunityCommentRequest(token, postId, {
                body: trimmedBody,
                parentCommentId: replyTarget.rootCommentId,
            });
            const createdComment = data?.comment;

            if (createdComment) {
                setComments((prev) => {
                    const nextComments = insertReplyIntoRoot(prev, replyTarget.rootCommentId, createdComment);
                    onCommentCountChangeRef.current?.(countComments(nextComments));
                    return nextComments;
                });
            }

            clearReplyTarget();
        } catch (requestError) {
            setReplyMessage({
                type: "error",
                text: requestError.message || "Failed to post the reply.",
            });
        } finally {
            setReplySubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <section className="mt-5">
            <form onSubmit={handleCommentSubmit}>
                <div className="rounded-[24px] border border-[#dbe6cf] bg-white px-4 py-3 shadow-[0_12px_28px_rgba(52,78,24,0.05)]">
                    <textarea
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        rows={3}
                        placeholder="Write a comment..."
                        disabled={!user || commentSubmitting}
                        className="w-full resize-none bg-transparent text-sm leading-7 text-greenDark outline-none placeholder:text-greenMid/70"
                    />
                </div>

                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-h-[24px]">
                        {commentMessage ? (
                            <div className="rounded-[14px] border border-[#f4c9c5] bg-[#fff2f0] px-3 py-2 text-sm text-[#8f352f]">
                                {commentMessage.text}
                            </div>
                        ) : null}
                    </div>

                    <button
                        type="submit"
                        disabled={!user || commentSubmitting || !commentBody.trim()}
                        className="inline-flex items-center rounded-full bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Post comment
                    </button>
                </div>
            </form>

            <div className="mt-6">
                {loading ? (
                    <div className="space-y-0">
                        <div className="py-5">
                            <div className="h-5 w-56 animate-pulse rounded-full bg-[#edf4e3]" />
                            <div className="mt-4 h-16 animate-pulse rounded-[18px] bg-[#f5f8ef]" />
                            <div className="mt-3 h-4 w-20 animate-pulse rounded-full bg-[#edf4e3]" />
                        </div>
                        <div className="border-t border-[#dbe6cf] py-5">
                            <div className="h-5 w-52 animate-pulse rounded-full bg-[#edf4e3]" />
                            <div className="mt-4 h-16 animate-pulse rounded-[18px] bg-[#f5f8ef]" />
                        </div>
                    </div>
                ) : error ? (
                    <div className="rounded-[18px] border border-[#f4c9c5] bg-[#fff2f0] px-4 py-3 text-sm text-[#8f352f]">
                        {error}
                    </div>
                ) : comments.length ? (
                    <div className="space-y-0">
                        {comments.map((comment, index) => (
                            <CommentThread
                                key={comment.id}
                                comment={comment}
                                showTopBorder={index > 0}
                                threadOpen={Boolean(expandedThreads[comment.id])}
                                replyTarget={replyTarget}
                                replyBody={replyBody}
                                replySubmitting={replySubmitting}
                                replyMessage={replyMessage}
                                replyComposerRef={replyComposerRef}
                                onToggleThread={() => toggleThread(comment.id)}
                                onReplyBodyChange={setReplyBody}
                                onReplySubmit={handleReplySubmit}
                                onCancelReply={clearReplyTarget}
                                onReplyToComment={(targetComment) => setReplyToThread(comment, targetComment)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-sm text-greenMid">No comments yet.</div>
                )}
            </div>
        </section>
    );
}

function CommentThread({
    comment,
    showTopBorder = false,
    threadOpen = false,
    replyTarget,
    replyBody,
    replySubmitting = false,
    replyMessage,
    replyComposerRef,
    onToggleThread,
    onReplyBodyChange,
    onReplySubmit,
    onCancelReply,
    onReplyToComment,
}) {
    const replies = Array.isArray(comment.replies) ? comment.replies : [];
    const hasReplies = replies.length > 0;
    const showReplyComposerUnderRoot = replyTarget?.targetCommentId === comment.id;

    return (
        <article className={`${showTopBorder ? "border-t border-[#dbe6cf]" : ""} py-5`}>
            <CommentRow comment={comment} />

            <div className="mt-4 pl-[52px]">
                <div className="flex flex-wrap items-center gap-4">
                    <button
                        type="button"
                        onClick={() => onReplyToComment(comment)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-greenMid transition hover:text-landingPageIcons hover:underline"
                    >
                        <MessageCircle size={14} />
                        Reply
                    </button>

                    {hasReplies ? (
                        <button
                            type="button"
                            onClick={onToggleThread}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-landingPageIcons transition hover:bg-white"
                        >
                            {threadOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {threadOpen ? "Hide" : "View"} {replies.length} {replies.length === 1 ? "reply" : "replies"}
                        </button>
                    ) : null}
                </div>

                {showReplyComposerUnderRoot ? (
                    <InlineReplyComposer
                        inputRef={replyComposerRef}
                        authorName={replyTarget.authorName}
                        value={replyBody}
                        submitting={replySubmitting}
                        message={replyMessage}
                        onChange={onReplyBodyChange}
                        onSubmit={onReplySubmit}
                        onCancel={onCancelReply}
                    />
                ) : null}

                {hasReplies && threadOpen ? (
                    <div className="mt-4 space-y-0 border-l border-[#dbe6cf] pl-5">
                        {replies.map((reply, index) => (
                            <div key={reply.id} className={`${index > 0 ? "border-t border-[#eef3e3]" : ""} py-4`}>
                                <CommentRow comment={reply} compact />
                                <div className="mt-3 pl-[44px]">
                                    <button
                                        type="button"
                                        onClick={() => onReplyToComment(reply)}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-greenMid transition hover:text-landingPageIcons hover:underline"
                                    >
                                        <MessageCircle size={14} />
                                        Reply
                                    </button>
                                </div>

                                {replyTarget?.targetCommentId === reply.id ? (
                                    <div className="pl-[44px]">
                                        <InlineReplyComposer
                                            inputRef={replyComposerRef}
                                            authorName={replyTarget.authorName}
                                            value={replyBody}
                                            submitting={replySubmitting}
                                            message={replyMessage}
                                            onChange={onReplyBodyChange}
                                            onSubmit={onReplySubmit}
                                            onCancel={onCancelReply}
                                            compact
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </article>
    );
}

function CommentRow({ comment, compact = false }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
                <CommunityAvatar member={comment.author} size={compact ? "sm" : "sm"} />
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-greenDark">{comment.author?.name}</p>
                        <CommunityRoleBadge member={comment.author} />
                        <span className="text-sm text-greenMid">{formatRelativeDate(comment.createdAt)}</span>
                    </div>
                    <p className={`mt-3 max-w-3xl whitespace-pre-wrap text-sm ${compact ? "leading-6" : "leading-7"} text-greenMid`}>
                        {comment.body}
                    </p>
                </div>
            </div>
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-greenMid/70">
                <MoreHorizontal size={15} />
            </div>
        </div>
    );
}

function InlineReplyComposer({
    inputRef,
    authorName,
    value,
    submitting = false,
    message,
    compact = false,
    onChange,
    onSubmit,
    onCancel,
}) {
    return (
        <form
            onSubmit={onSubmit}
            className={`mt-4 rounded-[20px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 shadow-[0_12px_24px_rgba(52,78,24,0.05)] ${compact ? "max-w-2xl" : "max-w-3xl"}`}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-landingPageIcons">
                    Replying to {authorName}
                </span>
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#cfdcbf] bg-white text-greenMid transition hover:bg-[#f8fbf3]"
                    aria-label="Cancel reply"
                >
                    <X size={14} />
                </button>
            </div>

            <textarea
                ref={inputRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={2}
                placeholder={`Reply to ${authorName}...`}
                className="mt-3 w-full resize-none rounded-[16px] border border-[#dbe6cf] bg-white px-4 py-3 text-sm leading-6 text-greenDark outline-none placeholder:text-greenMid/70"
                disabled={submitting}
            />

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-h-[20px]">
                    {message ? (
                        <div className="rounded-[14px] border border-[#f4c9c5] bg-[#fff2f0] px-3 py-2 text-sm text-[#8f352f]">
                            {message.text}
                        </div>
                    ) : null}
                </div>

                <button
                    type="submit"
                    disabled={submitting || !value.trim()}
                    className="inline-flex items-center rounded-full bg-landingPageIcons px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Post reply
                </button>
            </div>
        </form>
    );
}
