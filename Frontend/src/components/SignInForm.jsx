import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
// Explicit kiterjesztés az importban
import { useAuth } from "../context/AuthContext.jsx";

export default function SignInForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    async function handleLogin(e) {
        e.preventDefault();
        setError("");

        if (!identifier.trim() || !password.trim()) {
            setError("Please fill in all fields!");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // SIKERES LOGIN: Elmentjük az adatokat a contextbe
                login(data.user, data.token);
                // Átirányítás a főoldalra
                navigate("/");
            } else {
                setError(data.message || "Invalid credentials.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-row min-h-screen">
            {/* Kép */}
            <img src="/src/assets/icons/SignUpPlant.png" alt="Plant" className="h-auto object-cover hidden md:block" />

            <div className="flex-[3.3] bg-garden flex items-center justify-center px-6 py-10">
                <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
                    <h1 className="text-2xl font-normal text-gray-900">SoilSync</h1>
                    <h2 className="text-3xl font-bold whitespace-nowrap text-left text-landingPageIcons">
                        Welcome back — Let’s grow again!
                    </h2>

                    {error && (
                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
                    )}

                    <div>
                        <label className="block mb-2 font-semibold text-landingPageIcons">Email or Username</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-landingPageIcons"
                            placeholder="Enter your email or username"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 font-semibold text-landingPageIcons">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-landingPageIcons"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-landingPageIcons"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="block text-center w-full bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-70"
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>

                    <p className="text-center text-gray-700 text-sm">
                        Don’t have an account? <Link to="/register" className="text-landingPageIcons font-semibold hover:underline">Sign Up</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}