import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/einkaufsplanung" element={<PurchasePlanning />} />
          <Route path="/flotte" element={<Fleet />} />
          <Route path="/flotte/:id" element={<VehicleDetail />} />
          <Route path="/vorgaenge" element={<ProcessList />} />
          <Route path="/vorgaenge/:id" element={<ProcessDetail />} />
          <Route path="/kunden" element={<Customers />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
