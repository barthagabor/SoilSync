import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Camera, MapPin, User, Save, LogOut } from "lucide-react";

export default function ProfilePage() {
    const { user, updateUser, logout } = useAuth();

    // Form state
    const [name, setName] = useState("");
    const [bio, setBio] = useState("");
    const [location, setLocation] = useState("");
    const [imagePreview, setImagePreview] = useState("");

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setBio(user.bio || "");
            setLocation(user.location || "");
            setImagePreview(user.profileImage || "");
        }
    }, [user]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage("");

        try {
            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:5000/profile/update", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    bio,
                    location,
                    profileImage: imagePreview
                }),
            });

            if (res.ok) {
                const data = await res.json();
                updateUser(data.user);
                setMessage("Profile updated successfully!");
                setIsEditing(false);
                setTimeout(() => setMessage(""), 3000);
            } else {
                setMessage("Failed to update profile.");
            }
        } catch (err) {
            console.error(err);
            setMessage("Error connecting to server.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="text-center py-20">Please log in to view your profile.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
                <div className="h-48 bg-gradient-to-r from-emerald-600 to-teal-500 relative">
                    <button
                        onClick={logout}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-full backdrop-blur-sm transition flex items-center gap-2 text-sm font-semibold"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>

                <div className="px-8 pb-8">
                    <div className="relative -mt-20 mb-6 flex justify-between items-end">
                        <div className="relative">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <label className="absolute bottom-2 right-2 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 shadow-md transition">
                                    <Camera size={20} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            )}
                        </div>

                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            disabled={loading}
                            className={`px-6 py-2.5 rounded-xl font-semibold transition shadow-sm flex items-center gap-2 ${
                                isEditing
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            {loading ? "Saving..." : isEditing ? <><Save size={18}/> Save Changes</> : "Edit Profile"}
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-6 p-3 rounded-lg text-center text-sm font-medium ${message.includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                            {message}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full text-2xl font-bold text-gray-800 border-b-2 border-emerald-200 focus:border-emerald-600 outline-none py-1 bg-transparent"
                                />
                            ) : (
                                <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
                            )}
                            <p className="text-emerald-600 font-medium mt-1">{user.role || "Gardener"}</p>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600">
                            <MapPin size={18} className="text-gray-400" />
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Add your location (e.g. London, UK)"
                                    className="border rounded-lg px-3 py-1.5 w-full max-w-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            ) : (
                                <span>{location || "No location set"}</span>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">About Me</label>
                            {isEditing ? (
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    rows="4"
                                    placeholder="Tell us about your garden..."
                                    className="w-full border rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 outline-none resize-none bg-gray-50"
                                />
                            ) : (
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                    {bio || "This user hasn't written a bio yet."}
                                </p>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Email Address</label>
                            <p className="text-gray-700 font-mono bg-gray-50 inline-block px-3 py-1 rounded-md border border-gray-200">
                                {user.email}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}