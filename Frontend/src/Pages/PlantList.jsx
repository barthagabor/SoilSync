import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function PlantList() {
    const [plants, setPlants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [climat, setClimat] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
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

    // Build pagination list (with "..." gaps)
    const pagesToShow = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            pagesToShow.push(i);
        } else if (pagesToShow[pagesToShow.length - 1] !== "...") {
            pagesToShow.push("...");
        }
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

            {/* 🌱 Plant Grid */}
            {loading ? (
                <p className="text-center text-emerald-700">Loading plants...</p>
            ) : (
                <>
                    {/* Page Info */}
                    <p className="text-center text-gray-600 mb-4">
                        Showing <span className="font-semibold text-emerald-700">{startItem}</span>–
                        <span className="font-semibold text-emerald-700">{endItem}</span> of{" "}
                        <span className="font-semibold text-emerald-700">{total}</span> plants
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {plants.map((plant, index) => (
                            <Link key={index} to={`/plant/${plant.id}`}>
                                <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all cursor-pointer">
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
                            </Link>
                        ))}

                    </div>

                    {/* 🌍 Pagination */}
                    <nav aria-label="Page navigation" className="flex justify-center mt-10">
                        <ul className="flex items-center -space-x-px h-10 text-base">
                            {/* Previous */}
                            <li>
                                <button
                                    onClick={() => handlePageClick(page - 1)}
                                    disabled={page === 1}
                                    className={`flex items-center justify-center px-4 h-10 leading-tight border border-e-0 rounded-s-lg ${
                                        page === 1
                                            ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                            : "text-landingPageIcons bg-white border-gray-300 hover:bg-gray-100 hover:text-darkLandingPageIcons"
                                    }`}
                                >
                                    <span className="sr-only">Previous</span>
                                    <svg
                                        className="w-3 h-3"
                                        aria-hidden="true"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 6 10"
                                    >
                                        <path
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M5 1 1 5l4 4"
                                        />
                                    </svg>
                                </button>
                            </li>

                            {/* Page Numbers */}
                            {pagesToShow.map((num, i) =>
                                    num === "..." ? (
                                        <li key={`dots-${i}`}>
                    <span className="flex items-center justify-center px-4 h-10 leading-tight text-gray-400 bg-white border border-gray-300">
                      ...
                    </span>
                                        </li>
                                    ) : (
                                        <li key={num}>
                                            <button
                                                onClick={() => handlePageClick(num)}
                                                className={`flex items-center justify-center px-4 h-10 leading-tight border border-gray-300 ${
                                                    num === page
                                                        ? "z-10 text-white bg-landingPageIcons border-landingPageIcons"
                                                        : "text-gray-500 bg-white hover:bg-gray-100 hover:text-darkLandingPageIcons"
                                                }`}
                                            >
                                                {num}
                                            </button>
                                        </li>
                                    )
                            )}

                            {/* Next */}
                            <li>
                                <button
                                    onClick={() => handlePageClick(page + 1)}
                                    disabled={page === totalPages}
                                    className={`flex items-center justify-center px-4 h-10 leading-tight border rounded-e-lg ${
                                        page === totalPages
                                            ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                                            : "text-landingPageIcons bg-white border-gray-300 hover:bg-gray-100 hover:text-darkLandingPageIcons"
                                    }`}
                                >
                                    <span className="sr-only">Next</span>
                                    <svg
                                        className="w-3 h-3"
                                        aria-hidden="true"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 6 10"
                                    >
                                        <path
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="m1 9 4-4-4-4"
                                        />
                                    </svg>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </>
            )}
        </div>
    );
}
