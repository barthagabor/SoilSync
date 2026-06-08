import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Crown, ImagePlus, Leaf, PlusCircle, Search, ShieldCheck, Sprout, UserCog, Users, X ,Trash2} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { usePageScrollRestoration, useSessionStorageState } from "../hooks/usePagePersistence";
import { buildUrl } from "../services/authService.jsx";

const SYSTEM_ROLE_OPTIONS = [
    { value: "user", label: "User" },
    { value: "admin", label: "Admin" },
    { value: "superadmin", label: "Superadmin" },
];

const PLANT_TYPE_OPTIONS = [
    "Tree",
    "Flower",
    "Succulent",
    "Shrub",
    "Herb",
    "Fern",
    "Vine",
    "Bulb",
    "Fruit",
    "Vegetable",
    "Palm",
    "Cactus",
];

const WATERING_OPTIONS = ["Frequent", "Average", "Minimum", "None"];
const CARE_LEVEL_OPTIONS = ["Low", "Medium", "High"];
const CYCLE_OPTIONS = ["Perennial", "Annual", "Biennial"];
const SUNLIGHT_OPTIONS = ["full sun", "part shade", "part sun/part shade", "full shade"];

const EMPTY_PLANT_FORM = {
    common_name: "",
    scientific_name: "",
    other_name: "",
    family: "",
    genus: "",
    type: "",
    cycle: "",
    watering: "",
    care_level: "",
    sunlight: "",
    origin: "",
    description: "",
    imageUrl: "",
    imageDataUrl: "",
    imageFileName: "",
};

const FIELD_CLASS = "w-full rounded-2xl border border-[#dce7cf] bg-white px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons";

const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read the selected image."));
        reader.readAsDataURL(file);
    });

const rolePill = (value) =>
    value === "superadmin"
        ? "bg-[#fff1d6] text-[#9d6b09]"
        : value === "admin"
            ? "bg-[#e9f6dc] text-[#49661d]"
            : "bg-[#eef3e7] text-greenMid";

const Notice = ({ notice }) =>
    notice.text ? (
        <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                notice.type === "success"
                    ? "border-[#c7e4ba] bg-[#f1faea] text-[#2e6b1f]"
                    : "border-[#f4c9c5] bg-[#fff2f0] text-[#b64035]"
            }`}
        >
            {notice.text}
        </div>
    ) : null;

export default function AdminPage() {
    const { user, isAdmin, isSuperAdmin, updateUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [userNotice, setUserNotice] = useState({ text: "", type: "" });
    const [draftRoles, setDraftRoles] = useState({});
    const [savingUserId, setSavingUserId] = useState(null);
    const [savingSubscriptionUserId, setSavingSubscriptionUserId] = useState(null);
    const [deletingUserId, setDeletingUserId] = useState(null);

    const [plants, setPlants] = useState([]);
    const [plantsLoading, setPlantsLoading] = useState(true);
    const [plantsError, setPlantsError] = useState("");
    const [createPlantNotice, setCreatePlantNotice] = useState({ text: "", type: "" });
    const [plantSearchInput, setPlantSearchInput] = useSessionStorageState("page:admin:plant-search-input", "");
    const [plantSearch, setPlantSearch] = useSessionStorageState("page:admin:plant-search", "");
    const [plantPage, setPlantPage] = useSessionStorageState("page:admin:plant-page", 1);
    const [plantTotal, setPlantTotal] = useState(0);
    const [plantTotalPages, setPlantTotalPages] = useState(1);
    const [plantRefreshKey, setPlantRefreshKey] = useState(0);
    const [createPlantForm, setCreatePlantForm] = useSessionStorageState("page:admin:create-plant-form", () => ({ ...EMPTY_PLANT_FORM }));
    const [creatingPlant, setCreatingPlant] = useState(false);

    usePageScrollRestoration("page:admin", !usersLoading && !plantsLoading);

    useEffect(() => {
        if (!isAdmin) return;
        const loadUsers = async () => {
            try {
                setUsersLoading(true);
                setUsersError("");
                const token = localStorage.getItem("token");
                const res = await fetch(buildUrl("/admin/users"), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || "Failed to load admin users.");
                setUsers(data.users || []);
                setDraftRoles(Object.fromEntries((data.users || []).map((entry) => [entry._id, entry.systemRole])));
            } catch (err) {
                console.error("Failed to load admin users:", err);
                setUsersError(err.message || "Failed to load admin users.");
            } finally {
                setUsersLoading(false);
            }
        };
        loadUsers();
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        const loadPlants = async () => {
            try {
                setPlantsLoading(true);
                setPlantsError("");
                const token = localStorage.getItem("token");
                const params = new URLSearchParams({ page: String(plantPage), limit: "12" });
                if (plantSearch) params.set("search", plantSearch);
                const res = await fetch(`${buildUrl("/admin/plants")}?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.message || "Failed to load plants.");
                setPlants(data.data || []);
                setPlantTotal(data.total || 0);
                setPlantTotalPages(Math.max(1, data.totalPages || 1));
            } catch (err) {
                console.error("Failed to load admin plants:", err);
                setPlantsError(err.message || "Failed to load plants.");
            } finally {
                setPlantsLoading(false);
            }
        };
        loadPlants();
    }, [isAdmin, plantPage, plantSearch, plantRefreshKey]);

    const counts = useMemo(
        () => ({
            total: users.length,
            admins: users.filter((entry) => entry.systemRole === "admin").length,
            superadmins: users.filter((entry) => entry.systemRole === "superadmin").length,
            premium: users.filter((entry) => entry.subscriptionPlan === "premium" && entry.premiumStatus === "active").length,
        }),
        [users]
    );
    const createPlantPreview = createPlantForm.imageUrl.trim() || createPlantForm.imageDataUrl;

    const handleRoleSave = async (targetUserId) => {
        try {
            setSavingUserId(targetUserId);
            setUserNotice({ text: "", type: "" });
            const token = localStorage.getItem("token");
            const res = await fetch(buildUrl(`/admin/users/${targetUserId}/system-role`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ systemRole: draftRoles[targetUserId] }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to update role.");
            setUsers((prev) => prev.map((entry) => (entry._id === targetUserId ? { ...entry, systemRole: draftRoles[targetUserId] } : entry)));
            setUserNotice({ text: "System role updated successfully.", type: "success" });
        } catch (err) {
            console.error("Failed to update system role:", err);
            setUserNotice({ text: err.message || "Failed to update role.", type: "error" });
        } finally {
            setSavingUserId(null);
        }
    };

    const handleSubscriptionToggle = async (targetUserId, enablePremium) => {
        try {
            setSavingSubscriptionUserId(targetUserId);
            setUserNotice({ text: "", type: "" });
            const token = localStorage.getItem("token");
            const res = await fetch(buildUrl(`/admin/users/${targetUserId}/subscription`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    subscriptionPlan: enablePremium ? "premium" : "free",
                    premiumStatus: enablePremium ? "active" : "inactive",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to update premium access.");

            setUsers((prev) =>
                prev.map((entry) =>
                    entry._id === targetUserId
                        ? {
                              ...entry,
                              subscriptionPlan: data.user?.subscriptionPlan || (enablePremium ? "premium" : "free"),
                              premiumStatus: data.user?.premiumStatus || (enablePremium ? "active" : "inactive"),
                              premiumActivatedAt: data.user?.premiumActivatedAt || null,
                              premiumExpiresAt: data.user?.premiumExpiresAt || null,
                          }
                        : entry
                )
            );
            if (String(user?._id) === String(targetUserId)) {
                updateUser({
                    subscriptionPlan: data.user?.subscriptionPlan || (enablePremium ? "premium" : "free"),
                    premiumStatus: data.user?.premiumStatus || (enablePremium ? "active" : "inactive"),
                    premiumActivatedAt: data.user?.premiumActivatedAt || null,
                    premiumExpiresAt: data.user?.premiumExpiresAt || null,
                });
            }
            setUserNotice({
                text: enablePremium ? "Premium access enabled successfully." : "Premium access removed successfully.",
                type: "success",
            });
        } catch (err) {
            console.error("Failed to update premium access:", err);
            setUserNotice({ text: err.message || "Failed to update premium access.", type: "error" });
        } finally {
            setSavingSubscriptionUserId(null);
        }
    };
    const handleDeleteUser = async (targetUser) => {
        const confirmed = window.confirm(
            `Delete ${targetUser.name || targetUser.email}? This will remove the account, favourites, saved gardens, community posts, comments, likes, and saved community references.`
        );

        if (!confirmed) return;

        try {
            setDeletingUserId(targetUser._id);
            setUserNotice({ text: "", type: "" });

            const token = localStorage.getItem("token");

            const res = await fetch(buildUrl(`/admin/users/${targetUser._id}`), {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.message || "Failed to delete user.");
            }

            setUsers((prev) => prev.filter((entry) => entry._id !== targetUser._id));

            setDraftRoles((prev) => {
                const next = { ...prev };
                delete next[targetUser._id];
                return next;
            });

            setUserNotice({
                text: data.message || "User deleted successfully.",
                type: "success",
            });
        } catch (error) {
            console.error("Failed to delete user:", error);
            setUserNotice({
                text: error.message || "Failed to delete user.",
                type: "error",
            });
        } finally {
            setDeletingUserId(null);
        }
    };
    const updateCreatePlantField = (key, value) => {
        setCreatePlantNotice({ text: "", type: "" });
        setCreatePlantForm((prev) => ({ ...prev, [key]: value }));
    };

    const clearCreatePlantImage = () => {
        setCreatePlantForm((prev) => ({
            ...prev,
            imageUrl: "",
            imageDataUrl: "",
            imageFileName: "",
        }));
    };

    const handleCreatePlantImageChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imageDataUrl = await readFileAsDataUrl(file);
            setCreatePlantNotice({ text: "", type: "" });
            setCreatePlantForm((prev) => ({
                ...prev,
                imageDataUrl,
                imageFileName: file.name,
            }));
        } catch (err) {
            console.error("Failed to prepare plant image:", err);
            setCreatePlantNotice({ text: err.message || "Failed to prepare the selected image.", type: "error" });
        } finally {
            event.target.value = "";
        }
    };

    const handleCreatePlant = async (event) => {
        event.preventDefault();

        try {
            setCreatingPlant(true);
            setCreatePlantNotice({ text: "", type: "" });

            const token = localStorage.getItem("token");
            const payload = {
                common_name: createPlantForm.common_name,
                scientific_name: createPlantForm.scientific_name,
                other_name: createPlantForm.other_name,
                family: createPlantForm.family,
                genus: createPlantForm.genus,
                type: createPlantForm.type,
                cycle: createPlantForm.cycle,
                watering: createPlantForm.watering,
                care_level: createPlantForm.care_level,
                sunlight: createPlantForm.sunlight,
                origin: createPlantForm.origin,
                description: createPlantForm.description,
                imageUrl: createPlantForm.imageUrl,
                imageDataUrl: createPlantForm.imageDataUrl,
            };

            const res = await fetch(buildUrl("/admin/plants"), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || "Failed to create plant.");

            const createdPlantName = data?.plant?.common_name || createPlantForm.common_name.trim();

            setCreatePlantNotice({
                text: `${createdPlantName} was added successfully.`,
                type: "success",
            });
            setCreatePlantForm({ ...EMPTY_PLANT_FORM });
            setPlantPage(1);
            setPlantSearchInput(createdPlantName);
            setPlantSearch(createdPlantName);
            setPlantRefreshKey((prev) => prev + 1);
        } catch (err) {
            console.error("Failed to create plant:", err);
            setCreatePlantNotice({ text: err.message || "Failed to create plant.", type: "error" });
        } finally {
            setCreatingPlant(false);
        }
    };

    if (!user) return <Navigate to="/login" replace />;

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-greenLight px-4 pb-12 pt-28 font-dm">
                <Navbar />
                <div className="mx-auto max-w-3xl rounded-[32px] border border-white/70 bg-white/88 p-10 text-center shadow-[0_24px_70px_rgba(52,78,24,0.12)]">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4e5] text-landingPageIcons"><ShieldCheck size={26} /></div>
                    <h1 className="font-playfair text-4xl text-greenDark">Admin Access Required</h1>
                    <p className="mt-4 text-greenMid">This page is only available to users with admin or superadmin access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(228,237,216,0.96)_36%,_rgba(205,219,188,0.98)_100%)] px-4 pb-12 pt-28 font-dm">
            <Navbar />
            <div className="mx-auto max-w-7xl space-y-8">
                <section className="rounded-[34px] border border-white/70 bg-white/88 p-8 shadow-[0_28px_90px_rgba(52,78,24,0.14)] backdrop-blur-sm md:p-10">
                    <div className="flex flex-wrap items-start justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe6cf] bg-[#eef4e5] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons"><ShieldCheck size={13} />Admin Panel</div>
                            <h1 className="mt-4 font-playfair text-4xl text-greenDark">Admin Management</h1>
                            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-greenMid">Manage elevated roles and review the imported plant catalog from one place.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                            <StatCard label="Users" value={counts.total} />
                            <StatCard label="Admins" value={counts.admins} />
                            <StatCard label="Superadmins" value={counts.superadmins} />
                            <StatCard label="Premium" value={counts.premium} />
                        </div>
                    </div>
                    <div className="mt-6"><Notice notice={userNotice} /></div>
                </section>

                <section className="rounded-[32px] border border-white/70 bg-white/88 p-7 shadow-[0_24px_70px_rgba(52,78,24,0.12)] backdrop-blur-sm md:p-9">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <SectionHeader icon={PlusCircle} badge="Plant Upload" title="Add New Plant" />
                            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-greenMid">
                                Create a plant manually and it will be available in the library, detail page, and admin review list right away.
                            </p>
                        </div>
                        <div className="rounded-full border border-[#dbe6cf] bg-[#f8fbf3] px-4 py-2 text-xs font-semibold text-greenMid">
                            IDs are generated automatically
                        </div>
                    </div>

                    <div className="mt-6">
                        <Notice notice={createPlantNotice} />
                    </div>

                    <form onSubmit={handleCreatePlant} className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block sm:col-span-1">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Common Name</span>
                                <input
                                    type="text"
                                    required
                                    value={createPlantForm.common_name}
                                    onChange={(e) => updateCreatePlantField("common_name", e.target.value)}
                                    placeholder="Lavender"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <label className="block sm:col-span-1">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Scientific Name</span>
                                <input
                                    type="text"
                                    required
                                    value={createPlantForm.scientific_name}
                                    onChange={(e) => updateCreatePlantField("scientific_name", e.target.value)}
                                    placeholder="Lavandula angustifolia"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <label className="block sm:col-span-2">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Other Names</span>
                                <input
                                    type="text"
                                    value={createPlantForm.other_name}
                                    onChange={(e) => updateCreatePlantField("other_name", e.target.value)}
                                    placeholder="English lavender, true lavender"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Family</span>
                                <input
                                    type="text"
                                    value={createPlantForm.family}
                                    onChange={(e) => updateCreatePlantField("family", e.target.value)}
                                    placeholder="Lamiaceae"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Genus</span>
                                <input
                                    type="text"
                                    value={createPlantForm.genus}
                                    onChange={(e) => updateCreatePlantField("genus", e.target.value)}
                                    placeholder="Lavandula"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Type</span>
                                <select
                                    value={createPlantForm.type}
                                    onChange={(e) => updateCreatePlantField("type", e.target.value)}
                                    className={FIELD_CLASS}
                                >
                                    <option value="">Select type</option>
                                    {PLANT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Cycle</span>
                                <select
                                    value={createPlantForm.cycle}
                                    onChange={(e) => updateCreatePlantField("cycle", e.target.value)}
                                    className={FIELD_CLASS}
                                >
                                    <option value="">Select cycle</option>
                                    {CYCLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Watering</span>
                                <select
                                    value={createPlantForm.watering}
                                    onChange={(e) => updateCreatePlantField("watering", e.target.value)}
                                    className={FIELD_CLASS}
                                >
                                    <option value="">Select watering</option>
                                    {WATERING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Care Level</span>
                                <select
                                    value={createPlantForm.care_level}
                                    onChange={(e) => updateCreatePlantField("care_level", e.target.value)}
                                    className={FIELD_CLASS}
                                >
                                    <option value="">Select care level</option>
                                    {CARE_LEVEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Sunlight</span>
                                <select
                                    value={createPlantForm.sunlight}
                                    onChange={(e) => updateCreatePlantField("sunlight", e.target.value)}
                                    className={FIELD_CLASS}
                                >
                                    <option value="">Select sunlight</option>
                                    {SUNLIGHT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Origin</span>
                                <input
                                    type="text"
                                    value={createPlantForm.origin}
                                    onChange={(e) => updateCreatePlantField("origin", e.target.value)}
                                    placeholder="France, Europe"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <label className="block sm:col-span-2">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Description</span>
                                <textarea
                                    rows={5}
                                    value={createPlantForm.description}
                                    onChange={(e) => updateCreatePlantField("description", e.target.value)}
                                    placeholder="Short care or appearance note for the plant details page."
                                    className={`${FIELD_CLASS} resize-none`}
                                />
                            </label>
                        </div>

                        <div className="rounded-[26px] border border-[#dbe6cf] bg-[#fbfcf8] p-5">
                            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-greenMid">
                                <ImagePlus size={14} />
                                Plant Image
                            </div>

                            <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-[#d5e1c8] bg-white">
                                {createPlantPreview ? (
                                    <img
                                        src={createPlantPreview}
                                        alt={createPlantForm.common_name || "Plant preview"}
                                        className="h-full max-h-[320px] w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center text-greenMid">
                                        <Leaf size={28} className="text-landingPageIcons" />
                                        <p className="text-sm font-medium text-greenDark">Add an image URL or choose a local image file.</p>
                                        <p className="text-xs leading-6">For a quick admin workflow, local uploads are stored as image data and URL inputs work too.</p>
                                    </div>
                                )}
                            </div>

                            <label className="mt-4 block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-greenMid">Image URL</span>
                                <input
                                    type="url"
                                    value={createPlantForm.imageUrl}
                                    onChange={(e) => updateCreatePlantField("imageUrl", e.target.value)}
                                    placeholder="https://example.com/plant.jpg"
                                    className={FIELD_CLASS}
                                />
                            </label>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons">
                                    <ImagePlus size={15} />
                                    Choose File
                                    <input type="file" accept="image/*" className="hidden" onChange={handleCreatePlantImageChange} />
                                </label>

                                {createPlantPreview ? (
                                    <button
                                        type="button"
                                        onClick={clearCreatePlantImage}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-[#dce7cf] bg-white px-4 py-3 text-sm font-semibold text-greenDark transition hover:border-[#bfd1aa]"
                                    >
                                        <X size={15} />
                                        Remove Image
                                    </button>
                                ) : null}
                            </div>

                            {createPlantForm.imageFileName ? (
                                <p className="mt-3 text-xs font-medium text-greenMid">Selected file: {createPlantForm.imageFileName}</p>
                            ) : null}

                            <div className="mt-6 rounded-[22px] border border-[#dbe6cf] bg-white p-4 text-sm text-greenMid">
                                New plants are saved directly into the same Mongo collection used by the library.
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 xl:col-span-2">
                            <button
                                type="submit"
                                disabled={creatingPlant}
                                className="inline-flex items-center gap-2 rounded-2xl bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <PlusCircle size={16} />
                                {creatingPlant ? "Creating..." : "Create Plant"}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setCreatePlantForm({ ...EMPTY_PLANT_FORM });
                                    setCreatePlantNotice({ text: "", type: "" });
                                }}
                                className="rounded-2xl border border-[#dce7cf] bg-white px-5 py-3 text-sm font-semibold text-greenDark transition hover:border-[#bfd1aa]"
                            >
                                Reset Form
                            </button>
                        </div>
                    </form>
                </section>

                <section className="rounded-[32px] border border-white/70 bg-white/88 p-7 shadow-[0_24px_70px_rgba(52,78,24,0.12)] backdrop-blur-sm md:p-9">
                    <SectionHeader icon={Users} badge="Accounts" title="Registered Users" />
                    {usersLoading ? (
                        <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-36 animate-skeleton rounded-[24px] bg-[#edf4e3]" />)}</div>
                    ) : usersError ? (
                        <ErrorBox text={usersError} />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {users.map((entry) => (
                                <article key={entry._id} className="rounded-[26px] border border-[#dbe6cf] bg-[#fbfcf8] p-5 shadow-[0_12px_40px_rgba(63,98,15,0.08)]">
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="truncate font-playfair text-2xl text-greenDark">{entry.name || "Unnamed User"}</h3>
                                            <p className="mt-1 truncate text-sm text-greenMid">{entry.email}</p>
                                        </div>
                                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rolePill(entry.systemRole)}`}>{entry.systemRole}</span>
                                    </div>
                                    <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-greenMid">
                                        <Chip>{entry.verified ? "Verified" : "Unverified"}</Chip>
                                        <Chip>{entry.role || "Gardener"}</Chip>
                                        {entry.location ? <Chip>{entry.location}</Chip> : null}
                                        <Chip>{entry.subscriptionPlan === "premium" && entry.premiumStatus === "active" ? "Premium Active" : "Free Plan"}</Chip>
                                    </div>
                                    <div className="mb-5 grid gap-3 sm:grid-cols-2">
                                        <MiniStat label="Favourites" value={entry.favouritesCount} />
                                        <MiniStat label="Saved Gardens" value={entry.savedGardensCount} />
                                    </div>
                                    {isSuperAdmin ? (
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="relative min-w-[180px] flex-1">
                                                    <UserCog size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-greenMid" />
                                                    <select
                                                        value={draftRoles[entry._id] || entry.systemRole}
                                                        onChange={(e) => setDraftRoles((prev) => ({ ...prev, [entry._id]: e.target.value }))}
                                                        className="w-full rounded-2xl border border-[#dce7cf] bg-white py-3 pl-11 pr-4 text-sm text-greenDark outline-none transition focus:border-landingPageIcons"
                                                    >
                                                        {SYSTEM_ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => handleRoleSave(entry._id)}
                                                    disabled={savingUserId === entry._id || draftRoles[entry._id] === entry.systemRole}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {savingUserId === entry._id ? "Saving..." : "Update Role"}
                                                </button>

                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleSubscriptionToggle(
                                                        entry._id,
                                                        !(entry.subscriptionPlan === "premium" && entry.premiumStatus === "active")
                                                    )
                                                }
                                                disabled={savingSubscriptionUserId === entry._id}
                                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                    entry.subscriptionPlan === "premium" && entry.premiumStatus === "active"
                                                        ? "bg-[#fff4cc] text-[#7b5f0e] hover:bg-[#ffedaf]"
                                                        : "bg-[#edf4e3] text-landingPageIcons hover:bg-[#e4eed6]"
                                                }`}
                                            >
                                                <Crown size={15} />
                                                {savingSubscriptionUserId === entry._id
                                                    ? "Saving..."
                                                    : entry.subscriptionPlan === "premium" && entry.premiumStatus === "active"
                                                        ? "Disable Premium"
                                                        : "Enable Premium"}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(entry)}
                                                disabled={
                                                    deletingUserId === entry._id ||
                                                    String(user?._id) === String(entry._id) ||
                                                    entry.systemRole === "superadmin"
                                                }
                                                className="inline-flex items-center gap-2 rounded-2xl bg-[#fff2f0] px-4 py-3 text-sm font-semibold text-[#b64035] transition hover:bg-[#ffe4e0] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <Trash2 size={15} />
                                                {deletingUserId === entry._id ? "Deleting..." : "Delete User"}
                                            </button>
                                        </div>
                                    ) : <div className="rounded-2xl border border-[#dbe6cf] bg-white px-4 py-3 text-sm text-greenMid">Only a superadmin can change roles.</div>}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-[32px] border border-white/70 bg-white/88 p-7 shadow-[0_24px_70px_rgba(52,78,24,0.12)] backdrop-blur-sm md:p-9">
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <SectionHeader icon={Sprout} badge="Plant Catalog" title="Plant Catalog Review" />
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-greenMid">Search the imported database and review the imported records in a cleaner read-only list.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-1">
                            <StatCard label="Results" value={plantTotal} />
                        </div>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setPlantPage(1);
                            setPlantSearch(plantSearchInput.trim());
                        }}
                        className="mt-6 flex flex-col gap-3 rounded-[26px] border border-[#dbe6cf] bg-[#fbfcf8] p-4 md:flex-row md:items-center"
                    >
                        <div className="relative flex-1">
                            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-greenMid" />
                            <input
                                type="text"
                                value={plantSearchInput}
                                onChange={(e) => setPlantSearchInput(e.target.value)}
                                placeholder="Search by common name, scientific name, genus, or family"
                                className="w-full rounded-2xl border border-[#dce7cf] bg-white py-3 pl-11 pr-4 text-sm text-greenDark outline-none transition focus:border-landingPageIcons"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="rounded-2xl bg-landingPageIcons px-5 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons">Search</button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPlantSearchInput("");
                                    setPlantSearch("");
                                    setPlantPage(1);
                                }}
                                className="rounded-2xl border border-[#dce7cf] bg-white px-5 py-3 text-sm font-semibold text-greenDark transition hover:border-[#bfd1aa]"
                            >
                                Clear
                            </button>
                        </div>
                    </form>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-greenMid">
                        <Chip>Page {plantPage} / {plantTotalPages}</Chip>
                        {plantSearch ? <Chip>Search: {plantSearch}</Chip> : null}
                    </div>

                    {plantsLoading ? (
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-56 animate-skeleton rounded-[24px] bg-[#edf4e3]" />)}</div>
                    ) : plantsError ? (
                        <div className="mt-6"><ErrorBox text={plantsError} /></div>
                    ) : plants.length === 0 ? (
                        <div className="mt-6 rounded-[24px] border border-[#dbe6cf] bg-[#fbfcf8] p-6 text-sm text-greenMid">No plants matched this search yet.</div>
                    ) : (
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {plants.map((plant) => {
                                const commonName = plant.common_name || plant.scientific_name?.[0] || `Plant #${plant.id}`;
                                const scientificLabel = Array.isArray(plant.scientific_name) ? plant.scientific_name.join(", ") : "";
                                const imageSrc = plant.default_image?.regular_url || plant.default_image?.original_url || plant.default_image?.medium_url || plant.default_image?.small_url || plant.default_image?.thumbnail || "";
                                return (
                                    <article key={plant.id} className="overflow-hidden rounded-[26px] border border-[#dbe6cf] bg-[#fbfcf8] shadow-[0_12px_40px_rgba(63,98,15,0.08)]">
                                        <div className="grid h-full md:grid-cols-[200px,1fr]">
                                            <div className="relative min-h-[200px] bg-[#edf4e3]">
                                                {imageSrc ? <img src={imageSrc} alt={commonName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-greenMid"><Leaf size={28} /></div>}
                                            </div>
                                            <div className="p-5">
                                                <div className="min-w-0">
                                                    <div className="min-w-0">
                                                        <h3 className="font-playfair text-2xl text-greenDark">{commonName}</h3>
                                                        <p className="mt-1 text-sm italic text-greenMid">{scientificLabel || "No scientific name"}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-greenMid">
                                                    <Chip>ID {plant.id}</Chip>
                                                    {plant.details?.type ? <Chip>{plant.details.type}</Chip> : null}
                                                    {plant.details?.cycle ? <Chip>{plant.details.cycle}</Chip> : null}
                                                    {plant.details?.watering ? <Chip>{plant.details.watering}</Chip> : null}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-greenMid">Showing page {plantPage} of {plantTotalPages}.</div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setPlantPage((prev) => Math.max(1, prev - 1))} disabled={plantPage <= 1 || plantsLoading} className="rounded-2xl border border-[#dce7cf] bg-white px-4 py-2 text-sm font-semibold text-greenDark transition hover:border-[#bfd1aa] disabled:cursor-not-allowed disabled:opacity-60">Previous</button>
                            <button type="button" onClick={() => setPlantPage((prev) => Math.min(plantTotalPages, prev + 1))} disabled={plantPage >= plantTotalPages || plantsLoading} className="rounded-2xl bg-landingPageIcons px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons disabled:cursor-not-allowed disabled:opacity-60">Next</button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function SectionHeader({ icon: Icon, badge, title }) {
    return (
        <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4e5] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-landingPageIcons"><Icon size={13} />{badge}</div>
            <h2 className="mt-4 font-playfair text-3xl text-greenDark">{title}</h2>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-[24px] border border-[#dbe6cf] bg-[#f8fbf3] p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid">{label}</div>
            <div className="mt-2 font-playfair text-4xl text-greenDark">{value}</div>
        </div>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-[20px] border border-[#dbe6cf] bg-white p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-greenMid">{label}</div>
            <div className="mt-2 text-2xl font-playfair text-greenDark">{value}</div>
        </div>
    );
}

function Chip({ children }) {
    return <span className="rounded-full border border-[#dbe6cf] bg-white px-3 py-1">{children}</span>;
}

function ErrorBox({ text }) {
    return <div className="rounded-[24px] border border-[#f4c9c5] bg-[#fff2f0] p-5 text-sm font-medium text-[#b64035]">{text}</div>;
}
