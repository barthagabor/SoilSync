import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Leaf, Mail, Lock, User } from "lucide-react";
import { registerUserRequest } from "../services/authService.jsx";

export default function SignUpForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    function validateEmail(email) {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    }
    function validatePassword(password) {
        return /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/.test(password);
    }
    function getPasswordStrength(pw) {
        if (!pw) return 0;
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^a-zA-Z0-9]/.test(pw)) score++;
        return score;
    }

    const strength = getPasswordStrength(password);
    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][strength];
    const strengthColor = ["", "#ef4444", "#f59e0b", "#84cc16", "#22c55e", "#3F620F"][strength];

    async function handleRegister(e) {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!name.trim() || !email.trim() || !password.trim()) { setError("All fields are required!"); return; }
        if (!validateEmail(email)) { setError("Please enter a valid email address!"); return; }
        if (!validatePassword(password)) { setError("Password must be at least 6 characters with uppercase and lowercase letters."); return; }
        try {
            const response = await registerUserRequest({ name, email, password });
            setSuccess(response?.message || "Registration successful! You can now log in.");
            setName(""); setEmail(""); setPassword("");
            setTimeout(() => setSuccess(""), 5000);
        } catch (err) {
            setError(err.message || "Failed to connect to the server.");
        }
    }

    const inputClass = "w-full py-3 pl-[42px] pr-3.5 border border-garden rounded-xl bg-white font-dm text-[14px] text-greenDark outline-none focus:border-landingPageIcons focus:shadow-[0_0_0_3px_rgba(63,98,15,0.08)] transition-all duration-200 box-border placeholder:text-[#b4c4a8]";

    const leftBg = { background: "linear-gradient(160deg, #2d4a0a 0%, #3F620F 45%, #6b9a2a 100%)" };
    const rightBg = {
        backgroundColor: "#f5f6f0",
        backgroundImage: `
            radial-gradient(circle at 90% 10%, rgba(149,178,155,0.18) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233F620F' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
    };

    return (
        <div className="font-dm min-h-screen flex">

            {/* ── LEFT PANEL ── */}
            <div className="flex-1 hidden md:flex flex-col justify-between px-[52px] py-12 relative overflow-hidden" style={leftBg}>
                <div className="absolute inset-0"
                     style={{
                         backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='36' fill='none' stroke='white' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E")`,
                         backgroundSize: "80px 80px"
                     }} />
                <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full"
                     style={{ background: "radial-gradient(circle, rgba(149,178,155,0.2) 0%, transparent 70%)" }} />

                <div className="relative z-10 flex items-center gap-2.5 font-playfair text-[22px] font-bold text-white">
                    🌿 Soil<span className="text-SignUpLeft">Sync</span>
                </div>

                <div className="relative z-10 flex-1 flex flex-col justify-center">
                    <h2 className="font-playfair font-bold text-white leading-tight mb-4" style={{ fontSize: "clamp(2rem, 3vw, 2.8rem)" }}>
                        Plant the seed —<br /><em className="italic text-[#b8d4a0] font-medium">AI will help it thrive</em>
                    </h2>
                    <p className="text-white/65 text-[15px] font-light leading-relaxed max-w-[340px]">
                        Create your free account and get personalized plant recommendations, an interactive garden planner, and smart care reminders.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col gap-3">
                    {[
                        { icon: "🌱", text: "AI-powered plant recommendations" },
                        { icon: "💧", text: "Smart watering & care reminders" },
                        { icon: "🗺️", text: "Interactive garden planner" },
                    ].map((f, i) => (
                        <div key={i} className="inline-flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-[13px] backdrop-blur-sm max-w-fit">
                            <div className="w-[28px] h-[28px] bg-white/15 rounded-lg flex items-center justify-center shrink-0">{f.icon}</div>
                            {f.text}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="flex-1 flex items-center justify-center px-6 md:px-[52px] py-12 overflow-y-auto" style={rightBg}>
                <div className="w-full max-w-[400px]">

                    <div className="inline-flex items-center gap-1.5 bg-garden text-landingPageIcons border border-greenChip rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest mb-3.5">
                        <Leaf size={11} /> Create account
                    </div>
                    <h1 className="font-playfair text-[28px] font-bold text-greenDark leading-tight mb-1.5">Join SoilSync</h1>
                    <p className="text-greenMid text-[14px] font-light mb-7">Free forever. No credit card required.</p>

                    {error && (
                        <div className="flex items-center gap-2 bg-[#fef2f2] text-red-600 border border-[#fecaca] rounded-[10px] px-3.5 py-2.5 text-[13px] mb-4">
                            ✕ {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-start gap-2 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] rounded-[10px] px-3.5 py-2.5 text-[13px] mb-4">
                            ✓ {success}
                        </div>
                    )}

                    <form onSubmit={handleRegister}>
                        {/* Name */}
                        <div className="mb-4">
                            <label className="block text-[12px] font-semibold text-[#4a5e38] uppercase tracking-[0.08em] mb-1.5">Full Name</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-greenMuted pointer-events-none" />
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                       className={inputClass} placeholder="Your name" />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="mb-4">
                            <label className="block text-[12px] font-semibold text-[#4a5e38] uppercase tracking-[0.08em] mb-1.5">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-greenMuted pointer-events-none" />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                       className={inputClass} placeholder="your@email.com" />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="mb-1">
                            <label className="block text-[12px] font-semibold text-[#4a5e38] uppercase tracking-[0.08em] mb-1.5">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-greenMuted pointer-events-none" />
                                <input type={showPassword ? "text" : "password"} value={password}
                                       onChange={e => setPassword(e.target.value)}
                                       className={`${inputClass} pr-[44px]`} placeholder="Min. 6 characters" />
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

                        <button type="submit"
                                className="w-full mt-6 py-3.5 bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold text-[15px] rounded-xl shadow-green-btn hover:-translate-y-px transition-all duration-200 border-none cursor-pointer">
                            Create account →
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6 text-[#b4c4a8] text-[12px]">
                        <div className="flex-1 h-px bg-garden" />
                        or
                        <div className="flex-1 h-px bg-garden" />
                    </div>

                    <p className="text-center text-[13px] text-greenMid">
                        Already have an account?{" "}
                        <Link to="/login" className="text-landingPageIcons font-semibold no-underline hover:underline">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
