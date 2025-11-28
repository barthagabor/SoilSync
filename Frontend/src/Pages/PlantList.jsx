import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, X, ChevronDown, Leaf, Globe } from "lucide-react";

export default function PlantList() {
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Search & Filter state
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        watering: "",
        sunlight: "",
        care_level: "",
        type: "",
        cycle: "",
        origin: ""
    });

    const [showFilters, setShowFilters] = useState(false);
    const limit = 24;

    // Filter Options
    const filterOptions = {
        watering: ["Frequent", "Average", "Minimum", "None"],
        sunlight: ["full sun", "part shade", "part sun/part shade", "full shade"],
        care_level: ["Low", "Medium", "High"],
        type: ["Tree", "Flowers", "Succulent", "Shrub", "Herb"],
        cycle: ["Perennial", "Annual", "Biennial"],
        // Kibővített lista: Régiók + Gyakori országok a könnyebb találatért
        origin: [
            // --- Regions (Needs backend mapping) ---
            "Europe", "North America", "South America", "Asia", "Africa", "Oceania",
            // --- Common Countries (Works directly) ---
            "United States", "Canada", "Mexico", "United Kingdom", "France",
            "Germany", "Italy", "Spain", "China", "Japan", "India", "Australia",
            "New Zealand", "Brazil", "Argentina", "South Africa"
        ]
    };

    // Helper to check if any filter is active
    const hasActiveFilters = Object.values(filters).some(val => val !== "");

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                setLoading(true);

                const url = new URL("http://localhost:5000/plants");
                url.searchParams.set("page", page);
                url.searchParams.set("limit", limit);

                // Add search term
                if (searchTerm) url.searchParams.set("search", searchTerm);

                // Add filters
                Object.entries(filters).forEach(([key, value]) => {
                    if (value) url.searchParams.set(key, value);
                });

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

        // Debounce fetching to avoid too many requests while typing
        const timeoutId = setTimeout(() => {
            fetchPlants();
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [page, searchTerm, filters]);

    // Handle inputs
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset to first page on search
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page on filter change
    };

    const clearFilters = () => {
        setFilters({
            watering: "",
            sunlight: "",
            care_level: "",
            type: "",
            cycle: "",
            origin: ""
        });
        setSearchTerm("");
        setPage(1);
    };

    const handlePageClick = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // --- Smart Pagination Logic ---
    const getSmartPagination = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                range.push(i);
            }
        }

        let l;
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
        return rangeWithDots;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-gray-50/50">
            <h1 className="text-3xl md:text-4xl font-bold text-emerald-950 mb-8 text-center flex items-center justify-center gap-3">
                <Leaf className="text-emerald-600" size={32} />
                Plant Library
            </h1>

            {/* --- SEARCH & FILTER CONTROLS --- */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 mb-8 sticky top-20 z-30">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Search Bar */}
                    <div className="relative w-full md:flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            placeholder="Search by name (common or scientific)..."
                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 transition duration-150 ease-in-out sm:text-sm"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors border ${
                            showFilters || hasActiveFilters
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        <Filter size={18} />
                        Filters
                        {(hasActiveFilters) && (
                            <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500 block"></span>
                        )}
                        <ChevronDown size={16} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Collapsible Filter Panel */}
                {(showFilters) && (
                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">

                        {/* Watering */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Watering</label>
                            <select
                                value={filters.watering}
                                onChange={(e) => handleFilterChange("watering", e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Any</option>
                                {filterOptions.watering.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Sunlight */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sunlight</label>
                            <select
                                value={filters.sunlight}
                                onChange={(e) => handleFilterChange("sunlight", e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Any</option>
                                {filterOptions.sunlight.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Care Level */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Care Level</label>
                            <select
                                value={filters.care_level}
                                onChange={(e) => handleFilterChange("care_level", e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Any</option>
                                {filterOptions.care_level.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange("type", e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Any</option>
                                {filterOptions.type.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Cycle */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Life Cycle</label>
                            <select
                                value={filters.cycle}
                                onChange={(e) => handleFilterChange("cycle", e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Any</option>
                                {filterOptions.cycle.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Origin / Region (Expanded) */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Origin</label>
                            <select
                                value={filters.origin}
                                onChange={(e) => handleFilterChange("origin", e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                <option value="">Any</option>
                                {filterOptions.origin.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Clear Button */}
                        <div className="sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end mt-2">
                            <button
                                onClick={clearFilters}
                                disabled={!hasActiveFilters && !searchTerm}
                                className="text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear all filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- RESULTS INFO --- */}
            {!loading && (
                <div className="flex justify-between items-center mb-6 px-2">
                    <p className="text-gray-600">
                        Found <span className="font-bold text-emerald-800">{total}</span> plants
                        {hasActiveFilters && " matching your filters"}
                    </p>
                </div>
            )}

            {/* --- GRID --- */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <>
                    {plants.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                            <Leaf className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No plants found</h3>
                            <p className="text-gray-500">Try adjusting your search or filters.</p>
                            <button onClick={clearFilters} className="mt-4 text-emerald-600 font-medium hover:underline">
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {plants.map((plant, index) => {
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
                                    <Link key={plant.id || index} to={`/plant/${plant.id}`}>
                                        <div className="group bg-white rounded-2xl shadow-sm border border-emerald-50 overflow-hidden hover:shadow-xl hover:border-emerald-200 transition-all duration-300 cursor-pointer flex flex-col h-full relative">
                                            {/* Image */}
                                            <div className="h-56 overflow-hidden bg-gray-100 relative">
                                                <img
                                                    src={imageUrl}
                                                    alt={latinName || title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                            </div>

                                            {/* Content */}
                                            <div className="p-5 flex-1 flex flex-col">
                                                <h3 className="font-bold text-lg text-gray-800 leading-tight mb-1 line-clamp-1 group-hover:text-emerald-700 transition-colors" title={title}>
                                                    {title}
                                                </h3>
                                                <p className="text-sm text-emerald-600 italic font-serif mb-3 line-clamp-1">
                                                    {latinName}
                                                </p>

                                                <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
                                                    <span>{plant.type || "Plant"}</span>
                                                    {plant.watering && (
                                                        <span className="flex items-center gap-1">
                                                            💧 {plant.watering}
                                                         </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    {/* --- PAGINATION --- */}
                    {totalPages > 1 && (
                        <nav aria-label="Page navigation" className="flex justify-center mt-12 mb-6">
                            <ul className="flex items-center space-x-1 h-10 text-sm md:text-base bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                                <li>
                                    <button
                                        onClick={() => handlePageClick(page - 1)}
                                        disabled={page === 1}
                                        className="flex items-center justify-center px-3 h-full text-gray-500 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                                    >
                                        Prev
                                    </button>
                                </li>

                                {getSmartPagination().map((p, index) => (
                                    <li key={index}>
                                        {p === '...' ? (
                                            <span className="flex items-center justify-center px-3 h-full text-gray-400">...</span>
                                        ) : (
                                            <button
                                                onClick={() => handlePageClick(p)}
                                                className={`min-w-[2.5rem] flex items-center justify-center px-3 h-8 rounded-lg text-sm font-medium transition-all ${
                                                    p === page
                                                        ? "bg-emerald-600 text-white shadow-md"
                                                        : "text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        )}
                                    </li>
                                ))}

                                <li>
                                    <button
                                        onClick={() => handlePageClick(page + 1)}
                                        disabled={page === totalPages}
                                        className="flex items-center justify-center px-3 h-full text-gray-500 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
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