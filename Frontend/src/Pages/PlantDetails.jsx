import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

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
                const data = await res.json();
                if (data?.data?.length > 0) {
                    setCareGuides(data.data[0].section || []);
                } else {
                    setCareGuides([]);
                }
            } catch (err) {
                console.error("❌ Error fetching care guides:", err);
            } finally {
                setCareLoading(false);
            }
        }

        fetchPlant();
        fetchCareGuides();
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-10">
                <p className="text-center text-emerald-700 text-lg">
                    Loading plant details...
                </p>
            </div>
        );
    }

    if (error || !plant) {
        return (
            <div className="max-w-5xl mx-auto px-4 py-10">
                <p className="text-center text-red-600 mb-4">
                    {error || "Plant not found."}
                </p>
                <div className="text-center">
                    <Link
                        to="/plants"
                        className="inline-block px-4 py-2 rounded-lg bg-landingPageIcons text-white hover:bg-darkLandingPageIcons transition"
                    >
                        Back to Plant Library
                    </Link>
                </div>
            </div>
        );
    }

    const imageUrl =
        plant?.default_image?.regular_url ||
        plant?.default_image?.medium_url ||
        plant?.default_image?.small_url ||
        "https://via.placeholder.com/1200x600?text=No+Image";

    const latinName = Array.isArray(plant.scientific_name)
        ? plant.scientific_name.join(", ")
        : plant.scientific_name;

    const commonName = plant.common_name || latinName || "Unknown plant";

    const otherNames = Array.isArray(plant.other_name)
        ? plant.other_name
        : plant.other_name ? [plant.other_name] : [];

    return (
        <div className="min-h-screen bg-emerald-50">
            <div className="max-w-5xl mx-auto pb-12">

                {/* Back link */}
                <div className="px-4 pt-6">
                    <Link
                        to="/plants"
                        className="inline-flex items-center text-sm text-emerald-700 hover:text-emerald-900"
                    >
                        ← Back to Plant Library
                    </Link>
                </div>

                {/* Hero */}
                <div className="mt-4 mx-4 md:mx-0 bg-white rounded-3xl shadow-md overflow-hidden">
                    <div className="relative h-64 md:h-80 lg:h-96">
                        <img src={imageUrl} alt={commonName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 text-white">
                            <h1 className="text-2xl md:text-3xl font-bold drop-shadow">{commonName}</h1>
                            {latinName && (
                                <p className="italic text-sm md:text-base opacity-90">{latinName}</p>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 md:p-6 lg:p-8">

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Left Side */}
                            <div className="md:col-span-2 space-y-4">

                                {/* Basic info */}
                                <div>
                                    <h2 className="text-lg font-semibold text-emerald-800 mb-2">
                                        Basic information
                                    </h2>

                                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2 text-sm md:text-base">

                                        {plant.family && <p><strong>Family:</strong> {plant.family}</p>}
                                        {plant.genus && <p><strong>Genus:</strong> {plant.genus}</p>}
                                        {plant.cultivar && <p><strong>Cultivar:</strong> {plant.cultivar}</p>}
                                        {plant.species_epithet && (
                                            <p><strong>Species epithet:</strong> {plant.species_epithet}</p>
                                        )}
                                        {plant.authority && <p><strong>Authority:</strong> {plant.authority}</p>}
                                    </div>
                                </div>

                                {/* Other names */}
                                {otherNames.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-semibold text-emerald-800 mb-2">Other names</h2>
                                        <div className="flex flex-wrap gap-2">
                                            {otherNames.map((n, idx) => (
                                                <span key={idx}
                                                      className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs md:text-sm"
                                                >
                                                    {n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* DETAILED CARE INFO (MongoDB) */}
                                <div>
                                    <h2 className="text-lg font-semibold text-emerald-800 mb-2">
                                        Care & Growing Information
                                    </h2>

                                    {!plant.details ? (
                                        <p className="text-sm text-gray-600">No detailed data available.</p>
                                    ) : (
                                        <div className="space-y-4">

                                            {plant.details.description && (
                                                <div className="bg-emerald-50 border p-4 rounded-xl">
                                                    <h3 className="font-semibold text-emerald-900 mb-1">Description</h3>
                                                    <p className="text-gray-700 whitespace-pre-line">
                                                        {plant.details.description}
                                                    </p>
                                                </div>
                                            )}

                                            {plant.details.watering && (
                                                <div className="bg-emerald-50 border p-4 rounded-xl">
                                                    <h3 className="font-semibold text-emerald-900 mb-1">Watering</h3>
                                                    <p className="text-gray-700">{plant.details.watering}</p>
                                                </div>
                                            )}

                                            {plant.details.sunlight?.length > 0 && (
                                                <div className="bg-emerald-50 border p-4 rounded-xl">
                                                    <h3 className="font-semibold text-emerald-900 mb-1">Sunlight</h3>
                                                    <p className="text-gray-700">
                                                        {plant.details.sunlight.join(", ")}
                                                    </p>
                                                </div>
                                            )}

                                            {plant.details.propagation?.length > 0 && (
                                                <div className="bg-emerald-50 border p-4 rounded-xl">
                                                    <h3 className="font-semibold text-emerald-900 mb-1">Propagation</h3>
                                                    <p className="text-gray-700">
                                                        {plant.details.propagation.join(", ")}
                                                    </p>
                                                </div>
                                            )}

                                            {plant.details.pruning_month?.length > 0 && (
                                                <div className="bg-emerald-50 border p-4 rounded-xl">
                                                    <h3 className="font-semibold text-emerald-900 mb-1">
                                                        Pruning months
                                                    </h3>
                                                    <p className="text-gray-700">
                                                        {plant.details.pruning_month.join(", ")}
                                                    </p>
                                                </div>
                                            )}

                                            {plant.details.origin?.length > 0 && (
                                                <div className="bg-emerald-50 border p-4 rounded-xl">
                                                    <h3 className="font-semibold text-emerald-900 mb-1">Origin</h3>
                                                    <p className="text-gray-700">
                                                        {plant.details.origin.join(", ")}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Perenual Care (optional) */}
                                <div>
                                    <h2 className="text-lg font-semibold text-emerald-800 mb-2">
                                        Additional Care Guides (Perenual)
                                    </h2>

                                    {careLoading ? (
                                        <p className="text-gray-600 text-sm">Loading care guides...</p>
                                    ) : careGuides.length === 0 ? (
                                        <p className="text-gray-600 text-sm">No care guides available.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {careGuides.map((guide, idx) => (
                                                <div key={idx}
                                                     className="bg-emerald-50 border rounded-xl p-4"
                                                >
                                                    <h3 className="font-semibold capitalize text-emerald-900 mb-1">
                                                        {guide.type}
                                                    </h3>
                                                    <p className="text-gray-700 whitespace-pre-line">
                                                        {guide.description}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-sm">
                                    <h3 className="text-md font-semibold text-emerald-800 mb-2">
                                        Database info
                                    </h3>

                                    <p><strong>Internal ID:</strong> {plant._id}</p>
                                    <p><strong>Perenual ID:</strong> {plant.id}</p>

                                    {plant.imported_at && (
                                        <p><strong>Imported:</strong> {new Date(plant.imported_at).toLocaleString()}</p>
                                    )}

                                    <p className="text-xs text-gray-500 mt-2">
                                        Source: {plant.source || "Perenual API"}
                                    </p>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
