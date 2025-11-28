import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function PlantList() {
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");

    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedClimates, setSelectedClimates] = useState([]);

    const limit = 24;

    // statikus "kategóriák" – egyelőre csak UI, adatban még nincsenek
    const categories = ["All plants", "Indoor", "Outdoor", "Trees", "Flowers", "Succulents"];
    const climates = ["All climates", "Temperate", "Tropical", "Mediterranean", "Desert"];

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                setLoading(true);

                const url = new URL("http://localhost:5000/plants");
                url.searchParams.set("page", page);
                url.searchParams.set("limit", limit);
                if (searchTerm) url.searchParams.set("search", searchTerm);

                const res = await fetch(url.toString());
                if (!res.ok) {
                    throw new Error("Failed to fetch plants.");
                }

                const data = await res.json();
                setPlants(data.data || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                console.error("❌ Error fetching plants:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchPlants();
    }, [page, searchTerm]);

    const handlePageClick = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleFilter = () => {
        // most csak keresés + backend szűr, a kategória/klíma UI későbbre
        setPage(1);
    };

    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    // extra frontendes szűrés, hogy a search név/latin alapján is működjön
    const filteredPlants = plants.filter((plant) => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return true;

        const commonName = (plant.common_name || "").toLowerCase();
        const scientific = Array.isArray(plant.scientific_name)
            ? plant.scientific_name.join(" ").toLowerCase()
            : (plant.scientific_name || "").toLowerCase();

        return commonName.includes(search) || scientific.includes(search);
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-900 mb-6 text-center">
                Plant Library
            </h1>

            {/* Szűrők + keresés */}
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
                {/* search */}
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by common or scientific name"
                        className="flex-1 border border-emerald-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                        onClick={() => setPage(1)}
                        className="bg-landingPageIcons hover:bg-darkLandingPageIcons text-white px-4 py-2 rounded-lg transition"
                    >
                        Search
                    </button>
                </div>

                {/* egyszerű filter gomb – most csak UI, logikát később is bővíthetjük */}
                <button
                    onClick={handleFilter}
                    className="border border-emerald-300 text-emerald-800 px-4 py-2 rounded-lg text-sm hover:bg-emerald-50 transition"
                >
                    Apply Filters
                </button>
            </div>

            {/* Page Info */}
            {!loading && total > 0 && (
                <p className="text-center text-gray-600 mb-4">
                    Showing{" "}
                    <span className="font-semibold text-emerald-700">{startItem}</span>–
                    <span className="font-semibold text-emerald-700">
                        {Math.min(endItem, startItem + filteredPlants.length - 1)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-emerald-700">{total}</span> plants
                </p>
            )}

            {/* Grid */}
            {loading ? (
                <p className="text-center text-emerald-700">Loading plants...</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredPlants.map((plant, index) => {
                            const imageUrl =
                                plant?.default_image?.medium_url ||
                                plant?.default_image?.small_url ||
                                plant?.default_image?.regular_url ||
                                "https://via.placeholder.com/400x300?text=No+Image";

                            const latinName = Array.isArray(plant.scientific_name)
                                ? plant.scientific_name[0]
                                : plant.scientific_name;

                            const title = plant.common_name || latinName || "Unknown plant";

                            return (
                                <Link key={index} to={`/plant/${plant.id}`}>
                                    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]">
                                        <img
                                            src={imageUrl}
                                            alt={latinName || title}
                                            className="w-full h-48 object-cover"
                                        />
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg text-emerald-700 truncate">
                                                {title}
                                            </h3>
                                            <p className="text-gray-600 italic text-sm truncate">
                                                {latinName || "No scientific name"}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-2 truncate">
                                                Family: {plant.family || "—"} · Genus: {plant.genus || "—"}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <nav aria-label="Page navigation" className="flex justify-center mt-10">
                            <ul className="flex items-center -space-x-px h-10 text-base">
                                {/* Prev */}
                                <li>
                                    <button
                                        onClick={() => handlePageClick(page - 1)}
                                        disabled={page === 1}
                                        className="flex items-center justify-center px-4 h-10 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                                    >
                                        Prev
                                    </button>
                                </li>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <li key={p}>
                                        <button
                                            onClick={() => handlePageClick(p)}
                                            className={`flex items-center justify-center px-4 h-10 leading-tight border border-gray-300 ${
                                                p === page
                                                    ? "bg-landingPageIcons text-white"
                                                    : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    </li>
                                ))}

                                {/* Next */}
                                <li>
                                    <button
                                        onClick={() => handlePageClick(page + 1)}
                                        disabled={page === totalPages}
                                        className="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
