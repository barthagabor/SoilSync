import { useEffect, useState } from "react";
import { MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import { formatCompactNumber, formatRelativeDate, getCommunityGardenStyleLabel, getCommunityPostTypeMeta } from "../../data/communityData.js";

export function CommunityAvatar({ member, size = "md" }) {
    const [imageFailed, setImageFailed] = useState(false);
    const sizes = {
        sm: "h-10 w-10 text-sm",
        md: "h-12 w-12 text-base",
        lg: "h-16 w-16 text-lg",
        xl: "h-24 w-24 text-2xl",
    };
    const profileImage = String(member?.profileImage || "").trim();

    const initials = String(member?.name || "SoilSync")
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();

    useEffect(() => {
        setImageFailed(false);
    }, [profileImage]);

    if (profileImage && !imageFailed) {
        return (
            <img
                src={profileImage}
                alt={member?.name || "Community member"}
                onError={() => setImageFailed(true)}
                className={`shrink-0 rounded-full border border-white/70 bg-[#f5f8ef] object-cover shadow-[0_12px_30px_rgba(52,78,24,0.12)] ${sizes[size] || sizes.md}`}
            />
        );
    }

    return (
        <div
            className={`flex shrink-0 items-center justify-center rounded-full border border-white/70 bg-gradient-to-br text-greenDark shadow-[0_12px_30px_rgba(52,78,24,0.12)] ${member?.avatarTone || "from-[#edf4e3] to-[#95B29B]"} ${sizes[size] || sizes.md}`}
        >
            {initials}
        </div>
    );
}

export function CommunityRoleBadge({ member }) {
    if (!member?.systemRole || member.systemRole === "user") {
        return null;
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#dbe6cf] bg-[#edf4e3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
            <ShieldCheck size={11} />
            {member.systemRole === "superadmin" ? "Superadmin" : "Admin"}
        </span>
    );
}

export function CommunityTypePill({ type }) {
    const meta = getCommunityPostTypeMeta(type);

    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${meta.chip}`}>
            {meta.label}
        </span>
    );
}

export function CommunityPlantTags({ plants = [] }) {
    if (!plants.length) return null;

    return (
        <div className="mt-4 flex flex-wrap gap-2">
            {plants.map((plant) => (
                <span
                    key={plant.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f7faf2] px-3 py-1.5 text-xs font-semibold text-greenDark"
                >
                    <span className="rounded-full bg-[#e7efd9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-landingPageIcons">
                        {plant.category}
                    </span>
                    <span>{plant.name}</span>
                </span>
            ))}
        </div>
    );
}

export function CommunitySavedGardenTeaser({ garden, compact = false }) {
    if (!garden) return null;

    return (
        <div className="mt-4 overflow-hidden rounded-[24px] border border-[#dbe6cf] bg-[#f8fbf3] shadow-[0_10px_28px_rgba(52,78,24,0.07)]">
            <div className={`grid ${compact ? "md:grid-cols-[140px_1fr]" : "md:grid-cols-[180px_1fr]"}`}>
                <div className="h-40 overflow-hidden md:h-full">
                    <img src={garden.image} alt={garden.title} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
                            {getCommunityGardenStyleLabel(garden.style)}
                        </span>
                        <span className="text-xs font-medium text-greenMid">Shared planner concept</span>
                    </div>
                    <h4 className="mt-3 font-playfair text-xl text-greenDark">{garden.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-greenMid">{garden.note}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {garden.plants.map((plantName) => (
                            <span key={plantName} className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-[11px] font-semibold text-greenDark">
                                {plantName}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CommunityMetaRow({ post }) {
    return (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-greenMid">
            <span>{formatRelativeDate(post.createdAt)}</span>
            {post.region ? (
                <span className="inline-flex items-center gap-1">
                    <MapPin size={14} />
                    {post.region}
                </span>
            ) : null}
            {post.solved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f6dc] px-2.5 py-1 text-[11px] font-semibold text-[#49661d]">
                    <Sparkles size={12} />
                    Solved
                </span>
            ) : null}
        </div>
    );
}

export function CommunityStatChip({ icon: Icon, value, label }) {
    return (
        <div className="rounded-[22px] border border-[#dbe6cf] bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(52,78,24,0.07)]">
            <div className="flex items-center gap-2 text-landingPageIcons">
                <Icon size={15} />
                <span className="text-lg font-bold text-greenDark">{formatCompactNumber(value)}</span>
            </div>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-greenMid">{label}</p>
        </div>
    );
}

export function CommunityBadgeList({ badges = [] }) {
    if (!badges.length) return null;

    return (
        <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((badge) => (
                <span
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full border border-[#dbe6cf] bg-white px-3 py-1.5 text-[11px] font-semibold text-greenDark"
                >
                    <Star size={12} className="text-[#b1841f]" />
                    {badge}
                </span>
            ))}
        </div>
    );
}
