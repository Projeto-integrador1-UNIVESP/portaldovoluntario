import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ErrorState } from "@/components/common/ErrorState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { POR_PAGINA } from "./_shared-lib";

/**
 * Peças comuns às nove telas do painel administrativo.
 *
 * A auditoria apontou o mesmo CRUD reimplementado em cinco telas, `confirm()`
 * nativo em algumas e `AlertDialog` em outras, e lista nenhuma com skeleton,
 * vazio ou erro. Em vez de repetir a correção nove vezes, o padrão vive aqui.
 *
 * Não é página: as rotas em `App.tsx` são declaradas uma a uma, então um módulo
 * nesta pasta não vira rota.
 */

export type ColunaAdmin = { rotulo: string; className?: string };

type TabelaAdminProps = {
  colunas: ColunaAdmin[];
  carregando: boolean;
  erro: boolean;
  tituloErro: string;
  aoTentarDeNovo: () => void;
  /** `true` quando a consulta terminou sem nenhuma linha. */
  vazia: boolean;
  /** `EmptyState` da lista — sempre com ação. */
  vazio: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
};

/**
 * Tabela do painel com os três estados obrigatórios e rolagem própria.
 *
 * O `Table` do shadcn já embrulha a tabela num contêiner com `overflow-auto`,
 * então a rolagem horizontal fica dentro do card em vez de empurrar o layout
 * no celular.
 */
export function TabelaAdmin({
  colunas, carregando, erro, tituloErro, aoTentarDeNovo, vazia, vazio, children, rodape,
}: TabelaAdminProps) {
  if (erro) {
    return <ErrorState title={tituloErro} onRetry={aoTentarDeNovo} />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        {carregando ? (
          <EsqueletoDeTabela colunas={colunas} />
        ) : vazia ? (
          <div className="p-6">{vazio}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {colunas.map((c) => (
                  <TableHead key={c.rotulo} className={c.className}>
                    {c.rotulo}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        )}
      </CardContent>
      {!carregando && !vazia && rodape}
    </Card>
  );
}

/** Skeleton com a forma da tabela real: mesmo cabeçalho, mesmas colunas. */
function EsqueletoDeTabela({ colunas, linhas = 6 }: { colunas: ColunaAdmin[]; linhas?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Carregando registros…</span>
      <Table>
        <TableHeader>
          <TableRow>
            {colunas.map((c) => (
              <TableHead key={c.rotulo} className={c.className}>
                {c.rotulo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: linhas }).map((_, linha) => (
            <TableRow key={linha}>
              {colunas.map((c) => (
                <TableCell key={c.rotulo}>
                  <Skeleton className={cn("h-4", linha % 2 ? "w-2/3" : "w-4/5")} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Exclusão com confirmação. Substitui o `confirm()` nativo, que não respeita o
 * tema, não é traduzível e em alguns navegadores pode ser suprimido pelo
 * usuário — apagando um registro sem perguntar nada.
 */
export function ExcluirLinha({
  titulo, descricao, rotuloConfirmar = "Excluir", rotuloAcessivel, aoConfirmar, desabilitado,
}: {
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar?: string;
  /** Nome do item, para o leitor de tela distinguir um botão de lixeira do outro. */
  rotuloAcessivel: string;
  aoConfirmar: () => void;
  desabilitado?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={rotuloAcessivel}
          disabled={desabilitado}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={aoConfirmar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Confirmação para uma ação que não é exclusão, com gatilho próprio. */
export function ConfirmarAcao({
  titulo, descricao, rotuloConfirmar, aoConfirmar, destrutivo, children,
}: {
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  aoConfirmar: () => void;
  destrutivo?: boolean;
  children: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={aoConfirmar}
            className={destrutivo ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Liga/desliga um registro. Antes era `Badge` clicável em Projetos e Eventos e
 * `Switch` em ONGs e Usuários — o mesmo gesto com duas aparências, e a versão
 * em `Badge` não era alcançável pelo teclado como controle de estado.
 */
export function AlternarStatus({
  ativo, aoAlternar, rotulo, ocupado,
}: {
  ativo: boolean;
  aoAlternar: () => void;
  /** Identifica o que o controle liga, ex.: "Status de Casa do Caminho". */
  rotulo: string;
  ocupado?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={ativo} onCheckedChange={aoAlternar} disabled={ocupado} aria-label={rotulo} />
      <span className={cn("text-xs", ativo ? "text-foreground" : "text-muted-foreground")}>
        {ativo ? "Ativo" : "Inativo"}
      </span>
    </div>
  );
}

/**
 * Paginação servidor-side. Nenhuma tela do painel tinha: todas faziam
 * `select("*")` da tabela inteira e travariam com alguns milhares de linhas.
 *
 * `pagina` começa em zero, como o `.range()` do Supabase.
 */
export function Paginacao({
  pagina, total, aoMudar, porPagina = POR_PAGINA,
}: {
  pagina: number;
  total: number;
  aoMudar: (pagina: number) => void;
  porPagina?: number;
}) {
  if (total <= porPagina) return null;

  const ultimaPagina = Math.max(0, Math.ceil(total / porPagina) - 1);
  const primeiro = pagina * porPagina + 1;
  const ultimo = Math.min(total, (pagina + 1) * porPagina);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
      <p className="text-sm tabular-nums text-muted-foreground">
        {primeiro}–{ultimo} de {total}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={pagina <= 0} onClick={() => aoMudar(pagina - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= ultimaPagina}
          onClick={() => aoMudar(pagina + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/** Campo de formulário com `Label` associado por `id`. */
export function Campo({
  id, rotulo, obrigatorio, dica, children, className,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const idDaDica = `${id}-dica`;

  // A dica precisa chegar ao leitor de tela, e quem passa o controle é a tela.
  // Ligar aqui evita depender de cada chamada lembrar do `aria-describedby`.
  const controle =
    dica && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
          "aria-describedby": idDaDica,
        })
      : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </Label>
      {controle}
      {dica && (
        <p id={idDaDica} className="text-xs text-muted-foreground">
          {dica}
        </p>
      )}
    </div>
  );
}

/** Selo de ONG verificada pela administração — o que o site público exibe. */
export function SeloVerificada({ verificadaEm }: { verificadaEm: string | null }) {
  if (!verificadaEm) {
    return <span className="text-xs text-muted-foreground">Aguardando verificação</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Verificada em {formatDate(verificadaEm)}
    </span>
  );
}
