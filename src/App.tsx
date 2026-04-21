import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BranchProvider } from "@/contexts/BranchContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import DashboardHome from "./pages/dashboard/DashboardHome";
import AddCoach from "./pages/dashboard/AddCoach";
import AddPlayer from "./pages/dashboard/AddPlayer";
import Directory from "./pages/dashboard/Directory";
import MemberProfile from "./pages/dashboard/MemberProfile";
import Finances from "./pages/dashboard/Finances";
import AddPackage from "./pages/dashboard/AddPackage";
import AddGroup from "./pages/dashboard/AddGroup";
import PlayerDirectory from "./pages/dashboard/PlayerDirectory";
import PlayerProfile from "./pages/dashboard/PlayerProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Never throw to the render tree — errors stay inside useQuery's `error` field
      throwOnError: false,
      // Keep stale data visible while revalidating (avoids flicker on nav)
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      throwOnError: false,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<DashboardHome />} />
      <Route path="/dashboard/add-coach" element={<AddCoach />} />
      <Route path="/dashboard/add-player" element={<AddPlayer />} />
      <Route path="/dashboard/directory" element={<Directory />} />
      <Route path="/dashboard/member/:userId" element={<MemberProfile />} />
      <Route path="/dashboard/finances" element={<Finances />} />
      <Route path="/dashboard/add-package" element={<AddPackage />} />
      <Route path="/dashboard/add-group" element={<AddGroup />} />
      <Route path="/dashboard/players" element={<PlayerDirectory />} />
      <Route path="/dashboard/players/:profileId" element={<PlayerProfile />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BranchProvider>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BranchProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
