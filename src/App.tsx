import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Demands from "./pages/Demands";
import Conformidades from "./pages/Conformidades";
import Agendamentos from "./pages/AgendamentosNew";
import Empregados from "./pages/Empregados";
import EmailTemplates from "./pages/EmailTemplates";
import Settings from "./pages/Settings";
import LeitorDocumentos from "./pages/LeitorDocumentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/demands" element={<Demands />} />
          <Route path="/conformidades" element={<Conformidades />} />
          <Route path="/agendamentos" element={<Agendamentos />} />
          <Route path="/empregados" element={<Empregados />} />
          <Route path="/email-templates" element={<EmailTemplates />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/leitor-documentos" element={<LeitorDocumentos />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
