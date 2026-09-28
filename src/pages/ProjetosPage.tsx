import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FolderOpen, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { ProjectCard, type ProjetoCardData } from "@/components/common/ProjectCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const POR_PAGINA = 12;

/** Colunas explícitas em vez de `select("*")`: menos bytes por card (P3). */
const COLUNAS = "id, nome_projeto, descricao, img_url, data_fim, id_ong";

async function buscarProjetos(termo: string, pagina: number) {
  const de = pagina * POR_PAGINA;
  let query = supabase
    .from("projetos")
    .select(COLUNAS, { count: "exact" })
    .eq("status", true)
    .order("created_at", { ascending: false })
    .range(de, de + POR_PAGINA - 1);

  if (termo.trim()) {
    const escapado = termo.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`nome_projeto.ilike.%${escapado}%,descricao.ilike.%${escapado}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const projetos = data ?? [];
  const idsDasOngs = [...new Set(projetos.map((p) => p.id_ong).filter(Boolean))];

  let nomePorOng = new Map<string, string>();
  if (idsDasOngs.length > 0) {
    const { data: ongs } = await supabase.from("ongs").select("id, nome, cidade").in("id", idsDasOngs);
    nomePorOng = new Map((ongs ?? []).map((o) => [o.id, o.nome]));
  }

  return {
    total: count ?? 0,
    projetos: projetos.map<ProjetoCardData>((p) => ({
      id: p.id,
      nome_projeto: p.nome_projeto,
      descricao: p.descricao,
      img_url: p.img_url,
      data_fim: p.data_fim,
      ongNome: nomePorOng.get(p.id_ong) ?? null,
    })),
  };
}

export default function ProjetosPage() {
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [pagina, setPagina] = useState(0);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["projetos", { termo, pagina }],
    queryFn: () => buscarProjetos(termo, pagina),
    placeholderData: keepPreviousData,
  });

  const aplicarBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setPagina(0);
    setTermo(busca);
  };

  const total = data?.total ?? 0;
  const ultimaPagina = Math.max(0, Math.ceil(total / POR_PAGINA) - 1);

  return (
    <PublicShell>
      <Seo
        title="Projetos"
        description="Veja os projetos das ONGs parceiras e descubra do que elas precisam agora."
      />
      <div className="container py-12">
        <h1 className="text-3xl font-bold">Projetos</h1>
        <p className="mt-2 text-muted-foreground">
          Encontre um projeto e veja como ajudar.
        </p>

        <form onSubmit={aplicarBusca} className="mt-6 flex max-w-lg gap-2" noValidate>
          <div className="flex-1">
            <Label htmlFor="busca-projetos" className="sr-only">
              Buscar projetos
            </Label>
            <Input
              id="busca-projetos"
              name="busca"
              type="search"
              placeholder="Buscar por nome ou descrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button type="submit">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            Buscar
          </Button>
        </form>

        <div className="mt-8" aria-busy={isFetching}>
          {isPending ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="mt-4 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Não foi possível carregar os projetos"
              onRetry={() => refetch()}
            />
          ) : total === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={termo ? "Nenhum projeto encontrado" : "Ainda não há projetos publicados"}
              description={
                termo
                  ? "Tente outra busca ou veja todas as ONGs parceiras."
                  : "Assim que uma ONG publicar um projeto, ele aparece aqui."
              }
              action={{ label: "Ver ONGs parceiras", to: "/ongs" }}
            />
          ) : (
            <>
              <p className="sr-only" role="status">
                {total} {total === 1 ? "projeto encontrado" : "projetos encontrados"}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.projetos.map((projeto) => (
                  <ProjectCard key={projeto.id} projeto={projeto} />
                ))}
              </div>

              {ultimaPagina > 0 && (
                <nav
                  className="mt-10 flex items-center justify-center gap-4"
                  aria-label="Paginação dos projetos"
                >
                  <Button
                    variant="outline"
                    onClick={() => setPagina((p) => Math.max(0, p - 1))}
                    disabled={pagina === 0}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {pagina + 1} de {ultimaPagina + 1}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
                    disabled={pagina >= ultimaPagina}
                  >
                    Próxima
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}
