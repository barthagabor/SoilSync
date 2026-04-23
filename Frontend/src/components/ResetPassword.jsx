import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Leaf, ArrowLeft, ShieldCheck } from "lucide-react";

export default function ResetPassword() {
    const { token } = useParams();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    function getPasswordStrength(pw) {
        if (!pw) return 0;
        let score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;
        return score;
    }

    const strength = getPasswordStrength(password);
    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength];
    const strengthColor = ["", "#ef4444", "#f59e0b", "#84cc16", "#22c55e", "#3F620F"][strength];
    const passwordsMatch = confirm.length > 0 && password === confirm;
    const passwordsMismatch = confirm.length > 0 && password !== confirm;

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
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
            if (res.ok) { setDone(true); setPassword(""); setConfirm(""); }
            else setError(data.message || "Something went wrong while updating your password.");
        } catch {
            setError("Unable to connect to the server. Please try again later.");
        } finally {
            setLoading(false);
        }
    }

    if (!token) return (
        <div className="min-h-screen flex items-center justify-center font-dm text-red-600 text-[15px]">
            Missing token in the URL.
        </div>
    );

    const pageBg = {
        backgroundColor: "#f5f6f0",
        backgroundImage: `
            radial-gradient(ellipse at 20% 20%, rgba(149,178,155,0.22) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 80%, rgba(63,98,15,0.09) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233F620F' fill-opacity='0.035'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
    };

    const inputBase = "w-full py-3 pl-[42px] pr-[44px] border rounded-xl bg-greenLight font-dm text-[14px] text-greenDark outline-none transition-all duration-200 box-border placeholder:text-[#b4c4a8]";

    return (
        <div className="font-dm min-h-screen flex items-center justify-center px-5 py-8" style={pageBg}>
            <div className="bg-white rounded-[24px] border border-greenBorder shadow-green-lg p-12 w-full max-w-[420px]">

                {/* Brand */}
                <Link to="/" className="flex items-center justify-center gap-2 font-playfair text-[18px] font-bold text-greenDark no-underline mb-8">
                    🌿 Soil<span className="text-SignUpLeft">Sync</span>
                </Link>

                {done ? (
                    /* ── SUCCESS STATE ── */
                    <div className="text-center py-2">
                        <div className="w-[64px] h-[64px] rounded-full bg-garden flex items-center justify-center mx-auto mb-5">
                            <ShieldCheck size={30} color="#3F620F" />
                        </div>
                        <h2 className="font-playfair text-[22px] font-bold text-greenDark mb-2.5">Password updated!</h2>
                        <p className="text-greenMid text-[14px] font-light leading-relaxed mb-7">
                            Your password has been successfully changed. You can now sign in with your new password.
                        </p>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold text-[14px] px-7 py-3 rounded-xl shadow-green-btn hover:-translate-y-px transition-all duration-200 no-underline"
                        >
                            Sign In →
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Icon + heading */}
                        <div className="text-center mb-6">
                            <div className="w-[64px] h-[64px] rounded-[20px] bg-garden flex items-center justify-center mx-auto mb-5">
                                <Lock size={28} color="#3F620F" />
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-garden text-landingPageIcons border border-greenChip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest mb-3">
                                <Leaf size={11} /> New Password
                            </div>
                            <h1 className="font-playfair text-[26px] font-bold text-greenDark leading-tight mb-2">Set your new password</h1>
                            <p className="text-greenMid text-[14px] font-light leading-relaxed">
                                Choose a strong password — at least 8 characters with uppercase and lowercase letters.
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 bg-[#fef2f2] text-red-600 border border-[#fecaca] rounded-[10px] px-3.5 py-2.5 text-[13px] mb-4">
                                ✕ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* New password */}
                            <div className="mb-4">
                                <label className="block text-[12px] font-semibold text-[#4a5e38] uppercase tracking-[0.08em] mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-greenMuted pointer-events-none" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className={`${inputBase} border-garden focus:border-landingPageIcons focus:bg-white focus:shadow-[0_0_0_3px_rgba(63,98,15,0.08)]`}
                                        placeholder="At least 8 characters"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-greenMuted hover:text-landingPageIcons transition-colors duration-200 bg-transparent border-none cursor-pointer flex">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {password && (
                                    <>
                                        <div className="h-1 rounded-full bg-greenBorder mt-2 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-300"
                                                 style={{ width: `${(strength / 5) * 100}%`, background: strengthColor }} />
                                        </div>
                                        <p className="text-[11px] font-semibold text-right mt-1" style={{ color: strengthColor }}>{strengthLabel}</p>
                                    </>
                                )}
                            </div>

                            {/* Confirm password */}
                            <div className="mb-6">
                                <label className="block text-[12px] font-semibold text-[#4a5e38] uppercase tracking-[0.08em] mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-greenMuted pointer-events-none" />
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        className={`${inputBase} border-garden focus:border-landingPageIcons focus:bg-white focus:shadow-[0_0_0_3px_rgba(63,98,15,0.08)] ${passwordsMatch ? "border-[#22c55e]" : ""} ${passwordsMismatch ? "border-[#ef4444]" : ""}`}
                                        placeholder="Re-enter your password"
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-greenMuted hover:text-landingPageIcons transition-colors duration-200 bg-transparent border-none cursor-pointer flex">
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {passwordsMatch && <p className="flex items-center gap-1.5 text-[12px] text-[#22c55e] mt-1.5">✓ Passwords match</p>}
                                {passwordsMismatch && <p className="flex items-center gap-1.5 text-[12px] text-[#ef4444] mt-1.5">✕ Passwords don't match</p>}
                            </div>

                            <button type="submit" disabled={loading}
                                    className="w-full py-3.5 bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold text-[15px] rounded-xl shadow-green-btn hover:-translate-y-px disabled:opacity-65 disabled:cursor-not-allowed transition-all duration-200 border-none cursor-pointer">
                                {loading ? "Saving…" : "Save New Password →"}
                            </button>
                        </form>

                        <Link to="/login" className="flex items-center justify-center gap-1.5 mt-5 text-[13px] text-greenMid hover:text-landingPageIcons no-underline transition-colors duration-200">
                            <ArrowLeft size={14} /> Back to Sign In
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}