import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CRMProvider } from "./contexts/CRMContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import AIAssistant from "./pages/AIAssistant";
import Booking from "./pages/Booking";
import Warehouse from "./pages/Warehouse";
import Projects from "./pages/Projects";
import Subscriptions from "./pages/Subscriptions";
import Documents from "./pages/Documents";
import Telephony from "./pages/Telephony";
import EmailMarketing from "./pages/EmailMarketing";
import Analytics from "./pages/Analytics";
import DataFlows from "./pages/DataFlows";
import SettingsPage from "./pages/Settings";
import Finance from "./pages/Finance";
import Orders from "./pages/Orders";
import Sites from "./pages/Sites";
import WebLeads from "./pages/WebLeads";
import AuthPage from "./pages/Auth";
import MessagesPage from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ("admin" | "manager" | "observer")[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (allowedRoles && !allowedRoles.includes(user.appRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
      <Route path="/booking" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Booking /></ProtectedRoute>} />
      <Route path="/warehouse" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Warehouse /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Projects /></ProtectedRoute>} />
      <Route path="/subscriptions" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Subscriptions /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Documents /></ProtectedRoute>} />
      <Route path="/telephony" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Telephony /></ProtectedRoute>} />
      <Route path="/email" element={<ProtectedRoute allowedRoles={["admin"]}><EmailMarketing /></ProtectedRoute>} />
      <Route path="/data-flows" element={<ProtectedRoute allowedRoles={["admin"]}><DataFlows /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute allowedRoles={["admin", "observer"]}><Analytics /></ProtectedRoute>} />
      <Route path="/finance" element={<ProtectedRoute allowedRoles={["admin"]}><Finance /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><Orders /></ProtectedRoute>} />
      <Route path="/sites" element={<ProtectedRoute allowedRoles={["admin"]}><Sites /></ProtectedRoute>} />
      <Route path="/web-leads" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><WebLeads /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute allowedRoles={["admin", "manager"]}><MessagesPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CRMProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CRMProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
