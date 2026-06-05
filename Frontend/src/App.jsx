import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

const LandingPage = lazy(() => import("./Pages/LandingPage"));
const PlantList = lazy(() => import("./Pages/PlantList"));
const PlantDetails = lazy(() => import("./Pages/PlantDetails"));
const ProfilePage = lazy(() => import("./Pages/ProfilePage"));
const AdminPage = lazy(() => import("./Pages/AdminPage"));
const Recommender = lazy(() => import("./Pages/Recommender"));
const GardenDrawer = lazy(() => import("./Pages/GardenDrawer"));
const PremiumAssistant = lazy(() => import("./Pages/PremiumAssistant"));
const CommunityPage = lazy(() => import("./Pages/CommunityPage"));
const CommunityPostPage = lazy(() => import("./Pages/CommunityPostPage"));
const CommunityMemberPage = lazy(() => import("./Pages/CommunityMemberPage"));
const CommunityCreatePage = lazy(() => import("./Pages/CommunityCreatePage"));
const CommunityTopicsPage = lazy(() => import("./Pages/CommunityTopicsPage"));
const SignInForm = lazy(() => import("./components/SignInForm"));
const SignUpForm = lazy(() => import("./components/SignUpForm"));
const ForgotPassword = lazy(() => import("./components/ForgotPassword"));
const ResetPassword = lazy(() => import("./components/ResetPassword"));

function RequireAuth({ children }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function RouteFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,242,229,0.98)_36%,_rgba(214,224,198,1)_100%)] font-dm text-greenDark">
            <div className="rounded-full border border-[#dbe6cf] bg-white/92 px-5 py-3 text-sm font-semibold shadow-[0_12px_32px_rgba(52,78,24,0.1)]">
                Loading...
            </div>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/plants" element={<PlantList />} />
                    <Route path="/plant/:id" element={<PlantDetails />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/garden-drawer" element={<GardenDrawer />} />
                    <Route path="/premium-assistant" element={<PremiumAssistant />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/community/post/:postId" element={<CommunityPostPage />} />
                    <Route path="/community/member/:username" element={<CommunityMemberPage />} />
                    <Route path="/community/create" element={<CommunityCreatePage />} />
                    <Route path="/community/topics" element={<CommunityTopicsPage />} />
                    <Route path="/login" element={<SignInForm />} />
                    <Route path="/register" element={<SignUpForm />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
                    <Route
                        path="/recommender"
                        element={
                            <RequireAuth>
                                <Recommender />
                            </RequireAuth>
                        }
                    />
                </Routes>
            </Suspense>
        </AuthProvider>
    );
}
