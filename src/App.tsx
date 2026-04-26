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
import Todos from "./pages/Todos.tsx";
import Calendar from "./pages/Calendar.tsx";
import Stammdaten from "./pages/Stammdaten.tsx";
import { TopbarSearchProvider } from "./context/TopbarSearchContext";
import { KpiRangeProvider } from "./context/KpiRangeContext";

const queryClient = new QueryClient();

const RedirectVehicle = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/bestand/${id ?? ""}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TopbarSearchProvider>
        <KpiRangeProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/einkaufsplanung" element={<PurchasePlanning />} />
          <Route path="/bestand" element={<Fleet />} />
          <Route path="/bestand/:id" element={<VehicleDetail />} />
          {/* Backwards compatibility for old "Flotte" links */}
          <Route path="/flotte" element={<Navigate to="/bestand" replace />} />
          <Route path="/flotte/:id" element={<RedirectVehicle />} />
          <Route path="/vorgaenge" element={<ProcessList />} />
          <Route path="/vorgaenge/:id" element={<ProcessDetail />} />
          <Route path="/kunden" element={<Customers />} />
          <Route path="/kpis" element={<KPIs />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/stammdaten" element={<Stammdaten />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </KpiRangeProvider>
        </TopbarSearchProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
