import { useState } from "react";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!email.trim()) {
            setError("Please enter your email address!");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage("If an account exists, a reset link has been sent to your email.");
                setEmail("");
            } else {
                setError(data.message || "Something went wrong.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to connect to the server.");
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-garden px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 w-full max-w-md space-y-4"
            >
                <h2 className="text-2xl font-bold text-landingPageIcons text-center">
                    Reset your password
                </h2>

                {error && (
                    <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm">
                        {message}
                    </div>
                )}

                <div>
                    <label className="block mb-2 font-semibold text-landingPageIcons">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-landingPageIcons"
                        placeholder="Enter your email"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold py-2 px-4 rounded-lg transition-all"
                >
                    Send Reset Link
                </button>

                <p className="text-center text-gray-700 text-sm">
                    Back to{" "}
                    <a
                        href="/login"
                        className="text-landingPageIcons font-semibold hover:underline"
                    >
                        Sign In
                    </a>
                </p>
            </form>
        </div>
    );
}
