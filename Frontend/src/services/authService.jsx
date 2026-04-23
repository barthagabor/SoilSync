const API_URL = "http://localhost:5000";

// Segédfüggvény a token automatikus hozzáadásához
const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export const registerApi = async (name, email, password) => {
    const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed.");
    return data;
};

export const loginApi = async (identifier, password) => {
    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Invalid credentials.");
    return data;
};

export const forgotPasswordApi = async (email) => {
    const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong.");
    return data;
};

export const resetPasswordApi = async (token, password) => {
    const res = await fetch(`${API_URL}/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong.");
    return data;
};

export const getProfileApi = async () => {
    const res = await fetch(`${API_URL}/profile`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
};

export const toggleFavouriteApi = async (plantId) => {
    const res = await fetch(`${API_URL}/favourites/toggle`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ plantId: Number(plantId) }),
    });
    if (!res.ok) throw new Error("Failed to toggle favourite");
    return res.json();
};