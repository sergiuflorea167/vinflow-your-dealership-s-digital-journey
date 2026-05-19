import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProcessList from "./pages/ProcessList.tsx";
import ProcessDetail from "./pages/ProcessDetail.tsx";
import Fleet from "./pages/Fleet.tsx";
import VehicleDetail from "./pages/VehicleDetail.tsx";
import PurchasePlanning from "./pages/PurchasePlanning.tsx";
import Customers from "./pages/Customers.tsx";
import KPIs from "./pages/KPIs.tsx";
import Insights from "./pages/Insights.tsx";
import OfferDetail from "./pages/OfferDetail.tsx";
import Todos from "./pages/Todos.tsx";
import Calendar from "./pages/Calendar.tsx";
import Stammdaten from "./pages/Stammdaten.tsx";
import CustomerTracking from "./pages/CustomerTracking.tsx";
import Auth from "./pages/Auth.tsx";
import { TopbarSearchProvider } from "./context/TopbarSearchContext";
import { KpiRangeProvider } from "./context/KpiRangeContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const RedirectVehicle = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/bestand/${id ?? ""}`} replace />;
};

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <TopbarSearchProvider>
      <KpiRangeProvider>{children}</KpiRangeProvider>
    </TopbarSearchProvider>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/track/:token" element={<CustomerTracking />} />

            <Route path="/" element={<Protected><Index /></Protected>} />
            <Route path="/einkaufsplanung" element={<Protected><PurchasePlanning /></Protected>} />
            <Route path="/bestand" element={<Protected><Fleet /></Protected>} />
            <Route path="/bestand/:id" element={<Protected><VehicleDetail /></Protected>} />
            <Route path="/flotte" element={<Navigate to="/bestand" replace />} />
            <Route path="/flotte/:id" element={<RedirectVehicle />} />
            <Route path="/vorgaenge" element={<Protected><ProcessList /></Protected>} />
            <Route path="/vorgaenge/:id" element={<Protected><ProcessDetail /></Protected>} />
            <Route path="/angebote/:id" element={<Protected><OfferDetail /></Protected>} />
            <Route path="/kunden" element={<Protected><Customers /></Protected>} />
            <Route path="/kpis" element={<Protected><KPIs /></Protected>} />
            <Route path="/insights" element={<Protected><Insights /></Protected>} />
            <Route path="/todos" element={<Protected><Todos /></Protected>} />
            <Route path="/kalender" element={<Protected><Calendar /></Protected>} />
            <Route path="/stammdaten" element={<Protected><Stammdaten /></Protected>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
