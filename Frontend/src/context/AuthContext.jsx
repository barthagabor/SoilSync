import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // App indulásakor megnézzük, van-e token a localStorage-ban
    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    // Lekérjük a friss adatokat a backendtől a token segítségével
                    const res = await fetch("http://localhost:5000/profile", {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.ok) {
                        const userData = await res.json();
                        setUser(userData);
                    } else {
                        // Ha a token lejárt vagy érvénytelen
                        localStorage.removeItem("token");
                        setUser(null);
                    }
                } catch (err) {
                    console.error("Auth check failed", err);
                }
            }
            setLoading(false);
        };

        checkUserLoggedIn();
    }, []);

    // Bejelentkezéskor ezt hívjuk meg
    const login = (userData, token) => {
        localStorage.setItem("token", token);
        setUser(userData);
    };

    // Kijelentkezés
    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        window.location.href = "/login";
    };

    // Profil frissítésekor (pl. új kép feltöltése)
    const updateUser = (newUserData) => {
        setUser(prev => ({ ...prev, ...newUserData }));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);