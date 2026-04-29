import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    Droplets,
    Sun,
    Scissors,
    Sprout,
    Globe,
    ShieldCheck,
    AlertTriangle,
    Leaf,
    ArrowLeft,
    Droplet
} from "lucide-react";


const WateringLevel = ({ value }) => {
    let level = 1;
    const v = value?.toLowerCase() || "";

    if (v.includes("frequent")) level = 3;
    else if (v.includes("average")) level = 2;
    else if (v.includes("minimum")) level = 1;
    else if (v.includes("none")) level = 0;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                    <Droplet
                        key={i}
                        size={20}
                        className={`transition-colors duration-300 ${
                            i <= level
                                ? "fill-blue-500 text-blue-500 drop-shadow-sm"
                                : "text-gray-300 fill-gray-100"
                        }`}
                    />
                ))}
            </div>
            <span className="text-sm font-medium text-gray-600 capitalize">
                {value || "Unknown"}
            </span>
        </div>
    );
};

// ☀️ Napsütés megjelenítő (3 nap skála)
const SunlightLevel = ({ values }) => {
    let level = 1;
    const safeValues = values || [];
    const joined = safeValues.join(" ").toLowerCase();

    // Egyszerű logika: Ha bírja a teljes napot -> 3, ha csak félárnyék -> 2, árnyék -> 1
    if (joined.includes("full sun")) {
        level = 3;
    } else if (joined.includes("part") || joined.includes("semishade")) {
        level = 2;
    } else {
        level = 1;
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                    <Sun
                        key={i}
                        size={20}
                        className={`transition-colors duration-300 ${
                            i <= level
                                ? "fill-amber-400 text-amber-500 drop-shadow-sm"
                                : "text-gray-300 fill-gray-100"
                        }`}
                    />
                ))}
            </div>
            <span className="text-sm font-medium text-gray-600 capitalize">
                {safeValues.length > 0 ? safeValues.join(", ") : "Unknown"}
            </span>
        </div>
    );
};

// -------------------------------------------

export default function PlantDetails() {
    const { id } = useParams();
    const [plant, setPlant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [careGuides, setCareGuides] = useState([]);
    const [careLoading, setCareLoading] = useState(true);

    useEffect(() => {
        async function fetchPlant() {
            try {
                setLoading(true);
                setError("");

                const res = await fetch(`http://localhost:5000/plants/${id}`);
                if (!res.ok) throw new Error("Plant not found");
                const data = await res.json();
                setPlant(data);
            } catch (err) {
                console.error("❌ Error fetching plant details:", err);
                setError(err.message || "Error while fetching plant details.");
            } finally {
                setLoading(false);
            }
        }

        async function fetchCareGuides() {
            try {
                setCareLoading(true);
                const res = await fetch(`http://localhost:5000/plants/${id}/guides`);
                if(res.ok){
                    const data = await res.json();
                    if (data?.data?.length > 0) {
                        setCareGuides(data.data[0].section || []);
                    } else {
                        setCareGuides([]);
                    }
                }
            } catch (err) {
                // Nem kritikus hiba, ha nincs guide
                console.warn("⚠️ Error fetching care guides or no guides available.");
            } finally {
                setCareLoading(false);
            }
        }

        fetchPlant();
        fetchCareGuides();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    if (error || !plant) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-10 text-center">
                <p className="text-red-600 mb-4 text-lg font-semibold">{error || "Plant not found."}</p>
                <Link
                    to="/plants"
                    className="inline-block px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                    Back to Plant Library
                </Link>
            </div>
        );
    }

    const imageUrl =
        plant?.default_image?.regular_url ||
        plant?.default_image?.medium_url ||
        plant?.default_image?.small_url ||
        "https://via.placeholder.com/800x800?text=No+Image";

    const latinName = Array.isArray(plant.scientific_name)
        ? plant.scientific_name.join(", ")
        : plant.scientific_name;

    const commonName = plant.common_name || latinName || "Unknown plant";

    const details = plant.details || {};

    return (
        <div className="min-h-screen bg-gray-50 pb-12">

            {/* Felső sáv (Breadcrumb) */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <Link
                        to="/plants"
                        className="inline-flex items-center text-emerald-700 hover:text-emerald-900 font-medium transition"
                    >
                        <ArrowLeft size={18} className="mr-2" /> Back to Library
                    </Link>
                </div>
            </div>

            {/* Fő tartalom */}
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* --- HEADER DESIGN (Split View) --- */}
                <div className="flex flex-col md:flex-row gap-8 mb-12 items-start">

                    {/* Bal oldal: Kép (Kiemelt, nem vágott) */}
                    <div className="w-full md:w-5/12 lg:w-4/12 flex-shrink-0">
                        <div className="relative rounded-2xl overflow-hidden shadow-xl bg-white aspect-[4/3] md:aspect-[3/4]">
                            <img
                                src={imageUrl}
                                alt={commonName}
                                className="w-full h-full object-cover md:object-center transition-transform duration-700 hover:scale-105"
                            />
                        </div>
                    </div>

                    {/* Jobb oldal: Cím és Alapadatok */}
                    <div className="w-full md:w-7/12 lg:w-8/12 pt-2 md:pt-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-emerald-950 leading-tight mb-2">
                            {commonName}
                        </h1>
                        <p className="text-xl text-emerald-600 italic font-serif mb-6 border-b border-emerald-100 pb-4 inline-block">
                            {latinName}
                        </p>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-3 mb-8">
                            {plant.type && (
                                <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold border border-emerald-200 uppercase tracking-wide">
                                    {plant.type}
                                </span>
                            )}
                            {plant.cycle && (
                                <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold border border-emerald-200 uppercase tracking-wide">
                                    {plant.cycle}
                                </span>
                            )}
                            {plant.medicinal && (
                                <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold border border-blue-200 flex items-center gap-1.5">
                                    <ShieldCheck size={16} /> Medicinal
                                </span>
                            )}
                            {plant.poisonous_to_pets && (
                                <span className="px-4 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-semibold border border-red-200 flex items-center gap-1.5">
                                    <AlertTriangle size={16} /> Toxic to Pets
                                 </span>
                            )}
                        </div>

                        {/* Leírás */}
                        {details.description && (
                            <div className="prose prose-emerald text-gray-600 leading-relaxed">
                                <p className="line-clamp-6 md:line-clamp-none">
                                    {details.description}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- RÉSZLETES ADATOK GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Care Info */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Care Requirements Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Watering (VISUAL) */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-400 hover:shadow-md transition">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600">
                                        <Droplets size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-lg">Watering</h3>
                                </div>
                                {/* Use Visual Component */}
                                <WateringLevel value={details.watering} />
                            </div>

                            {/* Sunlight (VISUAL) */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-yellow-400 hover:shadow-md transition">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-yellow-100 p-2.5 rounded-xl text-yellow-600">
                                        <Sun size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-lg">Sunlight</h3>
                                </div>
                                {/* Use Visual Component */}
                                <SunlightLevel values={details.sunlight} />
                            </div>

                            {/* Pruning */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-400 hover:shadow-md transition">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600">
                                        <Scissors size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-lg">Pruning</h3>
                                </div>
                                <p className="text-gray-600 font-medium">
                                    {details.pruning_month && details.pruning_month.length > 0
                                        ? `Best time: ${details.pruning_month.join(", ")}`
                                        : "No specific pruning time."}
                                </p>
                            </div>

                            {/* Propagation */}
                            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-emerald-400 hover:shadow-md transition">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
                                        <Sprout size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-lg">Propagation</h3>
                                </div>
                                <p className="text-gray-600 font-medium">
                                    {details.propagation && details.propagation.length > 0
                                        ? details.propagation.join(", ")
                                        : "Unknown method"}
                                </p>
                            </div>
                        </div>

                        {/* Additional Guides (Perenual) */}
                        {careGuides.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 border border-emerald-100">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <Leaf className="text-emerald-500" /> Detailed Care Guide
                                </h2>
                                <div className="space-y-6">
                                    {careGuides.map((guide, idx) => (
                                        <div key={idx} className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100/50">
                                            <h4 className="font-bold text-emerald-800 capitalize mb-2 text-lg">
                                                {guide.type}
                                            </h4>
                                            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                                                {guide.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Side Info */}
                    <div className="space-y-6">

                        {/* Classification Box */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">Taxonomy</h3>
                            <ul className="space-y-4 text-sm">
                                <li className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Family</span>
                                    <span className="font-semibold text-emerald-900 text-right bg-emerald-50 px-2 py-1 rounded">{plant.family || "—"}</span>
                                </li>
                                <li className="flex justify-between items-center">
                                    <span className="text-gray-500 font-medium">Genus</span>
                                    <span className="font-semibold text-emerald-900 text-right bg-emerald-50 px-2 py-1 rounded">{plant.genus || "—"}</span>
                                </li>
                                {plant.species_epithet && (
                                    <li className="flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Species</span>
                                        <span className="font-semibold text-gray-800 text-right">{plant.species_epithet}</span>
                                    </li>
                                )}
                                {plant.cultivar && (
                                    <li className="flex justify-between items-center">
                                        <span className="text-gray-500 font-medium">Cultivar</span>
                                        <span className="font-semibold text-gray-800 text-right">{plant.cultivar}</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Growing Specifications */}
                        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-3">Characteristics</h3>
                            <ul className="space-y-5 text-sm">
                                {details.growth_rate && (
                                    <li>
                                        <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Growth Rate</span>
                                        <span className="text-gray-800 text-base font-medium">{details.growth_rate}</span>
                                    </li>
                                )}
                                {details.care_level && (
                                    <li>
                                        <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Care Level</span>
                                        <span className={`text-base font-semibold px-2 py-0.5 rounded inline-block ${
                                            details.care_level === 'High' ? 'bg-red-50 text-red-600' :
                                                details.care_level === 'Medium' ? 'bg-yellow-50 text-yellow-600' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            {details.care_level}
                                        </span>
                                    </li>
                                )}
                                {details.soil && details.soil.length > 0 && (
                                    <li>
                                        <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Soil Type</span>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {details.soil.map((s, i) => (
                                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                )}
                                {details.hardiness && (
                                    <li>
                                        <span className="block text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Hardiness Zone</span>
                                        <span className="text-gray-800 text-base font-medium">
                                            Min: {details.hardiness.min} — Max: {details.hardiness.max}
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* Origin */}
                        {details.origin && details.origin.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Globe size={18} className="text-emerald-600" /> Origin
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {details.origin.map((place, i) => (
                                        <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                                            {place}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Technical Details */}
                        <div className="p-4 rounded-xl bg-gray-50 text-xs text-gray-400 border border-gray-100 text-center">
                            <p>DB ID: {plant._id}</p>
                            <p>Perenual ID: {plant.id}</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}