import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
    const { token } = useParams();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!password || !confirm) return setError("Please fill in both fields.");
        if (password.length < 8) return setError("Password must be at least 8 characters long.");
        if (password !== confirm) return setError("Passwords do not match.");

        try {
            setLoading(true);
            const res = await fetch(`http://localhost:5000/reset-password/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
                credentials: "include",
            });
            const data = await res.json();
            if (res.ok) {
                setMessage("Your password has been successfully updated. You can now sign in.");
                setPassword("");
                setConfirm("");
            } else {
                setError(data.message || "Something went wrong while updating your password.");
            }
        } catch (err) {
            console.error(err);
            setError("Unable to connect to the server. Please try again later.");
        } finally {
            setLoading(false);
        }
    }

    if (!token) {
        return <div className="p-6 text-red-600 font-semibold">Missing token in the URL.</div>;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-garden px-4 py-10">
            <form
                onSubmit={handleSubmit}
                className="bg-landingPage w-full max-w-md rounded-2xl shadow-lg p-8 space-y-6"
            >
                <h1 className="text-2xl font-normal text-gray-900 text-center">SoilSync</h1>
                <h2 className="text-3xl font-bold text-landingPageIcons text-center">
                    Set Your New Password
                </h2>

                {/* Error and success messages */}
                {error && (
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm text-center">
                        {message}
                    </div>
                )}

                {/* New password */}
                <div>
                    <label className="block mb-2 font-semibold text-landingPageIcons">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2 pr-10
                            focus:outline-none focus:ring-2 focus:ring-landingPageIcons
                            text-gray-800 placeholder-gray-400"
                            placeholder="At least 8 characters"
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

                {/* Confirm password */}
                <div>
                    <label className="block mb-2 font-semibold text-landingPageIcons">
                        Confirm Password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2 pr-10
                            focus:outline-none focus:ring-2 focus:ring-landingPageIcons
                            text-gray-800 placeholder-gray-400"
                            placeholder="Re-enter your password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute inset-y-0 right-3 flex items-center text-landingPageIcons
                            hover:text-darkLandingPageIcons
                            transition-all duration-200 hover:scale-110"
                        >
                            {showConfirm ? (
                                <EyeOff size={20} strokeWidth={2} />
                            ) : (
                                <Eye size={20} strokeWidth={2} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Submit button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="block text-center w-full bg-landingPageIcons hover:bg-darkLandingPageIcons
                    text-white font-semibold py-2 px-4 rounded-lg transition-all disabled:opacity-70"
                >
                    {loading ? "Saving..." : "Save New Password"}
                </button>

                {/* Back to login */}
                <p className="text-center text-gray-700 text-sm">
                    Back to{" "}
                    <Link
                        to="/login"
                        className="text-landingPageIcons font-semibold hover:underline"
                    >
                        Sign In
                    </Link>
                </p>
            </form>
        </div>
    );
}
