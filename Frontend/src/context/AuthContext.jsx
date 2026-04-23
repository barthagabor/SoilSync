import { createContext, useState, useEffect, useContext } from "react";
import { getProfileApi, toggleFavouriteApi } from "../services/authService";
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
                    const userData = await getProfileApi(); // <-- Milyen szép tiszta!
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

    const toggleFavourite = async (plantId) => {
        const id = Number(plantId);
        if (!localStorage.getItem("token")) return;

        // Optimista UI frissítés
        setFavourites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

        try {
            const data = await toggleFavouriteApi(id); // <-- Csak egyetlen sor!
            setFavourites(data.favourites);
        } catch {
            // Hiba esetén visszavonjuk
            setFavourites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
        }
    };

    const isFavourite = (plantId) => favourites.includes(Number(plantId));
    const isAdmin = ["admin", "superadmin"].includes(user?.systemRole);
    const isSuperAdmin = user?.systemRole === "superadmin";

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading, favourites, toggleFavourite, isFavourite, isAdmin, isSuperAdmin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
