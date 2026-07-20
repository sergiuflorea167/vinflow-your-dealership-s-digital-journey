import { lazy, Suspense, useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopbarSearchProvider } from "./context/TopbarSearchContext";
import { KpiRangeProvider } from "./context/KpiRangeContext";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { WorkshopArea } from "./components/workshop/WorkshopArea";
import { WorkshopChapterEntry } from "./components/workshop/WorkshopChapterEntry";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ProcessList = lazy(() => import("./pages/ProcessList.tsx"));
const ProcessDetail = lazy(() => import("./pages/ProcessDetail.tsx"));
const Fleet = lazy(() => import("./pages/Fleet.tsx"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail.tsx"));
const PurchasePlanning = lazy(() => import("./pages/PurchasePlanning.tsx"));
const Customers = lazy(() => import("./pages/Customers.tsx"));
const KPIs = lazy(() => import("./pages/KPIs.tsx"));
const Insights = lazy(() => import("./pages/Insights.tsx"));
const OfferDetail = lazy(() => import("./pages/OfferDetail.tsx"));
const Todos = lazy(() => import("./pages/Todos.tsx"));
const Calendar = lazy(() => import("./pages/Calendar.tsx"));
const Stammdaten = lazy(() => import("./pages/Stammdaten.tsx"));
const Konfiguration = lazy(() => import("./pages/Konfiguration.tsx"));
const CustomerTracking = lazy(() => import("./pages/CustomerTracking.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const WorkshopHome = lazy(() => import("./pages/WorkshopHome.tsx"));

const RouteFallback = () => (
  <div className="min-h-screen grid place-items-center bg-background">
    <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const RedirectVehicle = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/bestand/${id ?? ""}`} replace />;
};

const Protected = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <TopbarSearchProvider>
      <KpiRangeProvider>{children}</KpiRangeProvider>
    </TopbarSearchProvider>
  </ProtectedRoute>
);

const RecoveryRedirectGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const recoveryInHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type") === "recovery";
    const recoveryInSearch = new URLSearchParams(location.search).get("type") === "recovery";

    if ((recoveryInHash || recoveryInSearch) && location.pathname !== "/reset-password") {
      navigate(`/reset-password${location.search}${window.location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <RecoveryRedirectGuard />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route path="/einstellungen" element={<Navigate to="/konfiguration" replace />} />
              <Route path="/konfiguration" element={<Protected><Konfiguration /></Protected>} />

              {/* Eigenständige Workshop-Unterwebseite — eigene Chrome (siehe AppShell), Beispieldaten, kein Zugriff auf echte Daten */}
              <Route path="/workshop" element={<Protected><WorkshopArea /></Protected>}>
                <Route index element={<WorkshopHome />} />
                <Route path="dashboard" element={<WorkshopChapterEntry chapterKey="dashboard"><Dashboard /></WorkshopChapterEntry>} />
                <Route path="bestand" element={<WorkshopChapterEntry chapterKey="fleet"><Fleet /></WorkshopChapterEntry>} />
                <Route path="bestand/:id" element={<WorkshopChapterEntry chapterKey="processes" fallbackRoute="/workshop/vorgaenge"><VehicleDetail /></WorkshopChapterEntry>} />
                <Route path="vorgaenge" element={<WorkshopChapterEntry chapterKey="processes"><ProcessList /></WorkshopChapterEntry>} />
                <Route path="vorgaenge/:id" element={<WorkshopChapterEntry chapterKey="processes" fallbackRoute="/workshop/vorgaenge"><ProcessDetail /></WorkshopChapterEntry>} />
                <Route path="einkaufsplanung" element={<WorkshopChapterEntry chapterKey="purchase"><PurchasePlanning /></WorkshopChapterEntry>} />
                <Route path="todos" element={<WorkshopChapterEntry chapterKey="todos"><Todos /></WorkshopChapterEntry>} />
                <Route path="kalender" element={<WorkshopChapterEntry chapterKey="calendar"><Calendar /></WorkshopChapterEntry>} />
                <Route path="kpis" element={<WorkshopChapterEntry chapterKey="kpis"><KPIs /></WorkshopChapterEntry>} />
                <Route path="insights" element={<WorkshopChapterEntry chapterKey="insights"><Insights /></WorkshopChapterEntry>} />
                <Route path="stammdaten" element={<WorkshopChapterEntry chapterKey="master"><Stammdaten /></WorkshopChapterEntry>} />
                <Route path="konfiguration" element={<WorkshopChapterEntry chapterKey="settings"><Konfiguration /></WorkshopChapterEntry>} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
