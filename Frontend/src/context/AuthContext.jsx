import { createContext, useState, useEffect, useContext } from "react";
import { fetchUserProfile, toggleFavouriteRequest } from "../services/authService.jsx";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [favourites, setFavourites] = useState([]);

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const userData = await fetchUserProfile(token);
                    setUser(userData);
                    setFavourites(userData.favourites || []);
                } catch (err) {
                    console.error("Auth check failed", err);
                    localStorage.removeItem("token");
                    setUser(null);
                    setFavourites([]);
                }
            }
            setLoading(false);
        };
        checkUserLoggedIn();
    }, []);

    const login = (userData, token) => {
        localStorage.setItem("token", token);
        setUser(userData);
        setFavourites(userData.favourites || []);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        setFavourites([]);
        window.location.href = "/login";
    };

    const updateUser = (newUserData) => {
        setUser(prev => ({ ...prev, ...newUserData }));
    };

    // Optimista UI update + backend szinkron
    const toggleFavourite = async (plantId) => {
        const id = Number(plantId);
        const token = localStorage.getItem("token");
        if (!token) return;

        // Azonnal frissül a UI
        setFavourites(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );

        try {
            const data = await toggleFavouriteRequest(token, id);
            setFavourites(data.favourites || []);
        } catch {
            setFavourites(prev =>
                prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
            );
        }
    };


    const isFavourite = (plantId) => favourites.includes(Number(plantId));
    const isAdmin = ["admin", "superadmin"].includes(user?.systemRole);
    const isSuperAdmin = user?.systemRole === "superadmin";
    const isPremium = user?.subscriptionPlan === "premium" && user?.premiumStatus === "active";

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading, favourites, toggleFavourite, isFavourite, isAdmin, isSuperAdmin, isPremium }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
