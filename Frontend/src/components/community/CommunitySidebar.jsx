import { Link } from "react-router-dom";
import { Compass, MapPin, Search, Users } from "lucide-react";

export function CommunitySearchField({ value, onChange, placeholder = "Search discussions, tips, gardens..." }) {
    return (
        <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-greenMid" />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-[18px] border border-[#dbe6cf] bg-white px-12 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-[#f8fbf3]"
            />
        </label>
    );
}

export function CommunitySidebar({
    currentRegion,
    topicCards = [],
    suggestedMembers = [],
}) {
    return (
        <div className="space-y-4">
            <section className="rounded-[28px] border border-[#dbe6cf] bg-white/92 p-5 shadow-[0_12px_34px_rgba(52,78,24,0.08)]">
                <div className="flex items-start gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#edf4e3] text-landingPageIcons">
                        <MapPin size={18} />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-greenMid">Local relevance</p>
                        <h3 className="mt-1 font-playfair text-2xl text-greenDark">{currentRegion}</h3>
                        <p className="mt-2 text-sm leading-6 text-greenMid">
                            Regional notes surface faster here, so seasonal soil, humidity, and pest discussions are easier to spot.
                        </p>
                    </div>
                </div>
                <Link
                    to="/community?filter=local"
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-white"
                >
                    Open local discussions
                    <Compass size={14} />
                </Link>
            </section>

            <SidebarPanel title="Topics" icon={Compass}>
                <div className="flex flex-wrap gap-2">
                    {topicCards.slice(0, 6).map((topic) => (
                        <Link
                            key={topic.slug}
                            to={`/community?tag=${encodeURIComponent(topic.slug)}`}
                            className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-1.5 text-xs font-semibold text-greenDark transition hover:bg-white"
                        >
                            <span>{topic.name}</span>
                            <span className="rounded-full border border-[#dbe6cf] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-greenMid">
                                {topic.postCount || 0}
                            </span>
                        </Link>
                    ))}
                </div>
            </SidebarPanel>

            <SidebarPanel title="Active contributors" icon={Users}>
                <div className="space-y-3">
                    {suggestedMembers.map((member) => (
                        <Link
                            key={member.username}
                            to={`/community/member/${member.username}`}
                            className="flex items-center justify-between gap-3 rounded-[18px] border border-[#dbe6cf] bg-[#f8fbf3] px-3 py-3 transition hover:bg-white"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-greenDark">{member.name}</p>
                                <p className="truncate text-xs text-greenMid">@{member.username}</p>
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-landingPageIcons">
                                {member.stats.helpfulAnswers} helps
                            </span>
                        </Link>
                    ))}
                </div>
            </SidebarPanel>
        </div>
    );
}

function SidebarPanel({ title, icon: Icon, children }) {
    return (
        <section className="rounded-[28px] border border-[#dbe6cf] bg-white/92 p-5 shadow-[0_12px_34px_rgba(52,78,24,0.08)]">
            <div className="mb-4 flex items-center gap-2 text-greenDark">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#edf4e3] text-landingPageIcons">
                    <Icon size={16} />
                </div>
                <h3 className="font-playfair text-2xl">{title}</h3>
            </div>
            {children}
        </section>
    );
}
