import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/common/Seo";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate, formatPhone } from "@/lib/format";

/**
 * Quem pode administrar a ONG.
 *
 * O nome e o e-mail vinham de um embed `profiles:id_usuario(...)`, que o
 * PostgREST não resolve: `usuarios_ong.id_usuario` aponta para `auth.users`, não
 * para `profiles`, então não existe chave estrangeira para ele seguir. A
 * consulta falhava inteira e a tabela ficava vazia. Agora são duas consultas,
 * com o cruzamento pelo `user_id`.
 */
export default function OngMembros() {
  const { ongId } = useAuth();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["ong-membros", ongId],
    queryFn: async () => {
      const { data: vinculos, error } = await supabase
        .from("usuarios_ong")
        .select("id, id_usuario, data_inicio, status")
        .eq("id_ong", ongId!)
        .order("data_inicio", { ascending: true });
      if (error) throw error;

      const linhas = vinculos ?? [];
      const ids = [...new Set(linhas.map((m) => m.id_usuario).filter(Boolean))];

      const perfis = ids.length
        ? await supabase
            .from("profiles")
            .select("user_id, nome, email, telefone")
            .in("user_id", ids)
        : { data: [] };

      const porUsuario = new Map((perfis.data ?? []).map((p) => [p.user_id, p]));

      return linhas.map((m) => ({ ...m, pessoa: porUsuario.get(m.id_usuario) ?? null }));
    },
    enabled: Boolean(ongId),
    staleTime: 60_000,
  });

  return (
    <DashboardLayout type="ong">
      <Seo title="Membros" noIndex />
      <PageHeader
        title="Membros"
        description="Quem pode publicar necessidades e confirmar recebimentos por esta ONG."
        icon={<Users className="h-6 w-6" aria-hidden="true" />}
      />

      {isError ? (
        <ErrorState title="Não foi possível carregar os membros" onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro vinculado"
          description="Quem for administrar a ONG com você precisa se cadastrar com o código de acesso da organização."
          action={{ label: "Ver como o cadastro de ONG funciona", to: "/como-funciona" }}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.pessoa?.nome || "Cadastro incompleto"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.pessoa?.email || "Não informado"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {m.pessoa?.telefone ? formatPhone(m.pessoa.telefone) : "Não informado"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(m.data_inicio)}
                    </TableCell>
                    <TableCell>
                      {m.status === false ? (
                        <Badge variant="secondary">Desligado</Badge>
                      ) : (
                        <Badge className="bg-success text-success-foreground">Ativo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
