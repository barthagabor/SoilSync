import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function SignInForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!identifier.trim() || !password.trim()) {
            setError("Please fill in all fields!");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });

            const data = await res.json();
            console.log("Status code:", res.status);
            console.log("Response data:", data);

            if (res.ok) {
                setSuccess("Login successful! Redirecting...");
                localStorage.setItem("token", data.token); // optional
                setTimeout(() => {
                    navigate("/"); //
                }, 1500);
            } else {
                setError(data.message || "Invalid username/email or password.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to connect to the server.");
        }
    }

    return (
        <div className="flex flex-row min-h-screen">
            {/* Left image */}
            <img
                src="./src/assets/icons/SignUpPlant.png"
                alt="Plant"
                className="h-auto object-cover hidden md:block"
            />

            {/* Right form section */}
            <div className="flex-[3.3] bg-garden flex items-center justify-center px-6 py-10">
                <form
                    onSubmit={handleLogin}
                    className="w-full max-w-md space-y-6"
                >
                    <h1 className="text-2xl font-normal text-gray-900">SoilSync</h1>
                    <h2 className="text-3xl font-bold whitespace-nowrap text-left text-landingPageIcons">
                        Welcome back — Let’s grow again!
                    </h2>

                    {/* Error and success messages */}
                    {error && (
                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm">
                            {success}
                        </div>
                    )}

                    {/* Identifier (email or username) */}
                    <div>
                        <label className="block mb-2 font-semibold text-landingPageIcons">
                            Email or Username
                        </label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-landingPageIcons"
                            placeholder="Enter your email or username"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block mb-2 font-semibold text-landingPageIcons">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border rounded-lg px-4 py-2 pr-10
                     focus:outline-none focus:ring-2 focus:ring-landingPageIcons
                     text-gray-800 placeholder-gray-400"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-landingPageIcons
                     hover:text-darkLandingPageIcons
                     transition-all duration-200 hover:scale-110"
                            >
                                {showPassword ? (
                                    <EyeOff size={20} strokeWidth={2} />
                                ) : (
                                    <Eye size={20} strokeWidth={2} />
                                )}
                            </button>
                        </div>
                    </div>

                    <p className="text-right text-sm">
                        <Link
                            to="/forgot-password"
                            className="text-landingPageIcons hover:text-darkLandingPageIcons font-medium"
                            >
                            Forgot password?
                        </Link>
                    </p>
                    <button
                        type="submit"
                        className="block text-center w-full bg-landingPageIcons hover:bg-darkLandingPageIcons
                    text-white font-semibold py-2 px-4 rounded-lg transition-all"
                    >
                        Sign In
                    </button>


                    {/* Sign up redirect */}
                    <p className="text-center text-gray-700 text-sm">
                        Don’t have an account?{" "}
                        <Link
                            to="/register"
                            className="text-landingPageIcons font-semibold hover:underline"
                        >
                            Sign Up
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
