import { Suspense, lazy } from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Route-level code splitting: each page ships as its own chunk instead of
// one ~950 kB bundle, so the initial load only pays for the login/dashboard
// screen the user actually lands on.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const VehicleDetail = lazy(() => import('./pages/VehicleDetail'));
const Drivers = lazy(() => import('./pages/Drivers'));
const Trips = lazy(() => import('./pages/Trips'));
const Fuel = lazy(() => import('./pages/Fuel'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Defects = lazy(() => import('./pages/Defects'));
const DriverPortal = lazy(() => import('./pages/DriverPortal'));
// Add page imports here

const RouteFallback = () => (
<div className="flex h-[60vh] items-center justify-center">
<div className="h-10 w-10 rounded-full border-4 border-secondary border-t-primary animate-spin" />
</div>
);

const AuthenticatedApp = () => {
const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

// Show loading spinner while checking app public settings or auth
if (isLoadingPublicSettings || isLoadingAuth) {
return (
<div className="fixed inset-0 flex items-center justify-center">
<div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
</div>
);
}

// Handle authentication errors
if (authError) {
if (authError.type === 'user_not_registered') {
return <UserNotRegisteredError />;
} else if (authError.type === 'auth_required') {
// Redirect to login automatically
navigateToLogin();
return null;
}
}

// Render the main app
return (
<Suspense fallback={<RouteFallback />}>
<Routes>
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
<Route element={<Layout />}>
<Route path="/" element={<Dashboard />} />
<Route path="/vehicles" element={<Vehicles />} />
<Route path="/vehicles/:id" element={<VehicleDetail />} />
<Route path="/drivers" element={<Drivers />} />
<Route path="/trips" element={<Trips />} />
<Route path="/fuel" element={<Fuel />} />
<Route path="/maintenance" element={<Maintenance />} />
<Route path="/defects" element={<Defects />} />
<Route path="/driver-portal" element={<DriverPortal />} />
</Route>
</Route>
<Route path="*" element={<PageNotFound />} />
</Routes>
</Suspense>
);
};

function App() {

return (
<AuthProvider>
<QueryClientProvider client={queryClientInstance}>
<Router>
<ScrollToTop />
<AuthenticatedApp />
</Router>
<Toaster />
</QueryClientProvider>
</AuthProvider>
)
}

export default App
