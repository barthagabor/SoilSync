import { useEffect, useState } from "react";

export default function PlantList() {
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [climat, setClimat] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [selectedPlant, setSelectedPlant] = useState(null); // 👈 modal state
    const limit = 20;

    async function fetchPlants() {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("limit", limit);
        if (search) params.append("search", search);
        if (category) params.append("category", category);
        if (climat) params.append("climat", climat);

        const res = await fetch(`http://localhost:5000/plants?${params.toString()}`);
        const data = await res.json();

        setPlants(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        setLoading(false);
    }

    useEffect(() => {
        fetchPlants();
    }, [page]);

    function handleFilter() {
        setPage(1);
        fetchPlants();
    }

    function handlePageClick(num) {
        if (num >= 1 && num <= totalPages) setPage(num);
    }

    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    return (
        <div className="min-h-screen bg-emerald-50 pt-20 px-6">
            <h1 className="text-3xl font-bold text-center mb-8 text-emerald-700">
                Plant Collection
            </h1>

            {/* 🔍 Filters */}
            <div className="flex flex-wrap gap-4 justify-center mb-8">
                <input
                    type="text"
                    placeholder="Search by name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-emerald-300 rounded-lg px-4 py-2 w-64"
                />
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="border border-emerald-300 rounded-lg px-4 py-2"
                >
                    <option value="">Category</option>
                    <option value="Fern">Fern</option>
                    <option value="Succulent">Succulent</option>
                    <option value="Palm">Palm</option>
                </select>
                <select
                    value={climat}
                    onChange={(e) => setClimat(e.target.value)}
                    className="border border-emerald-300 rounded-lg px-4 py-2"
                >
                    <option value="">Climate</option>
                    <option value="Tropical">Tropical</option>
                    <option value="Temperate">Temperate</option>
                    <option value="Desert">Desert</option>
                </select>
                <button
                    onClick={handleFilter}
                    className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white px-4 py-2 rounded-lg transition"
                >
                    Apply Filters
                </button>
            </div>

            {/* Page Info */}
            {!loading && (
                <p className="text-center text-gray-600 mb-4">
                    Showing <span className="font-semibold text-emerald-700">{startItem}</span>–
                    <span className="font-semibold text-emerald-700">{endItem}</span> of{" "}
                    <span className="font-semibold text-emerald-700">{total}</span> plants
                </p>
            )}

            {/* 🌱 Plant Grid */}
            {loading ? (
                <p className="text-center text-emerald-700">Loading plants...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {plants.map((plant, index) => (
                        <div
                            key={index}
                            onClick={() => setSelectedPlant(plant)}
                            className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
                        >
                            <img
                                src={plant.Img}
                                alt={plant["Latin name"]}
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-4">
                                <h3 className="font-bold text-lg text-emerald-700">
                                    {plant["Common name"]?.[0] || plant["Latin name"]}
                                </h3>
                                <p className="text-gray-600 italic text-sm">{plant["Latin name"]}</p>
                                <p className="text-gray-500 text-xs mt-2">
                                    {plant.Climat} | {plant.Categories}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            /* replace the modal block in PlantList.jsx with the following */
            {selectedPlant && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start z-50 p-4 overflow-y-auto"
                    onClick={() => setSelectedPlant(null)}
                >
                    <div
                        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden mt-12"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* COVER / HERO */}
                        <div className="relative h-56 md:h-72 w-full bg-gray-200">
                            {/* background image (cover) */}
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                    backgroundImage: `linear-gradient(to bottom, rgba(2,6,23,0.25), rgba(2,6,23,0.25)), url(${selectedPlant.Img})`,
                                }}
                                aria-hidden="true"
                            />

                            {/* floating round thumbnail */}
                            <div className="absolute left-1/2 -bottom-12 transform -translate-x-1/2">
                                <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                                    <img
                                        src={selectedPlant.Img}
                                        alt={selectedPlant["Latin name"]}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            {/* top-right small actions */}
                            <div className="absolute top-3 right-4 flex gap-3">
                                <button
                                    onClick={() => { /* optional: favorite handler */ }}
                                    className="bg-white/90 px-3 py-1 rounded-full shadow-sm text-sm font-semibold text-landingPageIcons hover:bg-white"
                                >
                                    ★ Favorite
                                </button>
                                <button
                                    onClick={() => navigator.clipboard?.writeText(window.location.href)}
                                    className="bg-white/90 px-3 py-1 rounded-full shadow-sm text-sm font-semibold text-gray-700 hover:bg-white"
                                >
                                    Share
                                </button>
                            </div>
                        </div>

                        {/* MAIN CONTENT */}
                        <div className="px-6 md:px-10 pt-16 pb-8">
                            <div className="max-w-4xl mx-auto">
                                {/* Title row */}
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-extrabold text-landingPageIcons">
                                            {selectedPlant["Common name"]?.[0] || selectedPlant["Latin name"]}
                                        </h2>
                                        <p className="text-gray-600 italic mt-1">{selectedPlant["Latin name"]}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                {selectedPlant.Climat || "Unknown climate"}
              </span>
                                        <a
                                            href={selectedPlant.Url || selectedPlant["Buy link"] || "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-block bg-landingPageIcons hover:bg-darkLandingPageIcons text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                        >
                                            Buy / Source
                                        </a>
                                    </div>
                                </div>

                                {/* GRID: Description + Right column cards */}
                                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* LEFT: big description (spans 2 cols on large) */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <section>
                                            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Description</h3>
                                            <p className="text-gray-700 leading-relaxed">
                                                {selectedPlant.Description || "No description available."}
                                            </p>
                                        </section>

                                        <section>
                                            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Care tips</h3>
                                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                                                {/* use fields if present, otherwise show generic tips */}
                                                {selectedPlant.CareTips ? (
                                                    selectedPlant.CareTips.map((t, i) => <li key={i}>{t}</li>)
                                                ) : (
                                                    <>
                                                        <li>Place in bright, indirect light.</li>
                                                        <li>Water when the top 2–3 cm of soil are dry.</li>
                                                        <li>Use well-draining soil and avoid waterlogging.</li>
                                                    </>
                                                )}
                                            </ul>
                                        </section>

                                        <section>
                                            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Diseases & pests</h3>
                                            <div className="text-gray-700">
                                                {selectedPlant.Pests || selectedPlant.Diseases ? (
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {(selectedPlant.Pests || []).map((p, i) => <li key={`p-${i}`}>{p}</li>)}
                                                        {(selectedPlant.Diseases || []).map((d, i) => <li key={`d-${i}`}>{d}</li>)}
                                                    </ul>
                                                ) : (
                                                    <p>No known common issues listed. Keep an eye out for overwatering and scale.</p>
                                                )}
                                            </div>
                                        </section>

                                        {/* Where to buy (multiple sources if exist) */}
                                        <section>
                                            <h3 className="text-lg font-semibold text-emerald-700 mb-2">Where to buy</h3>
                                            <div className="flex flex-col gap-3">
                                                {selectedPlant.Url ? (
                                                    <a
                                                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:shadow-sm"
                                                        href={selectedPlant.Url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <div>
                                                            <p className="font-semibold">{new URL(selectedPlant.Url).hostname}</p>
                                                            <p className="text-sm text-gray-500 truncate">{selectedPlant.Url}</p>
                                                        </div>
                                                        <span className="text-landingPageIcons font-semibold">Open</span>
                                                    </a>
                                                ) : (
                                                    <p className="text-gray-600">No vendor links available for this plant.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* RIGHT: small facts cards */}
                                    <aside className="space-y-4">
                                        <div className="bg-emerald-50 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-landingPageIcons">Family</h4>
                                            <p className="text-gray-700">{selectedPlant.Family || "N/A"}</p>
                                        </div>

                                        <div className="bg-emerald-50 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-landingPageIcons">Light</h4>
                                            <p className="text-gray-700">{selectedPlant.Light || "Moderate"}</p>
                                        </div>

                                        <div className="bg-emerald-50 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-landingPageIcons">Watering</h4>
                                            <p className="text-gray-700">{selectedPlant.Watering || "Regular"}</p>
                                        </div>

                                        <div className="bg-emerald-50 rounded-xl p-4">
                                            <h4 className="text-sm font-semibold text-landingPageIcons">Origin</h4>
                                            <p className="text-gray-700">{selectedPlant.Origin || "Unknown"}</p>
                                        </div>
                                    </aside>
                                </div>

                                {/* Similar plants (simple row) */}
                                <div className="mt-8">
                                    <h4 className="text-md font-semibold text-gray-700 mb-3">Similar plants</h4>
                                    <div className="flex gap-3 overflow-x-auto pb-2">
                                        {/* show up to 6 similar by category (client-side heuristic) */}
                                        {plants
                                            .filter((p) => p.Categories === selectedPlant.Categories && p.id !== selectedPlant.id)
                                            .slice(0, 6)
                                            .map((p) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => setSelectedPlant(p)}
                                                    className="min-w-[150px] bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md"
                                                >
                                                    <img src={p.Img} alt={p["Latin name"]} className="w-full h-24 object-cover" />
                                                    <div className="p-2 text-sm">
                                                        <p className="font-semibold text-emerald-700 truncate">{p["Common name"]?.[0] || p["Latin name"]}</p>
                                                        <p className="text-gray-500 text-xs truncate">{p.Climat}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        { /* fallback if none */ }
                                        {plants.filter((p) => p.Categories === selectedPlant.Categories && p.id !== selectedPlant.id).length === 0 && (
                                            <p className="text-gray-500">No similar plants found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
