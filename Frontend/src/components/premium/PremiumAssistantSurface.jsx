import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    AlertCircle,
    Bot,
    Check,
    ChevronDown,
    ChevronUp,
    Crown,
    ExternalLink,
    ImagePlus,
    Leaf,
    LoaderCircle,
    MessageSquareText,
    Plus,
    Search,
    Send,
    Settings2,
    Sparkles,
    Star,
    Trash2,
    Wand2,
    X,
} from "lucide-react";
import {
    getPlantImage,
    getPlantScientificName,
    getPlantTitle,
} from "../../hooks/usePremiumAssistant";
import { getPremiumPlannerPreview, stagePremiumPlannerSeed } from "../../utils/premiumPlannerTransfer.js";

function ActionCard({ entry, onExecute, compact = false, flush = false }) {
    const action = entry.action;
    const navigate = useNavigate();
    if (!action) return null;

    const status = entry.actionStatus || "idle";
    const isPlanner = action.type === "generatePlannerImage";
    const isRunning = status === "running";
    const isCompleted = status === "completed";
    const isFailed = status === "failed";
    const generatedImage = entry.generatedImage || getPremiumPlannerPreview(entry.id)?.generatedImage || "";
    const handleOpenPlanner = () => {
        if (entry.hasPlannerTransfer) {
            stagePremiumPlannerSeed(entry.id);
        }
        navigate("/garden-drawer");
    };

    return (
        <div className={`${flush ? "" : "mt-4 "}rounded-[22px] border border-[#dbe6cf] bg-[#f8fbf3] p-4`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">Action Layer</div>
                    <div className="mt-1 font-semibold text-greenDark">{action.title}</div>
                    <p className="mt-2 text-sm leading-6 text-greenMid">{action.description}</p>
                </div>
                <div className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
                    {action.type}
                </div>
            </div>

            {Array.isArray(action.previewBadges) && action.previewBadges.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {action.previewBadges.map((badge, index) => (
                        <span key={`${badge}-${index}`} className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-semibold text-landingPageIcons">
                            {badge}
                        </span>
                    ))}
                </div>
            ) : null}

            {Array.isArray(action.selectedPlantNames) && action.selectedPlantNames.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm text-greenMid">
                    <span className="font-semibold text-greenDark">Planner context:</span>{" "}
                    {action.selectedPlantNames.join(", ")}
                </div>
            ) : null}

            {action.hasReferenceGardenPhoto ? (
                <div className="mt-3 rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm text-greenMid">
                    <span className="font-semibold text-greenDark">Photo edit mode:</span>{" "}
                    The planner will edit your uploaded garden photo
                    {action.referenceGardenPhotoName ? ` (${action.referenceGardenPhotoName})` : ""} instead of inventing a new base scene.
                </div>
            ) : null}

            {Array.isArray(action.suggestedPlantNames) && action.suggestedPlantNames.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-[#eadfb4] bg-[#fff9e8] px-4 py-3 text-sm text-[#7b5f0e]">
                    <span className="font-semibold text-[#6d5207]">Optional suggested additions:</span>{" "}
                    {action.suggestedPlantNames.join(", ")}
                    <div className="mt-2 text-xs leading-5 text-[#8b6f18]">
                        These are style-aware suggestions only. They will not be sent to the planner unless you add them to context.
                    </div>
                </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
                {action.requiresConfirmation && status === "idle" ? (
                    <button
                        type="button"
                        onClick={onExecute}
                        className="inline-flex items-center gap-2 rounded-2xl bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                    >
                        <Wand2 size={15} />
                        {action.confirmLabel || "Continue"}
                    </button>
                ) : null}

                {!action.requiresConfirmation && status === "idle" ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm font-semibold text-greenDark">
                        <Bot size={15} />
                        Auto-running from chat...
                    </div>
                ) : null}

                {isRunning ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm font-semibold text-greenDark">
                        <LoaderCircle size={15} className="animate-spin" />
                        {isPlanner ? "Generating planner concept..." : "Running action..."}
                    </div>
                ) : null}

                {isCompleted ? (
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[#c7e4ba] bg-[#f1faea] px-4 py-3 text-sm font-semibold text-[#2e6b1f]">
                        <Check size={15} />
                        {entry.actionResultTitle || "Action completed."}
                    </div>
                ) : null}

                {isFailed ? (
                    <button
                        type="button"
                        onClick={onExecute}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#f4c9c5] bg-[#fff2f0] px-4 py-3 text-sm font-semibold text-[#b64035] transition hover:bg-white"
                    >
                        <AlertCircle size={15} />
                        Retry Action
                    </button>
                ) : null}
            </div>

            {entry.actionError ? (
                <div className="mt-3 rounded-2xl border border-[#f4c9c5] bg-[#fff2f0] px-4 py-3 text-sm font-medium text-[#b64035]">
                    {entry.actionError}
                </div>
            ) : null}

            {generatedImage ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-[#dbe6cf] bg-white">
                    <div className="border-b border-[#e7eedb] px-4 py-3">
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                            Generated Concept Preview
                        </div>
                    </div>
                    <a
                        href={generatedImage}
                        target="_blank"
                        rel="noreferrer"
                        className="block transition hover:opacity-95"
                    >
                        <img
                            src={generatedImage}
                            alt="Generated premium planner concept"
                            className={`${compact ? "h-[220px]" : "h-[280px]"} w-full object-cover`}
                        />
                    </a>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                        <div className="text-sm text-greenMid">
                            Generated through the existing SoilSync planner route from the premium assistant. Click the image to open it larger.
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <a
                                href={generatedImage}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                            >
                                Open image
                                <ExternalLink size={14} />
                            </a>
                            <button
                                type="button"
                                onClick={handleOpenPlanner}
                                className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-white"
                            >
                                Open Planner
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function PlantResultCard({ card, alreadySelected, selectionDisabled, onAddToContext, onDismissSuggestion }) {
    const [showAlternatives, setShowAlternatives] = useState(false);
    const similarLabel = String(card.similarGroupLabel || "plant options").toLowerCase();

    return (
        <div className="rounded-[22px] border border-[#dbe6cf] bg-white p-4 shadow-[0_10px_30px_rgba(52,78,24,0.06)]">
            <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[20px] bg-[#edf4e3]">
                    {card.image ? (
                        <img src={card.image} alt={card.commonName} className="h-full w-full object-cover" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-greenMid">
                            <Leaf size={18} />
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-greenDark">{card.commonName}</div>
                    <div className="truncate text-sm italic text-greenMid">{card.scientificName || "Scientific name unavailable"}</div>
                    {card.meta?.score !== undefined ? (
                        <div className="mt-2 text-xs font-semibold text-landingPageIcons">Score: {card.meta.score}</div>
                    ) : null}
                </div>
            </div>

            {Array.isArray(card.badges) && card.badges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {card.badges.map((badge, index) => (
                        <span key={`${badge}-${index}`} className="rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-3 py-1 text-[11px] font-semibold text-landingPageIcons">
                            {badge}
                        </span>
                    ))}
                </div>
            ) : null}

            {card.note ? <p className="mt-3 text-sm leading-6 text-greenDark">{card.note}</p> : null}
            {card.rationale ? <p className="mt-2 text-xs leading-5 text-greenMid">{card.rationale}</p> : null}

            {Array.isArray(card.alternatives) && card.alternatives.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-[#dbe6cf] bg-[#f8fbf3] p-3">
                    <button
                        type="button"
                        onClick={() => setShowAlternatives((prev) => !prev)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#dbe6cf] bg-white px-4 py-3 text-left text-sm font-semibold text-greenDark transition hover:bg-[#f8fbf3]"
                    >
                        <span>
                            {showAlternatives
                                ? `Hide ${card.alternatives.length} similar ${similarLabel}`
                                : `Show ${card.alternatives.length} similar ${similarLabel}`}
                        </span>
                        {showAlternatives ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showAlternatives ? (
                        <div className="mt-3 space-y-3">
                            <div className="px-1 text-xs leading-5 text-greenMid">
                                Similar alternatives from the same shortlist group. Open one to inspect it or add it straight into context.
                            </div>
                            {card.alternatives.map((alternative) => (
                                <div key={alternative.id} className="rounded-xl border border-[#dbe6cf] bg-white px-3 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate font-semibold text-greenDark">{alternative.commonName}</div>
                                            <div className="truncate text-xs italic text-greenMid">
                                                {alternative.scientificName || "Scientific name unavailable"}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => onAddToContext(alternative)}
                                                disabled={selectionDisabled}
                                                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                                                    selectionDisabled
                                                        ? "cursor-not-allowed border-[#dbe6cf] bg-[#f4f7ef] text-greenMid"
                                                        : "border-[#dbe6cf] bg-[#f8fbf3] text-greenDark hover:bg-white"
                                                }`}
                                            >
                                                {selectionDisabled ? "Limit reached" : "Add"}
                                            </button>
                                            <Link
                                                to={`/plant/${alternative.id}`}
                                                className="inline-flex items-center gap-1 rounded-full border border-[#dbe6cf] bg-white px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons transition hover:bg-[#f8fbf3]"
                                            >
                                                Open
                                                <ExternalLink size={11} />
                                            </Link>
                                        </div>
                                    </div>
                                    {alternative.note ? (
                                        <div className="mt-2 text-[12px] leading-5 text-greenMid">{alternative.note}</div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={onAddToContext}
                    disabled={alreadySelected || selectionDisabled}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        alreadySelected || selectionDisabled
                            ? "cursor-not-allowed border border-[#dbe6cf] bg-[#f4f7ef] text-greenMid"
                            : "border border-[#dbe6cf] bg-[#f8fbf3] text-greenDark hover:bg-white"
                    }`}
                >
                    {alreadySelected ? "Already in context" : selectionDisabled ? "Limit reached" : "Add to context"}
                </button>
                {card.isSuggested ? (
                    <button
                        type="button"
                        onClick={onDismissSuggestion}
                        className="rounded-full border border-[#eadfb4] bg-[#fff9e8] px-4 py-2 text-xs font-semibold text-[#7b5f0e] transition hover:bg-white"
                    >
                        Hide suggestion
                    </button>
                ) : null}
                <Link
                    to={`/plant/${card.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-xs font-semibold text-landingPageIcons transition hover:bg-[#f8fbf3]"
                >
                    Open plant
                    <ExternalLink size={12} />
                </Link>
            </div>
        </div>
    );
}

function AssistantActionSection({
    entry,
    compact,
    selectedPlantIds,
    selectedPlantLimit,
    onExecuteAction,
    onAddPlantToContext,
}) {
    const isRecommenderSection = entry?.action?.type === "runRecommender";
    const resultCount = Array.isArray(entry?.resultCards) ? entry.resultCards.length : 0;
    const [open, setOpen] = useState(() => !isRecommenderSection || entry?.actionStatus !== "completed");

    useEffect(() => {
        if (isRecommenderSection && entry?.actionStatus === "completed") {
            setOpen(false);
        }
    }, [isRecommenderSection, entry?.actionStatus]);

    if (!entry?.action && resultCount === 0) {
        return null;
    }

    if (!isRecommenderSection) {
        return (
            <>
                <ActionCard
                    entry={entry}
                    onExecute={() => onExecuteAction(entry.id, entry.action)}
                    compact={compact}
                />
                <AssistantEntryResults
                    entry={entry}
                    selectedPlantIds={selectedPlantIds}
                    selectedPlantLimit={selectedPlantLimit}
                    onAddPlantToContext={onAddPlantToContext}
                />
            </>
        );
    }

    return (
        <div className="mt-4 overflow-hidden rounded-[22px] border border-[#dbe6cf] bg-[#f8fbf3]">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-white/60"
            >
                <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">Action Layer</div>
                    <div className="mt-1 font-semibold text-greenDark">
                        {entry.action?.title || "Recommender shortlist"}
                    </div>
                    <div className="mt-1 text-sm text-greenMid">
                        {resultCount
                            ? `${resultCount} shortlist card${resultCount === 1 ? "" : "s"} ready. Expand to review the recommender suggestions.`
                            : "Expand to review the recommender action and shortlist."}
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {resultCount ? (
                        <div className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-semibold text-landingPageIcons">
                            {resultCount} plants
                        </div>
                    ) : null}
                    {open ? <ChevronUp size={16} className="text-greenDark" /> : <ChevronDown size={16} className="text-greenDark" />}
                </div>
            </button>

            {open ? (
                <div className="border-t border-[#dbe6cf] px-4 pb-4">
                    <ActionCard
                        entry={entry}
                        onExecute={() => onExecuteAction(entry.id, entry.action)}
                        compact={compact}
                        flush
                    />
                    <AssistantEntryResults
                        entry={entry}
                        selectedPlantIds={selectedPlantIds}
                        selectedPlantLimit={selectedPlantLimit}
                        onAddPlantToContext={onAddPlantToContext}
                    />
                </div>
            ) : null}
        </div>
    );
}

function SavedGardenResultCard({ card }) {
    return (
        <div className="rounded-[22px] border border-[#dbe6cf] bg-white p-4 shadow-[0_10px_30px_rgba(52,78,24,0.06)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="font-semibold text-greenDark">{card.title}</div>
                    <div className="mt-1 text-sm text-greenMid">
                        {card.gardenStyle || "Unknown style"} · {card.plantCount} plants
                    </div>
                </div>
                <div className="rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
                    {card.scoreLabel || "Review"}
                </div>
            </div>

            {card.note ? <p className="mt-3 text-sm leading-6 text-greenDark">{card.note}</p> : null}

            {Array.isArray(card.reasons) && card.reasons.length > 0 ? (
                <div className="mt-3 space-y-2 text-sm text-greenMid">
                    {card.reasons.slice(0, 3).map((reason, index) => (
                        <div key={`${reason}-${index}`} className="flex items-start gap-2">
                            <span className="mt-2 h-2 w-2 rounded-full bg-landingPageIcons" />
                            <span>{reason}</span>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function AssistantEntryResults({ entry, selectedPlantIds, selectedPlantLimit, onAddPlantToContext }) {
    const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState([]);

    if (!Array.isArray(entry.resultCards) || entry.resultCards.length === 0) {
        return null;
    }

    const visibleCards = entry.resultCards.filter(
        (card) => !card.isSuggested || !dismissedSuggestionIds.includes(Number(card.id))
    );

    if (!visibleCards.length) {
        return null;
    }

    return (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {visibleCards.map((card, index) =>
                card.type === "savedGarden" ? (
                    <SavedGardenResultCard key={`${entry.id}-saved-${index}`} card={card} />
                ) : (
                    <PlantResultCard
                        key={`${entry.id}-${card.id}-${index}`}
                        card={card}
                        alreadySelected={selectedPlantIds.includes(Number(card.id))}
                        selectionDisabled={
                            !selectedPlantIds.includes(Number(card.id)) && selectedPlantIds.length >= selectedPlantLimit
                        }
                        onAddToContext={() => onAddPlantToContext(card)}
                        onDismissSuggestion={() =>
                            setDismissedSuggestionIds((prev) =>
                                prev.includes(Number(card.id)) ? prev : [...prev, Number(card.id)]
                            )
                        }
                    />
                )
            )}
        </div>
    );
}

function PremiumAssistantSettingsContent({ controller }) {
    const {
        query,
        setQuery,
        searching,
        searchResults,
        selectedPlants,
        selectedPlantLimit,
        includeFavourites,
        setIncludeFavourites,
        includeSavedGardens,
        setIncludeSavedGardens,
        searchPlants,
        addContextPlant,
        removeContextPlant,
    } = controller;

    return (
        <>
            <div className="rounded-[24px] border border-[#dbe6cf] bg-[#fbfcf8] p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Assistant Context</div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm text-greenDark">
                        <input type="checkbox" checked={includeFavourites} onChange={(e) => setIncludeFavourites(e.target.checked)} />
                        Include favourite plants
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm text-greenDark">
                        <input type="checkbox" checked={includeSavedGardens} onChange={(e) => setIncludeSavedGardens(e.target.checked)} />
                        Include saved gardens
                    </label>
                </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[#dbe6cf] bg-[#fbfcf8] p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Add Plant Context</div>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-greenMid" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search plants by name or Latin name"
                            className="w-full rounded-2xl border border-[#dce7cf] bg-white py-3 pl-11 pr-4 text-sm text-greenDark outline-none transition focus:border-landingPageIcons"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={searchPlants}
                        className="rounded-2xl bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                    >
                        {searching ? "Searching..." : "Search"}
                    </button>
                </div>

                {searchResults.length > 0 ? (
                    <div className="mt-4 grid gap-3">
                        {searchResults.map((plant) => (
                            <button
                                key={plant.id}
                                type="button"
                                onClick={() => addContextPlant(plant)}
                                disabled={
                                    !selectedPlants.some((selectedPlant) => Number(selectedPlant.id) === Number(plant.id)) &&
                                    selectedPlants.length >= selectedPlantLimit
                                }
                                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                                    !selectedPlants.some((selectedPlant) => Number(selectedPlant.id) === Number(plant.id)) &&
                                    selectedPlants.length >= selectedPlantLimit
                                        ? "cursor-not-allowed border-[#dbe6cf] bg-[#f4f7ef] text-greenMid"
                                        : "border-[#dbe6cf] bg-white hover:border-landingPageIcons"
                                }`}
                            >
                                <div className="h-14 w-14 overflow-hidden rounded-2xl bg-[#edf4e3]">
                                    {getPlantImage(plant) ? (
                                        <img src={getPlantImage(plant)} alt={getPlantTitle(plant)} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-greenMid">
                                            <Leaf size={18} />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-greenDark">{getPlantTitle(plant)}</div>
                                    <div className="truncate text-sm text-greenMid">{getPlantScientificName(plant)}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : null}

                {selectedPlants.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                        {selectedPlants.map((plant) => (
                            <div key={plant.id} className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm text-greenDark">
                                <Star size={12} className="text-landingPageIcons" />
                                {getPlantTitle(plant)}
                                <button type="button" onClick={() => removeContextPlant(plant.id)} className="text-greenMid transition hover:text-[#b64035]">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-greenMid">No extra plants selected yet. You can still ask based on your profile, favourites, and saved gardens.</p>
                )}
            </div>
        </>
    );
}

function PremiumAssistantImageUploadContent({ controller }) {
    const {
        uploadedChatImage,
        uploadingChatImage,
        attachChatImage,
        clearChatImage,
        uploadedReferenceImage,
        uploadingReferenceImage,
        attachReferenceGardenImage,
        clearReferenceGardenImage,
        setError,
    } = controller;
    const chatImageInputRef = useRef(null);
    const gardenPhotoInputRef = useRef(null);

    const handleChatImageChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await attachChatImage(file);
        } catch (err) {
            console.error("Premium chat image upload failed:", err);
            setError(err.message || "The chat image could not be uploaded.");
        } finally {
            event.target.value = "";
        }
    };

    const handleGardenPhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await attachReferenceGardenImage(file);
        } catch (err) {
            console.error("Reference garden photo upload failed:", err);
            setError(err.message || "The garden photo could not be uploaded.");
        } finally {
            event.target.value = "";
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-[24px] border border-[#dbe6cf] bg-[#fbfcf8] p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Chat Image</div>
                <div className="rounded-2xl border border-[#dbe6cf] bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="font-semibold text-greenDark">Let the assistant inspect a plant photo</div>
                            <p className="mt-2 text-sm leading-6 text-greenMid">
                                Upload a plant, leaf, flower, or symptom photo. The assistant can identify what it sees and answer visible health questions from model knowledge only.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => chatImageInputRef.current?.click()}
                            className="inline-flex self-start items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-xs font-semibold text-greenDark transition hover:bg-white sm:shrink-0"
                        >
                            <ImagePlus size={14} />
                            {uploadedChatImage ? "Replace" : "Upload"}
                        </button>
                    </div>

                    <input
                        ref={chatImageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleChatImageChange}
                    />

                    {uploadingChatImage ? (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-sm font-semibold text-greenDark">
                            <LoaderCircle size={15} className="animate-spin" />
                            Uploading chat image...
                        </div>
                    ) : null}

                    {uploadedChatImage ? (
                        <div className="mt-4 overflow-hidden rounded-[22px] border border-[#dbe6cf] bg-[#f8fbf3]">
                            <img
                                src={uploadedChatImage.previewUrl}
                                alt={uploadedChatImage.fileName || "Uploaded chat image"}
                                className="h-48 w-full object-cover"
                            />
                            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-greenDark">
                                        {uploadedChatImage.fileName || "Chat image"}
                                    </div>
                                    <div className="mt-1 text-sm text-greenMid">
                                        {uploadedChatImage.mimeType}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearChatImage}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#f1d0cc] bg-white px-4 py-2 text-xs font-semibold text-[#b64035] transition hover:bg-[#fff2f0]"
                                >
                                    <Trash2 size={13} />
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-[22px] border border-dashed border-[#dbe6cf] bg-[#f8fbf3] px-4 py-6 text-sm leading-6 text-greenMid">
                            No chat image attached yet. Add one if you want the assistant to inspect a plant photo directly in the conversation.
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-[24px] border border-[#dbe6cf] bg-[#fbfcf8] p-5">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Garden Photo</div>
                <div className="rounded-2xl border border-[#dbe6cf] bg-white p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="font-semibold text-greenDark">Use your own garden photo</div>
                            <p className="mt-2 text-sm leading-6 text-greenMid">
                                Upload a real garden photo. Planner image actions will edit this exact scene with your selected plants and style direction.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => gardenPhotoInputRef.current?.click()}
                            className="inline-flex self-start items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-xs font-semibold text-greenDark transition hover:bg-white sm:shrink-0"
                        >
                            <ImagePlus size={14} />
                            {uploadedReferenceImage ? "Replace" : "Upload"}
                        </button>
                    </div>

                    <input
                        ref={gardenPhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleGardenPhotoChange}
                    />

                    {uploadingReferenceImage ? (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-sm font-semibold text-greenDark">
                            <LoaderCircle size={15} className="animate-spin" />
                            Uploading garden photo...
                        </div>
                    ) : null}

                    {uploadedReferenceImage ? (
                        <div className="mt-4 overflow-hidden rounded-[22px] border border-[#dbe6cf] bg-[#f8fbf3]">
                            <img
                                src={uploadedReferenceImage.previewUrl}
                                alt={uploadedReferenceImage.fileName || "Uploaded garden reference"}
                                className="h-48 w-full object-cover"
                            />
                            <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-greenDark">
                                        {uploadedReferenceImage.fileName || "Garden photo"}
                                    </div>
                                    <div className="mt-1 text-sm text-greenMid">
                                        {uploadedReferenceImage.mimeType}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearReferenceGardenImage}
                                    className="inline-flex items-center gap-2 rounded-full border border-[#f1d0cc] bg-white px-4 py-2 text-xs font-semibold text-[#b64035] transition hover:bg-[#fff2f0]"
                                >
                                    <Trash2 size={13} />
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-[22px] border border-dashed border-[#dbe6cf] bg-[#f8fbf3] px-4 py-6 text-sm leading-6 text-greenMid">
                            No garden photo uploaded yet. Add one if you want the planner to redesign your own real scene instead of generating a fresh concept from scratch.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PremiumAssistantAttachmentPanel({ controller, activeTab, setActiveTab, onClose, compact = false }) {
    const tabButtonClasses = (tab) =>
        `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            activeTab === tab
                ? "border-[#c7d9bf] bg-[#edf4e3] text-greenDark"
                : "border-[#dbe6cf] bg-white text-greenMid hover:bg-[#f8fbf3]"
        }`;

    return (
        <div
            className={`absolute z-20 overflow-hidden rounded-[30px] border border-[#aac0af] bg-[#95B29B] p-3 shadow-[0_28px_70px_rgba(52,78,24,0.22)] backdrop-blur-xl ${
                compact
                    ? "bottom-0 right-full mr-3 w-[min(92vw,390px)]"
                    : "bottom-full left-0 mb-3 w-[min(100%,430px)]"
            }`}
        >
            <div className="rounded-[26px] border border-white/75 bg-[rgba(247,250,242,0.95)] p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setActiveTab("context")} className={tabButtonClasses("context")}>
                            <Settings2 size={13} />
                            Context
                        </button>
                        <button type="button" onClick={() => setActiveTab("image")} className={tabButtonClasses("image")}>
                            <ImagePlus size={13} />
                            Images
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-[#dbe6cf] bg-white p-2 text-greenDark transition hover:bg-[#f8fbf3]"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="max-h-[56vh] overflow-y-auto pr-1">
                    {activeTab === "context" ? (
                        <PremiumAssistantSettingsContent controller={controller} />
                    ) : (
                        <PremiumAssistantImageUploadContent controller={controller} />
                    )}
                </div>
            </div>
        </div>
    );
}

function PremiumAssistantSidebar({ controller, activeTab, setActiveTab }) {
    const tabButtonClasses = (tab) =>
        `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
            activeTab === tab
                ? "border-[#c7d9bf] bg-[#edf4e3] text-greenDark"
                : "border-[#dbe6cf] bg-white text-greenMid hover:bg-[#f8fbf3]"
        }`;

    return (
        <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/75 bg-[rgba(247,250,242,0.95)] p-5 shadow-[0_24px_70px_rgba(52,78,24,0.14)] backdrop-blur-sm md:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                <Settings2 size={13} />
                Assistant Settings
            </div>
            <p className="mt-3 text-sm leading-6 text-greenMid">
                Keep your plant context and garden photo visible while chatting so the recommendation cards stay roomy and easy to scan.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setActiveTab("context")} className={tabButtonClasses("context")}>
                    <Settings2 size={13} />
                    Context
                </button>
                <button type="button" onClick={() => setActiveTab("image")} className={tabButtonClasses("image")}>
                    <ImagePlus size={13} />
                    Images
                </button>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                {activeTab === "context" ? (
                    <PremiumAssistantSettingsContent controller={controller} />
                ) : (
                    <PremiumAssistantImageUploadContent controller={controller} />
                )}
            </div>
        </aside>
    );
}

function PremiumAssistantChatPanel({
    controller,
    compact = false,
    onOpenCompactAttachments = null,
    showPanelBadge,
    showSelectionBadge,
    showContextSnapshot,
    hideAttachmentButton = false,
    fillHeight = false,
}) {
    const {
        contextPreview,
        conversation,
        selectedPlantIds,
        uploadedChatImage,
        uploadedReferenceImage,
        loading,
        error,
        setError,
        message,
        setMessage,
        clearChatImage,
        clearReferenceGardenImage,
        executeAssistantAction,
        addResultPlantToContext,
        handleSendMessage,
        resetAssistantChat,
        selectedPlantLimit,
    } = controller;
    const conversationRef = useRef(null);
    const [attachmentPanelOpen, setAttachmentPanelOpen] = useState(false);
    const [attachmentTab, setAttachmentTab] = useState("context");
    const shouldShowPanelBadge = showPanelBadge ?? !compact;
    const shouldShowSelectionBadge = showSelectionBadge ?? true;
    const shouldShowContextSnapshot = showContextSnapshot ?? !compact;
    const hasResettableChatState =
        conversation.length > 1 ||
        Boolean(message.trim()) ||
        Boolean(error) ||
        (contextPreview.selectedPlants || []).length > 0 ||
        (contextPreview.messageMatchedPlants || []).length > 0;

    useEffect(() => {
        const element = conversationRef.current;
        if (!element) return;
        element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }, [conversation, loading]);

    const handleResetChat = () => {
        if (!hasResettableChatState || loading) {
            return;
        }

        const confirmed = window.confirm("Are you sure you want to clear this chat and start a new one?");
        if (!confirmed) {
            return;
        }

        resetAssistantChat();
    };

    const surfaceClasses = compact
        ? "border border-white/75 bg-[rgba(247,250,242,0.95)] shadow-[0_24px_70px_rgba(52,78,24,0.14)]"
        : "border border-white/70 bg-white/88 shadow-[0_24px_70px_rgba(52,78,24,0.12)]";

    return (
        <section className={`flex min-h-0 flex-1 flex-col rounded-[32px] p-6 backdrop-blur-sm md:p-7 ${surfaceClasses} ${compact || fillHeight ? "h-full" : ""}`}>
            <div className={`mb-5 flex items-center gap-4 ${shouldShowPanelBadge ? "justify-between" : "justify-end"}`}>
                {shouldShowPanelBadge ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                        <Sparkles size={13} />
                        Assistant Chat
                    </div>
                ) : null}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleResetChat}
                        disabled={!hasResettableChatState || loading}
                        className={`rounded-full border p-2 transition ${
                            !hasResettableChatState || loading
                                ? "cursor-not-allowed border-[#dbe6cf] bg-[#f4f7ef] text-greenMid/70"
                                : "border-[#dbe6cf] bg-white text-greenMid hover:text-[#b64035]"
                        }`}
                        aria-label="Clear chat and start a new one"
                        title="Clear chat and start a new one"
                    >
                        <Trash2 size={14} />
                    </button>
                {shouldShowSelectionBadge ? (
                        <div className="rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-xs font-semibold text-greenMid">
                            {selectedPlantIds.length} / {selectedPlantLimit} selected plants
                        </div>
                ) : null}
                </div>
            </div>

            {shouldShowContextSnapshot ? (
                <div className="mb-4 rounded-[24px] border border-[#dbe6cf] bg-[#f8fbf3] p-4 text-sm text-greenMid">
                    <div className="font-semibold text-greenDark">Last grounded context snapshot</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {(contextPreview.selectedPlants || []).length > 0 ? (
                            contextPreview.selectedPlants.map((plant, index) => (
                                <span key={`selected-${plant.id || index}-${index}`} className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-semibold text-landingPageIcons">
                                    selected: {plant.commonName || plant.scientificName}
                                </span>
                            ))
                        ) : (
                            <span>No grounded selected plants yet.</span>
                        )}
                    </div>
                    {(contextPreview.messageMatchedPlants || []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {contextPreview.messageMatchedPlants.map((plant, index) => (
                                <span key={`matched-${plant.id || index}-${index}`} className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-semibold text-[#7b5f0e]">
                                    matched from message: {plant.commonName || plant.scientificName}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div ref={conversationRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain rounded-[28px] border border-[#dbe6cf] bg-[#f8fbf3] p-5">
                {conversation.map((entry) => {
                    const plannerPreview = getPremiumPlannerPreview(entry.id);
                    const hasWideContent =
                        entry.generatedImage ||
                        plannerPreview?.generatedImage ||
                        Boolean(entry.action) ||
                        (Array.isArray(entry.resultCards) && entry.resultCards.length > 0);

                    return (
                        <article
                            key={entry.id}
                            className={`${hasWideContent ? "max-w-full" : "max-w-[92%] md:max-w-[84%]"} rounded-[24px] px-5 py-4 shadow-[0_10px_35px_rgba(52,78,24,0.06)] ${
                                entry.role === "user"
                                    ? "ml-auto bg-landingPageIcons text-white"
                                    : "bg-white text-greenDark"
                            }`}
                        >
                            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">
                                {entry.role === "user" ? "You" : "SoilSync Premium"}
                            </div>
                            <p className="whitespace-pre-line text-sm leading-7">{entry.content}</p>

                            {entry.role === "user" && entry.uploadedImage?.previewUrl ? (
                                <div className="mt-3 overflow-hidden rounded-[20px] border border-white/35 bg-white/10">
                                    <img
                                        src={entry.uploadedImage.previewUrl}
                                        alt={entry.uploadedImage.fileName || "Attached chat image"}
                                        className="max-h-[280px] w-full object-cover"
                                    />
                                </div>
                            ) : null}

                            {entry.role === "assistant" && Array.isArray(entry.seenSelectedPlantNames) && entry.seenSelectedPlantNames.length > 0 ? (
                                <div className="mt-3 text-[12px] font-medium text-greenMid">
                                    Seen selected plants: {entry.seenSelectedPlantNames.join(", ")}
                                </div>
                            ) : null}

                            {entry.role === "assistant" ? (
                                <AssistantActionSection
                                    entry={entry}
                                    compact={compact}
                                    selectedPlantIds={selectedPlantIds}
                                    selectedPlantLimit={selectedPlantLimit}
                                    onExecuteAction={executeAssistantAction}
                                    onAddPlantToContext={addResultPlantToContext}
                                />
                            ) : null}
                        </article>
                    );
                })}

                {loading ? (
                    <div className="max-w-[88%] rounded-[24px] bg-white px-5 py-4 text-sm text-greenMid shadow-[0_10px_35px_rgba(52,78,24,0.06)]">
                        SoilSync Premium is mapping your request to the right tool...
                    </div>
                ) : null}
            </div>

            {error ? (
                <div className="mt-4 rounded-2xl border border-[#f4c9c5] bg-[#fff2f0] px-4 py-3 text-sm font-medium text-[#b64035]">
                    {error}
                </div>
            ) : null}

            {uploadedChatImage ? (
                <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-2xl border border-[#dbe6cf] bg-white">
                        <img
                            src={uploadedChatImage.previewUrl}
                            alt={uploadedChatImage.fileName || "Attached chat image"}
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-greenDark">
                            Chat image attached
                        </div>
                        <div className="truncate text-xs text-greenMid">
                            {uploadedChatImage.fileName || "Attached chat image"}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={clearChatImage}
                        className="rounded-full border border-[#dbe6cf] bg-white p-2 text-greenMid transition hover:text-[#b64035]"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ) : null}

            {uploadedReferenceImage ? (
                <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-3">
                    <div className="h-12 w-12 overflow-hidden rounded-2xl border border-[#dbe6cf] bg-white">
                        <img
                            src={uploadedReferenceImage.previewUrl}
                            alt={uploadedReferenceImage.fileName || "Uploaded garden photo"}
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-greenDark">
                            Garden photo attached
                        </div>
                        <div className="truncate text-xs text-greenMid">
                            {uploadedReferenceImage.fileName || "Uploaded garden photo"}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={clearReferenceGardenImage}
                        className="rounded-full border border-[#dbe6cf] bg-white p-2 text-greenMid transition hover:text-[#b64035]"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ) : null}

            <div className="relative mt-5 shrink-0">
                {!compact && !hideAttachmentButton && attachmentPanelOpen ? (
                    <PremiumAssistantAttachmentPanel
                        controller={controller}
                        activeTab={attachmentTab}
                        setActiveTab={setAttachmentTab}
                        onClose={() => setAttachmentPanelOpen(false)}
                        compact={compact}
                    />
                ) : null}

                <form onSubmit={handleSendMessage} className="flex shrink-0 gap-3">
                    {!hideAttachmentButton ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (compact && onOpenCompactAttachments) {
                                    onOpenCompactAttachments();
                                    return;
                                }
                                setAttachmentTab("context");
                                setAttachmentPanelOpen((prev) => !prev);
                            }}
                            className={`inline-flex items-center justify-center self-end border border-[#dce7cf] bg-white text-greenDark transition hover:border-landingPageIcons hover:bg-[#f8fbf3] ${
                                compact ? "h-[58px] w-[58px] rounded-full" : "rounded-[24px] px-4 py-4"
                            }`}
                            aria-label="Open context and image upload"
                        >
                            <Plus size={compact ? 20 : 18} />
                        </button>
                    ) : null}
                    <textarea
                        rows={compact ? 2 : 3}
                        value={message}
                        onChange={(e) => {
                            if (error) setError("");
                            setMessage(e.target.value);
                        }}
                        placeholder="Try: What plant is this photo? Or: Do these leaves look diseased? Or: Use these selected plants in a Japanese zen garden."
                        className="flex-1 resize-none rounded-[24px] border border-[#dce7cf] bg-white px-5 py-4 text-sm text-greenDark outline-none transition focus:border-landingPageIcons"
                    />
                    <button
                        type="submit"
                        disabled={loading || (!message.trim() && !uploadedChatImage)}
                        className={`inline-flex items-center justify-center self-end bg-landingPageIcons text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-60 ${
                            compact ? "h-[58px] w-[58px] rounded-full" : "gap-2 rounded-[24px] px-5 py-4"
                        }`}
                        aria-label="Send message"
                    >
                        <Send size={16} />
                        {!compact ? "Send" : null}
                    </button>
                </form>
            </div>
        </section>
    );
}

export function PremiumAssistantPageSurface({ controller }) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(228,237,216,0.96)_36%,_rgba(205,219,188,0.98)_100%)] px-4 pb-12 pt-28 font-dm">
            <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                <section className="rounded-[32px] border border-white/70 bg-white/88 p-7 shadow-[0_24px_70px_rgba(52,78,24,0.12)] backdrop-blur-sm md:p-8">
                    <PremiumAssistantSettingsContent controller={controller} />
                </section>
                <div className="lg:h-[calc(100vh-6.75rem)] lg:max-h-[calc(100vh-6.75rem)]">
                    <PremiumAssistantChatPanel controller={controller} />
                </div>
            </div>
        </div>
    );
}

export function PremiumAssistantFloatingWidget({ controller, user, isPremium, onNavigateUpgrade }) {
    const [open, setOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [sidebarTab, setSidebarTab] = useState("context");
    const selectedPlantCount = controller?.selectedPlantIds?.length ?? 0;
    const selectedPlantLimit = controller?.selectedPlantLimit ?? 4;

    if (!user) {
        return null;
    }

    if (!isPremium) {
        return (
            <div className="fixed bottom-5 right-5 z-50">
                <button
                    type="button"
                    onClick={onNavigateUpgrade}
                    className="inline-flex items-center gap-2 rounded-full border border-[#efe4b2] bg-[#fff8df] px-5 py-3 text-sm font-bold text-[#8c6b0e] shadow-[0_18px_40px_rgba(52,78,24,0.16)] transition hover:bg-white"
                >
                    <Crown size={16} />
                    AI Assistant
                </button>
            </div>
        );
    }

    const handleOpen = () => {
        setMinimized(false);
        setOpen(true);
    };

    const handleClose = () => {
        setMinimized(false);
        setOpen(false);
    };

    return (
        <>
            {open && minimized ? (
                <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,430px)]">
                    <div className="rounded-[28px] border border-[#aac0af] bg-[#95B29B] p-3 shadow-[0_24px_70px_rgba(52,78,24,0.24)] backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4 rounded-[22px] border border-white/70 bg-[rgba(247,250,242,0.95)] px-4 py-3">
                            <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                                    <MessageSquareText size={13} />
                                    Assistant Chat
                                </div>
                                <p className="mt-2 text-sm text-greenMid">
                                    Workspace minimized. Reopen it to see the full chat and settings side by side.
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMinimized(false)}
                                    className="rounded-full border border-[#dbe6cf] bg-white p-2 text-greenDark transition hover:bg-[#f8fbf3]"
                                    aria-label="Reopen assistant"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="rounded-full border border-[#dbe6cf] bg-white p-2 text-greenDark transition hover:bg-[#f8fbf3]"
                                    aria-label="Close assistant"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {open && !minimized ? (
                <div className="fixed inset-x-4 bottom-4 top-20 z-50 md:inset-x-6 md:top-24 xl:left-[max(2rem,calc(50%-720px))] xl:right-[max(2rem,calc(50%-720px))]">
                    <div className="flex h-full flex-col overflow-hidden rounded-[36px] border border-[#aac0af] bg-[#95B29B] shadow-[0_30px_90px_rgba(52,78,24,0.28)] backdrop-blur-xl">
                        <div className="border-b border-white/30 px-5 pb-4 pt-3 md:px-6">
                            <div className="mx-auto h-1.5 w-16 rounded-full bg-white/45" />
                            <div className="mt-4 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                                        <MessageSquareText size={14} />
                                        Assistant Workspace
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                    <div className="rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-xs font-semibold text-greenMid">
                                        {selectedPlantCount} / {selectedPlantLimit} selected plants
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMinimized(true)}
                                        className="rounded-full border border-white/70 bg-white/90 p-2 text-greenDark transition hover:bg-white"
                                        aria-label="Minimize assistant"
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="rounded-full border border-white/70 bg-white/90 p-2 text-greenDark transition hover:bg-white"
                                        aria-label="Close assistant"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid min-h-0 flex-1 gap-4 p-4 max-lg:grid-rows-[minmax(260px,40vh)_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)] lg:p-5">
                            <div className="min-h-0">
                                <PremiumAssistantSidebar
                                    controller={controller}
                                    activeTab={sidebarTab}
                                    setActiveTab={setSidebarTab}
                                />
                            </div>
                            <div className="min-h-0">
                                <PremiumAssistantChatPanel
                                    controller={controller}
                                    showPanelBadge={false}
                                    showSelectionBadge={false}
                                    showContextSnapshot={false}
                                    hideAttachmentButton
                                    fillHeight
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {!open ? (
                <div className="fixed bottom-5 right-5 z-50">
                <button
                    type="button"
                    onClick={handleOpen}
                    className="inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-5 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(52,78,24,0.22)] transition hover:-translate-y-0.5 hover:bg-darkLandingPageIcons"
                >
                    <Sparkles size={16} />
                    AI Assistant
                </button>
                </div>
            ) : null}
        </>
    );
}
