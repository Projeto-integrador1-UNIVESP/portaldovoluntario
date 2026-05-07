import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import CadastroPage from "./pages/CadastroPage";
import OngsPublicPage from "./pages/OngsPublicPage";
import ProjetoDetalhePage from "./pages/ProjetoDetalhePage";
import DoarPage from "./pages/DoarPage";
import NotFound from "./pages/NotFound";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOngs from "./pages/admin/AdminOngs";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminProjetos from "./pages/admin/AdminProjetos";
import AdminDoacoes from "./pages/admin/AdminDoacoes";
import AdminVoluntarios from "./pages/admin/AdminVoluntarios";
import AdminEventos from "./pages/admin/AdminEventos";

import OngDashboard from "./pages/ong/OngDashboard";
import OngProjetos from "./pages/ong/OngProjetos";
import OngMembros from "./pages/ong/OngMembros";
import OngDoacoes from "./pages/ong/OngDoacoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/ongs" element={<OngsPublicPage />} />
            <Route path="/projeto/:id" element={<ProjetoDetalhePage />} />
            <Route path="/doar/:ongId" element={<DoarPage />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/ongs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOngs /></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsuarios /></ProtectedRoute>} />
            <Route path="/admin/projetos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminProjetos /></ProtectedRoute>} />
            <Route path="/admin/doacoes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDoacoes /></ProtectedRoute>} />
            <Route path="/admin/voluntarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVoluntarios /></ProtectedRoute>} />
            <Route path="/admin/eventos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventos /></ProtectedRoute>} />

            {/* ONG */}
            <Route path="/ong" element={<ProtectedRoute allowedRoles={["ong"]}><OngDashboard /></ProtectedRoute>} />
            <Route path="/ong/projetos" element={<ProtectedRoute allowedRoles={["ong"]}><OngProjetos /></ProtectedRoute>} />
            <Route path="/ong/membros" element={<ProtectedRoute allowedRoles={["ong"]}><OngMembros /></ProtectedRoute>} />
            <Route path="/ong/doacoes" element={<ProtectedRoute allowedRoles={["ong"]}><OngDoacoes /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
