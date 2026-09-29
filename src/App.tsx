import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { LazyMotion, MotionConfig } from "motion/react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { PageSkeleton } from "@/components/common/PageSkeleton";

// A home entra no bundle inicial: é a primeira tela de quase todo visitante,
// e adiar seu chunk só adicionaria um ida-e-volta antes do primeiro conteúdo.
import HomePage from "./pages/HomePage";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const CadastroPage = lazy(() => import("./pages/CadastroPage"));
const OngsPublicPage = lazy(() => import("./pages/OngsPublicPage"));
const ProjetosPage = lazy(() => import("./pages/ProjetosPage"));
const ProjetoPage = lazy(() => import("./pages/ProjetoPage"));
const OngPage = lazy(() => import("./pages/OngPage"));
const DoarProjetoPage = lazy(() => import("./pages/DoarProjetoPage"));
const ObrigadoPage = lazy(() => import("./pages/ObrigadoPage"));
const DoarPage = lazy(() => import("./pages/DoarPage"));
const EsqueciSenhaPage = lazy(() => import("./pages/EsqueciSenhaPage"));
const RedefinirSenhaPage = lazy(() => import("./pages/RedefinirSenhaPage"));
const SobrePage = lazy(() => import("./pages/conteudo/SobrePage"));
const ComoFuncionaPage = lazy(() => import("./pages/conteudo/ComoFuncionaPage"));
const PrivacidadePage = lazy(() => import("./pages/conteudo/PrivacidadePage"));
const TermosPage = lazy(() => import("./pages/conteudo/TermosPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOngs = lazy(() => import("./pages/admin/AdminOngs"));
const AdminUsuarios = lazy(() => import("./pages/admin/AdminUsuarios"));
const AdminProjetos = lazy(() => import("./pages/admin/AdminProjetos"));
const AdminDoacoes = lazy(() => import("./pages/admin/AdminDoacoes"));
const AdminVoluntarios = lazy(() => import("./pages/admin/AdminVoluntarios"));
const AdminEventos = lazy(() => import("./pages/admin/AdminEventos"));
const AdminAuditoria = lazy(() => import("./pages/admin/AdminAuditoria"));
const AdminCodigos = lazy(() => import("./pages/admin/AdminCodigos"));

const OngDashboard = lazy(() => import("./pages/ong/OngDashboard"));
const OngProjetos = lazy(() => import("./pages/ong/OngProjetos"));
const OngNecessidades = lazy(() => import("./pages/ong/OngNecessidades"));
const OngMembros = lazy(() => import("./pages/ong/OngMembros"));
const OngDoacoes = lazy(() => import("./pages/ong/OngDoacoes"));
const OngVoluntarios = lazy(() => import("./pages/ong/OngVoluntarios"));
const OngAuditoria = lazy(() => import("./pages/ong/OngAuditoria"));

/**
 * Recursos de animação carregados sob demanda: o `m` (não `motion`) renderiza
 * estático até o chunk chegar, e `strict` acusa em desenvolvimento quem usar
 * `motion.div` por engano, o que traria a biblioteca inteira para o bundle
 * inicial. `domMax` inclui layout e drag, que o stepper de doação usa.
 */
const carregarMotion = () => import("./lib/recursosDeMovimento").then((mod) => mod.default);

/**
 * Cada navegação nasce num contêiner novo (chave = rota), e `@starting-style`
 * no CSS faz a página entrar deslizando de leve. Sem JavaScript de transição
 * e sem esconder conteúdo: quem pediu menos movimento vê a troca seca.
 */
function EntradaDeRota({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="entrada-rota">
      {children}
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dado público desta plataforma muda devagar; 5 min evita refetch a cada
      // navegação entre home, listagem e detalhe.
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={carregarMotion} strict>
      <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <ErrorBoundary>
              <Suspense fallback={<PageSkeleton />}>
                <EntradaDeRota>
                <Routes>
                  {/* Público */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/cadastro" element={<CadastroPage />} />
                  <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
                  <Route path="/ongs" element={<OngsPublicPage />} />
                  <Route path="/projetos" element={<ProjetosPage />} />
                  <Route path="/projetos/:slug" element={<ProjetoPage />} />
                  <Route path="/ongs/:slug" element={<OngPage />} />
                  <Route path="/doar/projeto/:slug" element={<DoarProjetoPage />} />
                  <Route path="/obrigado/:id" element={<ObrigadoPage />} />
                  <Route path="/doar/:ongId" element={<DoarPage />} />

                  {/* Rota antiga, por UUID: links já compartilhados continuam
                      funcionando e caem na página nova. */}
                  <Route path="/projeto/:slug" element={<ProjetoPage />} />

                  {/* Conteúdo institucional */}
                  <Route path="/sobre" element={<SobrePage />} />
                  <Route path="/como-funciona" element={<ComoFuncionaPage />} />
                  <Route path="/privacidade" element={<PrivacidadePage />} />
                  <Route path="/termos" element={<TermosPage />} />

                  {/* Admin */}
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/ongs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOngs /></ProtectedRoute>} />
                  <Route path="/admin/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsuarios /></ProtectedRoute>} />
                  <Route path="/admin/projetos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminProjetos /></ProtectedRoute>} />
                  <Route path="/admin/doacoes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDoacoes /></ProtectedRoute>} />
                  <Route path="/admin/voluntarios" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVoluntarios /></ProtectedRoute>} />
                  <Route path="/admin/eventos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminEventos /></ProtectedRoute>} />
                  <Route path="/admin/auditoria" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAuditoria /></ProtectedRoute>} />
                  <Route path="/admin/codigos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCodigos /></ProtectedRoute>} />

                  {/* ONG */}
                  <Route path="/ong" element={<ProtectedRoute allowedRoles={["ong"]}><OngDashboard /></ProtectedRoute>} />
                  <Route path="/ong/projetos" element={<ProtectedRoute allowedRoles={["ong"]}><OngProjetos /></ProtectedRoute>} />
                  <Route path="/ong/necessidades" element={<ProtectedRoute allowedRoles={["ong"]}><OngNecessidades /></ProtectedRoute>} />
                  <Route path="/ong/membros" element={<ProtectedRoute allowedRoles={["ong"]}><OngMembros /></ProtectedRoute>} />
                  <Route path="/ong/doacoes" element={<ProtectedRoute allowedRoles={["ong"]}><OngDoacoes /></ProtectedRoute>} />
                  <Route path="/ong/voluntarios" element={<ProtectedRoute allowedRoles={["ong"]}><OngVoluntarios /></ProtectedRoute>} />
                  <Route path="/ong/auditoria" element={<ProtectedRoute allowedRoles={["ong"]}><OngAuditoria /></ProtectedRoute>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </EntradaDeRota>
              </Suspense>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
