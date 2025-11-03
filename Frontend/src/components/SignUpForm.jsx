import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function SignUpForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);


    function validateEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    }

    function validatePassword(password) {
        const regex = /^(?=.*[a-z])(?=.*[A-Z]).{6,}$/;
        return regex.test(password);
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!name.trim() || !email.trim() || !password.trim()) {
            setError("All fields are required!");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address!");
            return;
        }

        if (!validatePassword(password)) {
            setError(
                "Password must be at least 6 characters long and include both uppercase and lowercase letters!"
            );
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({name, email, password}),
            });

            const data = await res.json();
            console.log("Status code:", res.status);
            console.log("Response data:", data);

            if (res.ok) {
                setSuccess("Registration successful! Please check your email to verify your account.");
                setName("");
                setEmail("");
                setPassword("");
                setTimeout(() => setSuccess(""), 4000);
            } else {
                setError(data.message || "An unknown error occurred.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to connect to the server.");
        }
    }

    return (
        <div className="flex flex-row min-h-screen">
            <img
                src="./src/assets/icons/SignUpPlant.png"
                alt="Plant"
                className="h-auto object-cover hidden md:block"
            />
            <div className="flex-[3.3] bg-garden flex items-center justify-center px-6 py-10">

                <form onSubmit={handleRegister}
                      className="w-full max-w-md space-y-6">

                    <h1 className={`text-2xl font-normal text-gray-900`}>
                        SoilSync
                    </h1>
                    <h2 className={
                        `text-3xl font-bold whitespace-nowrap text-left text-landingPageIcons`
                    }>
                        Plant the seed — AI will help it thrive.
                    </h2>

                    {/* Success and Error messages */}
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

                    {/* Name */}
                    <div>
                        <label className="block mb-2 font-semibold text-landingPageIcons">Name</label>
                        <input
                            type="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-landingPageIcons"
                            placeholder="Enter your name"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block mb-2 font-semibold text-landingPageIcons">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-landingPageIcons"
                            placeholder="Enter your email"
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

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full bg-landingPageIcons hover:bg-darkLandingPageIcons text-white font-semibold py-2 px-4 rounded-lg transition-all"
                    >
                        Register
                    </button>

                    {/* Login redirect */}
                    <p className="text-center text-gray-700 text-sm">
                        Already have an account?{" "}
                        <Link to="/login" className="text-landingPageIcons font-semibold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
