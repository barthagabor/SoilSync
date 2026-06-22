import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { buildUrl, updateUserProfileRequest } from "../services/authService.jsx";
import { usePageScrollRestoration, useSessionStorageState } from "../hooks/usePagePersistence";
import {
    CalendarDays,
    Camera,
    ChevronDown,
    Crown,
    Download,
    Droplets,
    Leaf,
    LogOut,
    Mail,
    MapPin,
    Pencil,
    Save,
    ShieldCheck,
    Star,
    User,
    X,
} from "lucide-react";

const PREVIEW_ITEM_COUNT = 3;

function getPlantImage(plant) {
    return (
        plant?.default_image?.regular_url ||
        plant?.default_image?.medium_url ||
        plant?.default_image?.small_url ||
        null
    );
}

function careColor(level) {
    if (level === "Low") return "bg-[#e9f6dc] text-[#49661d]";
    if (level === "Medium") return "bg-[#fff1d6] text-[#9d6b09]";
    if (level === "High") return "bg-[#ffe3df] text-[#b04436]";
    return "bg-[#eef3e7] text-greenMid";
}

function getSavedGardenStyleLabel(styleValue) {
    const styleLabels = {
        flowering_cottage: "Flowering Cottage",
        stone_gravel: "Stone & Gravel",
        modern_minimal: "Modern Minimal",
        mediterranean: "Mediterranean",
        japanese_zen: "Japanese Zen",
    };

    return styleLabels[styleValue] || "Garden";
}

function slugifyFileName(value) {
    return String(value || "saved_garden")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60) || "saved_garden";
}

function AccordionSection({
    icon: Icon,
    eyebrow,
    title,
    subtitle,
    open,
    onToggle,
    action = null,
    children,
}) {
    return (
        <section className="rounded-[32px] border border-white/70 bg-white/88 p-7 shadow-[0_24px_70px_rgba(52,78,24,0.12)] backdrop-blur-sm md:p-9">
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4e5] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                        <Icon size={13} />
                        {eyebrow}
                    </div>
                    <h2 className="mt-4 font-playfair text-3xl text-greenDark">{title}</h2>
                    {subtitle ? (
                        <p className="mt-2 text-sm text-greenMid">{subtitle}</p>
                    ) : null}
                </button>

                <div className="flex items-center gap-3">
                    {action}
                    <button
                        type="button"
                        onClick={onToggle}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d0dec2] bg-white text-greenDark transition hover:bg-[#f5f8ef]"
                        aria-label={open ? "Show fewer items" : "Show all items"}
                    >
                        <ChevronDown
                            size={18}
                            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </button>
                </div>
            </div>

            {children}
        </section>
    );
}

export default function ProfilePage() {
    const { user, updateUser, logout, favourites, toggleFavourite, isPremium } = useAuth();

    const [name, setName] = useSessionStorageState("page:profile:name", "");
    const [bio, setBio] = useSessionStorageState("page:profile:bio", "");
    const [location, setLocation] = useSessionStorageState("page:profile:location", "");
    const [imagePreview, setImagePreview] = useSessionStorageState("page:profile:image-preview", "");
    const [isEditing, setIsEditing] = useSessionStorageState("page:profile:is-editing", false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useSessionStorageState("page:profile:message", { text: "", type: "" });
    const [favPlants, setFavPlants] = useState([]);
    const [favLoading, setFavLoading] = useState(false);
    const [savedGardens, setSavedGardens] = useState([]);
    const [savedGardensLoading, setSavedGardensLoading] = useState(false);
    const [removingGardenId, setRemovingGardenId] = useState(null);
    const [savedGardensOpen, setSavedGardensOpen] = useSessionStorageState("page:profile:saved-gardens-expanded", false);
    const [favouritesOpen, setFavouritesOpen] = useSessionStorageState("page:profile:favourites-expanded", false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    usePageScrollRestoration("page:profile", !favLoading && !savedGardensLoading);

    useEffect(() => {
        if (!user) return;
        setName(user.name || "");
        setBio(user.bio || "");
        setLocation(user.location || "");
        setImagePreview(user.profileImage || "");
    }, [setBio, setImagePreview, setLocation, setName, user]);

    useEffect(() => {
        const loadFavPlants = async () => {
            if (!favourites || favourites.length === 0) {
                setFavPlants([]);
                return;
            }

            setFavLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(buildUrl("/favourites"), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setFavPlants(data.plants || []);
                }
            } catch (err) {
                console.error("Failed to load favourite plants", err);
            } finally {
                setFavLoading(false);
            }
        };

        loadFavPlants();
    }, [favourites]);

    useEffect(() => {
        const loadSavedGardens = async () => {
            if (!user) return;

            setSavedGardensLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(buildUrl("/saved-gardens"), {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setSavedGardens(data.savedGardens || []);
                } else {
                    setSavedGardens([]);
                }
            } catch (err) {
                console.error("Failed to load saved gardens", err);
                setSavedGardens([]);
            } finally {
                setSavedGardensLoading(false);
            }
        };

        loadSavedGardens();
    }, [user]);

    useEffect(() => {
        if (savedGardens.length <= PREVIEW_ITEM_COUNT && savedGardensOpen) {
            setSavedGardensOpen(false);
        }
    }, [savedGardens.length, savedGardensOpen, setSavedGardensOpen]);

    useEffect(() => {
        if (favPlants.length <= PREVIEW_ITEM_COUNT && favouritesOpen) {
            setFavouritesOpen(false);
        }
    }, [favPlants.length, favouritesOpen, setFavouritesOpen]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const clearPasswordInputs = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleSave = async () => {
        setMessage({ text: "", type: "" });

        const trimmedName = String(name || "").trim();
        const hasPasswordChanges = Boolean(currentPassword || newPassword || confirmPassword);

        if (!trimmedName) {
            setMessage({ text: "Name cannot be empty.", type: "error" });
            return;
        }

        if (hasPasswordChanges) {
            if (!currentPassword || !newPassword || !confirmPassword) {
                setMessage({ text: "Fill in all password fields to change your password.", type: "error" });
                return;
            }

            if (newPassword.length < 8) {
                setMessage({ text: "New password must be at least 8 characters long.", type: "error" });
                return;
            }

            if (newPassword !== confirmPassword) {
                setMessage({ text: "New password and confirmation do not match.", type: "error" });
                return;
            }
        }

        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const data = await updateUserProfileRequest(token, {
                name: trimmedName,
                bio,
                location,
                profileImage: imagePreview,
                ...(hasPasswordChanges ? { currentPassword, newPassword } : {}),
            });
            updateUser(data.user);
            clearPasswordInputs();
            setMessage({ text: data?.message || "Profile updated successfully.", type: "success" });
            setIsEditing(false);
            setTimeout(() => setMessage({ text: "", type: "" }), 3000);
        } catch (err) {
            setMessage({ text: err.message || "Error connecting to server.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (!user) return;
        setName(user.name || "");
        setBio(user.bio || "");
        setLocation(user.location || "");
        setImagePreview(user.profileImage || "");
        clearPasswordInputs();
        setIsEditing(false);
        setMessage({ text: "", type: "" });
    };

    const handleDeleteSavedGarden = async (gardenId) => {
        try {
            setRemovingGardenId(gardenId);
            const token = localStorage.getItem("token");
            const res = await fetch(buildUrl(`/saved-gardens/${gardenId}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error("Failed to delete saved garden.");
            }

            setSavedGardens((prev) => prev.filter((garden) => garden._id !== gardenId));
        } catch (err) {
            console.error("Delete saved garden failed", err);
            setMessage({ text: "Failed to remove saved garden.", type: "error" });
            setTimeout(() => setMessage({ text: "", type: "" }), 3000);
        } finally {
            setRemovingGardenId(null);
        }
    };

    const handleDownloadSavedGarden = (garden) => {
        if (!garden?.image) return;

        const fileBase = slugifyFileName(garden.title || getSavedGardenStyleLabel(garden.gardenStyle));
        const extension = garden.image.startsWith("data:image/png") ? "png" : "jpg";
        const element = document.createElement("a");
        element.href = garden.image;
        element.download = `${fileBase}_${new Date(garden.savedAt || Date.now()).getTime()}.${extension}`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const joinedDate = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : null;

    const roleLabel = user?.role || "Gardener";
    const systemRole = String(user?.systemRole || "").trim().toLowerCase();
    const systemRoleLabel = systemRole === "superadmin" ? "superadmin" : systemRole === "admin" ? "admin" : "";
    const systemRoleClass =
        systemRole === "superadmin"
            ? "bg-[#fff1d6] text-[#9d6b09]"
            : systemRole === "admin"
                ? "bg-[#e9f6dc] text-[#49661d]"
                : "";
    const premiumLabel = isPremium ? "Premium Active" : "Free Plan";
    const premiumClass = isPremium
        ? "bg-[#fff8df] text-[#9d7a10]"
        : "bg-[#eef3e7] text-greenMid";
    const savedCount = favourites?.length || 0;
    const savedGardenCount = savedGardens.length;
    const hasMoreSavedGardens = savedGardens.length > PREVIEW_ITEM_COUNT;
    const hasMoreFavouritePlants = favPlants.length > PREVIEW_ITEM_COUNT;
    const visibleSavedGardens = savedGardensOpen ? savedGardens : savedGardens.slice(0, PREVIEW_ITEM_COUNT);
    const visibleFavouritePlants = favouritesOpen ? favPlants : favPlants.slice(0, PREVIEW_ITEM_COUNT);
    if (!user) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(228,237,216,0.96)_36%,_rgba(205,219,188,0.98)_100%)] px-4 pb-12 pt-28 font-dm">
                <Navbar />
                <div className="flex min-h-[50vh] items-center justify-center text-greenMid">
                    Please log in to view your profile.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(228,237,216,0.96)_36%,_rgba(205,219,188,0.98)_100%)] px-4 pb-12 pt-28 font-dm">
            <Navbar />
            <div className="mx-auto max-w-7xl space-y-8">
                <section className="overflow-hidden rounded-[34px] border border-white/70 bg-white/86 shadow-[0_28px_90px_rgba(52,78,24,0.14)] backdrop-blur-sm">
                    <div className="grid lg:grid-cols-[1.18fr_0.82fr]">
                        <div className="relative overflow-hidden border-b border-[#e3ecda] bg-[linear-gradient(135deg,rgba(248,251,243,0.98),rgba(255,255,255,0.92))] p-7 md:p-10 lg:border-b-0 lg:border-r lg:p-12">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(184,213,140,0.28),_transparent_30%)]" />
                            <div className="relative">
                                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-landingPageIcons">
                                        <Leaf size={13} />
                                        Profile Studio
                                    </div>

                                    <button
                                        onClick={logout}
                                        className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:bg-[#f5f9ef]"
                                    >
                                        <LogOut size={15} />
                                        Log Out
                                    </button>
                                </div>

                                <div className="flex flex-col gap-8 md:flex-row md:items-end">
                                    <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-[28px] border border-white/80 bg-[#edf4e3] shadow-[0_20px_55px_rgba(63,98,15,0.16)] md:h-40 md:w-40">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-greenMid">
                                                <User size={52} />
                                            </div>
                                        )}

                                        {isEditing && (
                                            <label
                                                className="absolute bottom-3 right-3 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/80 bg-landingPageIcons text-white transition hover:bg-darkLandingPageIcons"
                                                title="Change photo"
                                            >
                                                <Camera size={16} />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                            </label>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="mb-4 flex flex-wrap items-center gap-3">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-[#edf4e3] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons">
                                                <Leaf size={12} />
                                                {roleLabel}
                                            </span>

                                            {systemRoleLabel ? (
                                                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${systemRoleClass}`}>
                                                    <ShieldCheck size={12} />
                                                    {systemRoleLabel}
                                                </span>
                                            ) : null}

                                            {joinedDate && (
                                                <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-xs font-semibold text-greenMid">
                                                    <CalendarDays size={12} />
                                                    Joined {joinedDate}
                                                </span>
                                            )}

                                            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${premiumClass}`}>
                                                <Crown size={12} />
                                                {premiumLabel}
                                            </span>
                                        </div>

                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Your name"
                                                className="mb-3 w-full rounded-2xl border border-[#d3e0c3] bg-white px-4 py-3 font-playfair text-3xl text-greenDark outline-none transition focus:border-landingPageIcons"
                                            />
                                        ) : (
                                            <h1 className="mb-3 font-playfair text-4xl leading-tight text-greenDark md:text-5xl">
                                                {name || "Your Name"}
                                            </h1>
                                        )}

                                        <p className="max-w-2xl text-base leading-relaxed text-greenMid">
                                            A cleaner profile layout for your account, saved plants, and gardening identity.
                                        </p>
                                    </div>
                                </div>

                                {message.text && (
                                    <div
                                        className={`mt-8 rounded-2xl border px-4 py-3 text-sm font-medium ${
                                            message.type === "success"
                                                ? "border-[#c7e4ba] bg-[#f1faea] text-[#2e6b1f]"
                                                : "border-[#f4c9c5] bg-[#fff2f0] text-[#b64035]"
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                )}

                                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[24px] border border-[#dbe6cf] bg-white/90 p-5">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">
                                            Saved Plants
                                        </div>
                                        <div className="mt-2 font-playfair text-4xl text-greenDark">{savedCount}</div>
                                    </div>

                                    <div className="rounded-[24px] border border-[#dbe6cf] bg-white/90 p-5">
                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">
                                            Premium Access
                                        </div>
                                        <div className="mt-3 text-sm font-semibold text-greenDark">
                                            {isPremium ? "AI garden consultant unlocked" : "Upgrade required for the premium assistant"}
                                        </div>
                                        <div className="mt-4">
                                            {isPremium ? (
                                                <Link
                                                    to="/premium-assistant"
                                                    className="inline-flex items-center gap-2 rounded-full bg-landingPageIcons px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons"
                                                >
                                                    <Crown size={14} />
                                                    Open Premium AI
                                                </Link>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-sm font-semibold text-greenMid">
                                                    <Crown size={14} />
                                                    Ask an admin to enable premium
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#f8fbf3] p-7 md:p-10 lg:p-12">
                            <div className="mb-6 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">
                                        Personal Details
                                    </div>
                                    <h2 className="mt-2 font-playfair text-3xl text-greenDark">Identity Panel</h2>
                                </div>

                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCancel}
                                            className="inline-flex items-center gap-2 rounded-2xl border border-[#d0dec2] bg-white px-4 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f5f8ef]"
                                        >
                                            <X size={15} />
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={loading}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Save size={15} />
                                            {loading ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-[#d0dec2] bg-white px-4 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f5f8ef]"
                                    >
                                        <Pencil size={15} />
                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-[24px] border border-[#dbe6cf] bg-white p-5">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">
                                        <Mail size={13} />
                                        Email
                                    </div>
                                    <p className="break-all text-sm font-semibold text-greenDark">{user.email}</p>
                                </div>

                                <div className="rounded-[24px] border border-[#dbe6cf] bg-white p-5">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">
                                        <ShieldCheck size={13} />
                                        Password
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="Current password"
                                                autoComplete="current-password"
                                                className="w-full rounded-2xl border border-[#d3e0c3] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                                            />
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="New password (minimum 8 characters)"
                                                autoComplete="new-password"
                                                className="w-full rounded-2xl border border-[#d3e0c3] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                                            />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm new password"
                                                autoComplete="new-password"
                                                className="w-full rounded-2xl border border-[#d3e0c3] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                                            />
                                            <p className="text-xs leading-relaxed text-greenMid">
                                                Leave the password fields empty if you only want to update your profile details.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-relaxed text-greenDark">
                                            Open edit mode to change your password. For security, SoilSync asks for your current password before saving a new one.
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-[24px] border border-[#dbe6cf] bg-white p-5">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">
                                        <MapPin size={13} />
                                        Location
                                    </div>

                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="City, Country"
                                            className="w-full rounded-2xl border border-[#d3e0c3] bg-[#f8fbf3] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                                        />
                                    ) : (
                                        <p className="text-sm leading-relaxed text-greenDark">
                                            {location || "Add your city or region to make your profile feel more grounded."}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-[24px] border border-[#dbe6cf] bg-white p-5">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">
                                        <ShieldCheck size={13} />
                                        Status
                                    </div>
                                    <p className="text-sm leading-relaxed text-greenDark">
                                        Your account is active and your email is marked as verified.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-[#dbe6cf] bg-white p-5">
                                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">
                                        About Me
                                    </div>

                                    {isEditing ? (
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={6}
                                            placeholder="Tell us about your garden, style, or what you like to grow."
                                            className="w-full resize-none rounded-2xl border border-[#d3e0c3] bg-[#f8fbf3] px-4 py-3 text-sm leading-relaxed text-greenDark outline-none transition focus:border-landingPageIcons focus:bg-white"
                                        />
                                    ) : (
                                        <p className={`text-sm leading-relaxed ${bio ? "text-greenDark" : "italic text-greenMid"}`}>
                                            {bio || "No bio yet. Open edit mode and add a short introduction to make the page feel like yours."}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <AccordionSection
                    icon={Leaf}
                    eyebrow="Saved Gardens"
                    title="Garden Concepts"
                    subtitle={
                        savedGardenCount === 0
                            ? "Save a generated garden and it will appear here for later review."
                            : `${savedGardenCount} saved garden concept${savedGardenCount !== 1 ? "s" : ""} in your profile.`
                    }
                    open={savedGardensOpen}
                    onToggle={() => setSavedGardensOpen((prev) => !prev)}
                    action={
                        <Link
                            to="/garden-drawer"
                            className="inline-flex items-center gap-2 rounded-full border border-[#d0dec2] bg-white px-4 py-2 text-sm font-semibold text-greenDark no-underline transition hover:bg-[#f5f8ef]"
                        >
                            <Leaf size={15} />
                            Open Garden Planner
                        </Link>
                    }
                >
                    {savedGardensLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-72 rounded-[24px] bg-[#edf4e3] animate-skeleton" />
                            ))}
                        </div>
                    ) : savedGardens.length === 0 ? (
                        <div className="rounded-[28px] border border-dashed border-[#d5e1c8] bg-[#f8fbf3] px-6 py-14 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#edf4e3] text-landingPageIcons">
                                <Leaf size={24} />
                            </div>
                            <h3 className="font-playfair text-2xl text-greenDark">No saved gardens yet</h3>
                            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-greenMid">
                                Generate a garden in the planner, save the version you like, and come back to it here anytime.
                            </p>
                            <Link
                                to="/garden-drawer"
                                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-darkLandingPageIcons"
                            >
                                <Leaf size={15} />
                                Create a Garden
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visibleSavedGardens.map((garden) => (
                                    <article
                                        key={garden._id}
                                        className="overflow-hidden rounded-[26px] border border-[#dbe6cf] bg-[#fbfcf8] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(52,78,24,0.12)]"
                                    >
                                        <div className="relative h-52 bg-[linear-gradient(135deg,#dfead4,#b8cb97)]">
                                            {garden.image ? (
                                                <img
                                                    src={garden.image}
                                                    alt={garden.title || "Saved garden"}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-greenDark">
                                                    <Leaf size={28} />
                                                </div>
                                            )}

                                            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-white/88 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-greenDark">
                                                    {getSavedGardenStyleLabel(garden.gardenStyle)}
                                                </span>
                                                {garden.usedReferencePhoto && (
                                                    <span className="rounded-full bg-white/88 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-landingPageIcons">
                                                        Photo Edit
                                                    </span>
                                                )}
                                            </div>

                                            <div className="absolute right-4 top-4 flex items-center gap-2">
                                                <button
                                                    onClick={() => handleDownloadSavedGarden(garden)}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/88 text-landingPageIcons transition hover:bg-white"
                                                    title="Download saved garden"
                                                >
                                                    <Download size={16} />
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteSavedGarden(garden._id)}
                                                    disabled={removingGardenId === garden._id}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/88 text-[#b64035] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                                    title="Remove saved garden"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-4">
                                                <h3 className="font-playfair text-2xl text-greenDark">
                                                    {garden.title || "Saved Garden"}
                                                </h3>
                                                <p className="mt-1 text-sm text-greenMid">
                                                    {garden.savedAt
                                                        ? new Date(garden.savedAt).toLocaleString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : "Recently saved"}
                                                </p>
                                            </div>

                                            <div className="flex items-end justify-between gap-4">
                                                {Array.isArray(garden.plants) && garden.plants.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {garden.plants.slice(0, 4).map((plant, index) => (
                                                            <span
                                                                key={`${garden._id}-${plant.plantId || plant.commonName || index}`}
                                                                className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-xs font-semibold text-landingPageIcons"
                                                            >
                                                                {plant.commonName || plant.scientificName || `Plant ${index + 1}`}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : <div />}

                                                <button
                                                    onClick={() => handleDownloadSavedGarden(garden)}
                                                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#dbe6cf] bg-white px-4 py-2 text-xs font-semibold text-greenDark transition hover:bg-[#f5f8ef]"
                                                >
                                                    <Download size={14} />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {hasMoreSavedGardens ? (
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setSavedGardensOpen((prev) => !prev)}
                                        className="inline-flex items-center gap-2 rounded-full border border-[#d0dec2] bg-white px-5 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f5f8ef]"
                                    >
                                        <ChevronDown
                                            size={16}
                                            className={`transition-transform duration-200 ${savedGardensOpen ? "rotate-180" : ""}`}
                                        />
                                        {savedGardensOpen
                                            ? "Show fewer gardens"
                                            : `Show ${savedGardens.length - PREVIEW_ITEM_COUNT} more garden${savedGardens.length - PREVIEW_ITEM_COUNT !== 1 ? "s" : ""}`}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </AccordionSection>

                <AccordionSection
                    icon={Star}
                    eyebrow="Favourite Plants"
                    title="Saved Collection"
                    subtitle={
                        savedCount === 0
                            ? "Your saved plants will appear here once you start curating your library."
                            : `${savedCount} plant${savedCount !== 1 ? "s" : ""} saved to your collection.`
                    }
                    open={favouritesOpen}
                    onToggle={() => setFavouritesOpen((prev) => !prev)}
                    action={
                        savedCount > 0 ? (
                            <Link
                                to="/plants"
                                className="inline-flex items-center gap-2 rounded-full border border-[#d0dec2] bg-white px-4 py-2 text-sm font-semibold text-greenDark no-underline transition hover:bg-[#f5f8ef]"
                            >
                                Browse Library
                            </Link>
                        ) : null
                    }
                >
                        {favLoading ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-32 rounded-[24px] bg-[#edf4e3] animate-skeleton" />
                                ))}
                            </div>
                        ) : favPlants.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-[#d5e1c8] bg-[#f8fbf3] px-6 py-14 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff5c9] text-[#caa028]">
                                    <Star size={24} />
                                </div>
                                <h3 className="font-playfair text-2xl text-greenDark">No favourites yet</h3>
                                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-greenMid">
                                    Start starring plants in the library and build a saved shortlist you can revisit here.
                                </p>
                                <Link
                                    to="/plants"
                                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-darkLandingPageIcons"
                                >
                                    <Leaf size={15} />
                                    Explore Plants
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {visibleFavouritePlants.map((plant) => {
                                        const imageUrl = getPlantImage(plant);
                                        const latinName = Array.isArray(plant.scientific_name)
                                            ? plant.scientific_name[0]
                                            : plant.scientific_name;
                                        const title = plant.common_name || latinName || "Unknown plant";

                                        return (
                                            <article
                                                key={plant.id}
                                                className="group overflow-hidden rounded-[26px] border border-[#dbe6cf] bg-[#fbfcf8] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(52,78,24,0.12)]"
                                            >
                                                <Link to={`/plant/${plant.id}`} className="no-underline">
                                                    <div className="h-40 bg-[linear-gradient(135deg,#dfead4,#b8cb97)]">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={title}
                                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-greenDark">
                                                                <Leaf size={28} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>

                                                <div className="p-5">
                                                    <div className="mb-4 flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <Link to={`/plant/${plant.id}`} className="no-underline">
                                                                <h3 className="truncate font-playfair text-2xl text-greenDark transition group-hover:text-landingPageIcons">
                                                                    {title}
                                                                </h3>
                                                            </Link>
                                                            <p className="mt-1 truncate text-sm italic text-greenMid">
                                                                {latinName}
                                                            </p>
                                                        </div>

                                                        <button
                                                            onClick={() => toggleFavourite(plant.id)}
                                                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff6d8] text-[#d1a11f] transition hover:bg-[#ffe6e3] hover:text-[#c94b41]"
                                                            title="Remove from favourites"
                                                        >
                                                            <Star size={16} fill="currentColor" />
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {plant.care_level && (
                                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${careColor(plant.care_level)}`}>
                                                                {plant.care_level} Care
                                                            </span>
                                                        )}
                                                        {plant.watering && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-[#dbe6cf] bg-white px-3 py-1 text-xs font-semibold text-greenMid">
                                                                <Droplets size={11} />
                                                                {plant.watering}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>

                                {hasMoreFavouritePlants ? (
                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setFavouritesOpen((prev) => !prev)}
                                            className="inline-flex items-center gap-2 rounded-full border border-[#d0dec2] bg-white px-5 py-3 text-sm font-semibold text-greenDark transition hover:bg-[#f5f8ef]"
                                        >
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform duration-200 ${favouritesOpen ? "rotate-180" : ""}`}
                                            />
                                            {favouritesOpen
                                                ? "Show fewer plants"
                                                : `Show ${favPlants.length - PREVIEW_ITEM_COUNT} more plant${favPlants.length - PREVIEW_ITEM_COUNT !== 1 ? "s" : ""}`}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                </AccordionSection>
            </div>
        </div>
    );
}
