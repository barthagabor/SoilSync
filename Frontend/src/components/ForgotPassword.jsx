import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Leaf, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        if (!email.trim()) { setError("Please enter your email address!"); return; }
        try {
            setLoading(true);
            const res = await fetch("http://localhost:5000/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (res.ok) { setEmail(""); setSent(true); }
            else setError(data.message || "Something went wrong.");
        } catch {
            setError("Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    }

    const pageBg = {
        backgroundColor: "#f5f6f0",
        backgroundImage: `
            radial-gradient(ellipse at 20% 20%, rgba(149,178,155,0.22) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(63,98,15,0.09) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233F620F' fill-opacity='0.035'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
    };

    return (
        <div className="font-dm min-h-screen flex items-center justify-center px-5 py-8" style={pageBg}>
            <div className="bg-white rounded-[24px] border border-greenBorder shadow-green-lg p-12 w-full max-w-[420px]">

                {/* Brand */}
                <Link to="/" className="flex items-center justify-center gap-2 font-playfair text-[18px] font-bold text-greenDark no-underline mb-8">
                    🌿 Soil<span className="text-SignUpLeft">Sync</span>
                </Link>

                {sent ? (
                    /* ── SENT STATE ── */
                    <div className="text-center py-4">
                        <div className="w-[56px] h-[56px] rounded-full bg-garden flex items-center justify-center mx-auto mb-4 text-[26px]">
                            📬
                        </div>
                        <h2 className="font-playfair text-[20px] font-semibold text-greenDark mb-2.5">Check your inbox</h2>
                        <p className="text-greenMid text-[14px] font-light leading-relaxed mb-7">
                            We've sent a password reset link to your email address. It may take a minute to arrive.
                        </p>
                        <Link to="/login"
                              className="flex items-center justify-center gap-1.5 text-[13px] text-greenMid hover:text-landingPageIcons no-underline transition-colors duration-200">
                            <ArrowLeft size={14} /> Back to Sign In
                        </Link>
                    </div>

                ) : (
                    <>
                        {/* Icon + heading */}
                        <div className="text-center mb-6">
                            <div className="w-[64px] h-[64px] rounded-[20px] bg-garden flex items-center justify-center mx-auto mb-5">
                                <Mail size={28} color="#3F620F" />
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-garden text-landingPageIcons border border-greenChip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest mb-3">
                                <Leaf size={11} /> Password Reset
                            </div>
                            <h1 className="font-playfair text-[26px] font-bold text-greenDark leading-tight mb-2">
                                Forgot your password?
                            </h1>
                            <p className="text-greenMid text-[14px] font-light leading-relaxed">
                                No worries. Enter your email and we'll send you a reset link right away.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 bg-[#fef2f2] text-red-600 border border-[#fecaca] rounded-[10px] px-3.5 py-2.5 text-[13px] mb-4">
                                ✕ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <label className="block text-[12px] font-semibold text-[#4a5e38] uppercase tracking-[0.08em] mb-1.5">
                                Email Address
                            </label>
                            <div className="relative mb-5">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-greenMuted pointer-events-none" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full py-3 pl-[42px] pr-3.5 border border-garden rounded-xl bg-greenLight font-dm text-[14px] text-greenDark outline-none focus:border-landingPageIcons focus:bg-white focus:shadow-[0_0_0_3px_rgba(63,98,15,0.08)] transition-all duration-200 box-border placeholder:text-[#b4c4a8]"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <button type="submit" disabled={loading}
                                    className="w-full py-3.5 bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold text-[15px] rounded-xl shadow-green-btn hover:-translate-y-px disabled:opacity-65 disabled:cursor-not-allowed transition-all duration-200 border-none cursor-pointer">
                                {loading ? "Sending…" : "Send Reset Link →"}
                            </button>
                        </form>

                        <Link to="/login"
                              className="flex items-center justify-center gap-1.5 mt-5 text-[13px] text-greenMid hover:text-landingPageIcons no-underline transition-colors duration-200">
                            <ArrowLeft size={14} /> Back to Sign In
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}