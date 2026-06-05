import { useEffect, useMemo, useState } from "react";
import CommunityPostCard from "./CommunityPostCard.jsx";

const emptyDraft = {
    type: "discussion",
    title: "",
    body: "",
    selectedPlantIds: [],
    selectedGardenId: "",
    tags: "",
    region: "",
    isLocal: false,
};

export default function CommunityComposer({
    user,
    author = null,
    gardenOptions = [],
    plantOptions = [],
    postTypeOptions = [],
    suggestedRegion = "",
    onPublish,
    submitting = false,
    submitMessage = null,
}) {
    const [draft, setDraft] = useState(emptyDraft);
    const effectiveAuthor = useMemo(
        () =>
            author || {
                name: user?.name || "SoilSync Member",
                username:
                    user?.communityUsername ||
                    (user?.name || "community_member").toLowerCase().replace(/\s+/g, "_"),
                systemRole: user?.systemRole || "user",
                premium: user?.subscriptionPlan === "premium" && user?.premiumStatus === "active",
                avatarTone: "from-[#edf4e3] to-[#95B29B]",
                badges: [],
            },
        [author, user]
    );

    useEffect(() => {
        if (!suggestedRegion) return;

        setDraft((prev) => (prev.region ? prev : { ...prev, region: suggestedRegion }));
    }, [suggestedRegion]);

    const previewPost = useMemo(() => {
        const selectedGarden = gardenOptions.find((garden) => garden.id === draft.selectedGardenId) || null;
        const selectedPlants = plantOptions.filter((plant) => draft.selectedPlantIds.includes(String(plant.id)));
        const tags = draft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

        return {
            id: "draft-preview",
            type: draft.type,
            title: draft.title || "Preview title",
            body: draft.body || "Your post preview will appear here once you add a short description.",
            author: effectiveAuthor,
            createdAt: new Date().toISOString(),
            images: selectedGarden ? [{ id: "preview-image", src: selectedGarden.image, alt: selectedGarden.title }] : [],
            plants: selectedPlants,
            savedGarden: selectedGarden,
            tags,
            region: draft.region,
            isLocal: draft.isLocal,
            likes: 0,
            comments: 0,
            solved: false,
        };
    }, [draft, effectiveAuthor, gardenOptions, plantOptions]);

    const handleFieldChange = (event) => {
        const { name, value, type, checked } = event.target;
        setDraft((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handlePlantToggle = (plantId) => {
        const normalizedPlantId = String(plantId);
        setDraft((prev) => ({
            ...prev,
            selectedPlantIds: prev.selectedPlantIds.includes(normalizedPlantId)
                ? prev.selectedPlantIds.filter((currentId) => currentId !== normalizedPlantId)
                : [...prev.selectedPlantIds, normalizedPlantId].slice(0, 4),
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!onPublish) return;
        await onPublish({
            type: draft.type,
            title: draft.title,
            body: draft.body,
            selectedPlantIds: draft.selectedPlantIds,
            selectedGardenId: draft.selectedGardenId,
            tags: draft.tags,
            region: draft.region,
            isLocal: draft.isLocal,
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <form
                onSubmit={handleSubmit}
                className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_60px_rgba(52,78,24,0.12)] md:p-8"
            >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                    Community composer
                </div>
                <h2 className="mt-4 font-playfair text-3xl text-greenDark">Create a new post</h2>
                <p className="mt-2 text-sm leading-7 text-greenMid">
                    Shape the post type, attach plants, and optionally include a saved garden preview before publishing it to the community feed.
                </p>

                <div className="mt-6 grid gap-4">
                    <Field label="Post type">
                        <select
                            name="type"
                            value={draft.type}
                            onChange={handleFieldChange}
                            className="w-full rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                        >
                            {(postTypeOptions.length ? postTypeOptions : [{ value: "discussion", label: "Discussion" }]).map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Title">
                        <input
                            type="text"
                            name="title"
                            value={draft.title}
                            onChange={handleFieldChange}
                            placeholder="What do you want to share or ask?"
                            className="w-full rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                        />
                    </Field>

                    <Field label="Body">
                        <textarea
                            name="body"
                            value={draft.body}
                            onChange={handleFieldChange}
                            rows={6}
                            placeholder="Write a practical description, question, or update..."
                            className="w-full rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm leading-7 text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                        />
                    </Field>

                    <Field label="Topic tags">
                        <input
                            type="text"
                            name="tags"
                            value={draft.tags}
                            onChange={handleFieldChange}
                            placeholder="planner-share, local, low-water"
                            className="w-full rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Region label">
                            <input
                                type="text"
                                name="region"
                                value={draft.region}
                                onChange={handleFieldChange}
                                placeholder={suggestedRegion || user?.location || "Cluj County"}
                                className="w-full rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                            />
                        </Field>
                        <Field label="Attach saved garden">
                            <select
                                name="selectedGardenId"
                                value={draft.selectedGardenId}
                                onChange={handleFieldChange}
                                className="w-full rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                            >
                                <option value="">No attached garden</option>
                                {gardenOptions.map((garden) => (
                                    <option key={garden.id} value={garden.id}>
                                        {garden.title}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <div className="rounded-[24px] border border-[#dbe6cf] bg-[#f8fbf3] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-greenMid">Plant tags</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {plantOptions.map((plant) => {
                                const active = draft.selectedPlantIds.includes(String(plant.id));
                                return (
                                    <button
                                        key={plant.id}
                                        type="button"
                                        onClick={() => handlePlantToggle(plant.id)}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                            active
                                                ? "border-landingPageIcons bg-landingPageIcons text-white"
                                                : "border-[#dbe6cf] bg-white text-greenDark hover:bg-[#f4f8ed]"
                                        }`}
                                    >
                                        {plant.name}
                                    </button>
                                );
                            })}
                        </div>
                        {!plantOptions.length ? (
                            <p className="mt-3 text-sm text-greenMid">
                                No plant options are available yet. Add favourites or import more plants to improve composer suggestions.
                            </p>
                        ) : null}
                    </div>

                    <label className="flex items-center gap-3 rounded-[20px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark">
                        <input
                            type="checkbox"
                            name="isLocal"
                            checked={draft.isLocal}
                            onChange={handleFieldChange}
                            className="h-4 w-4 rounded border-[#cbd8bf] text-landingPageIcons focus:ring-landingPageIcons"
                        />
                        Mark this as a local or regional note
                    </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-landingPageIcons px-6 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                    >
                        {submitting ? "Publishing..." : "Publish post"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setDraft({ ...emptyDraft, region: suggestedRegion || "" });
                        }}
                        disabled={submitting}
                        className="rounded-full border border-[#dbe6cf] bg-white px-6 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                    >
                        Reset
                    </button>
                </div>

                {submitMessage ? (
                    <div
                        className={`mt-5 rounded-[22px] px-4 py-4 text-sm leading-7 ${
                            submitMessage.type === "error"
                                ? "border border-[#f4c9c5] bg-[#fff2f0] text-[#8f352f]"
                                : "border border-[#d2e3f2] bg-[#f1f7fd] text-[#345b83]"
                        }`}
                    >
                        {submitMessage.text}
                    </div>
                ) : null}
            </form>

            <div className="space-y-4">
                <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_18px_60px_rgba(52,78,24,0.12)] md:p-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                        Preview
                    </div>
                    <h2 className="mt-4 font-playfair text-3xl text-greenDark">How your post would look</h2>
                    <p className="mt-2 text-sm leading-7 text-greenMid">
                        This preview mirrors the live community card layout before the post is sent to the backend.
                    </p>
                </div>

                <CommunityPostCard post={previewPost} interactive={false} />
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-greenMid">{label}</span>
            {children}
        </label>
    );
}
