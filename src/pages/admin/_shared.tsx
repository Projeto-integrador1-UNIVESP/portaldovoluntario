import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
import { ErrorState } from "@/components/common/ErrorState";
import { VAZIO } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { POR_PAGINA } from "./_shared-lib";

/**
 * Peças comuns às nove telas do painel administrativo.
 *
 * A auditoria apontou o mesmo CRUD reimplementado em cinco telas, quatro
 * padrões de confirmação de exclusão e formulário nenhum com erro inline. O
 * padrão vive aqui; as telas só o usam.
 *
 * Não é página: as rotas em `App.tsx` são declaradas uma a uma, então um módulo
 * nesta pasta não vira rota.
 */

/** O selo é o mesmo do site: um componente, um texto. */
export { SeloVerificada } from "@/components/common/SeloVerificada";

export type ColunaAdmin = { rotulo: string; className?: string };

type TabelaAdminProps = {
  colunas: ColunaAdmin[];
  carregando: boolean;
  erro: boolean;
  tituloErro: string;
  aoTentarDeNovo: () => void;
  /** `true` quando a consulta terminou sem nenhuma linha. */
  vazia: boolean;
  /** `EmptyState` da lista, sempre com ação. */
  vazio: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
};

const CABECALHO = "rotulo-caps h-11 whitespace-nowrap px-4 font-semibold";

/**
 * Tabela do painel com os três estados obrigatórios e rolagem própria.
 *
 * O `Table` do shadcn já embrulha a tabela num contêiner com `overflow-auto`,
 * então a rolagem horizontal fica dentro do card em vez de empurrar o layout
 * no celular. Cabeçalho em rótulo pequeno de caixa alta e linha com hover em
 * tinta, como o resto do produto; nada anima aqui.
 */
export function TabelaAdmin({
  colunas, carregando, erro, tituloErro, aoTentarDeNovo, vazia, vazio, children, rodape,
}: TabelaAdminProps) {
  if (erro) {
    return <ErrorState title={tituloErro} onRetry={aoTentarDeNovo} />;
  }

  if (!carregando && vazia) {
    return <div>{vazio}</div>;
  }

  return (
    <Card className="overflow-hidden">
      {carregando ? (
        <EsqueletoDeTabela colunas={colunas} />
      ) : (
        // Largura mínima: no celular a tabela rola dentro do card em vez de
        // esmagar as colunas até quebrar palavra por letra.
        <Table className="min-w-[760px]">
          <TableHeader className="bg-tinta-creme/50">
            <TableRow className="hover:bg-transparent">
              {colunas.map((c) => (
                <TableHead key={c.rotulo} className={cn(CABECALHO, c.className)}>
                  {c.rotulo}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr]:transition-colors [&>tr:hover]:bg-tinta-creme/60">
            {children}
          </TableBody>
        </Table>
      )}
      {!carregando && rodape}
    </Card>
  );
}

/** Skeleton com a forma da tabela real: mesmo cabeçalho, mesmas colunas. */
function EsqueletoDeTabela({ colunas, linhas = 6 }: { colunas: ColunaAdmin[]; linhas?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Carregando registros…</span>
      <Table className="min-w-[760px]">
        <TableHeader className="bg-tinta-creme/50">
          <TableRow className="hover:bg-transparent">
            {colunas.map((c) => (
              <TableHead key={c.rotulo} className={cn(CABECALHO, c.className)}>
                {c.rotulo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: linhas }).map((_, linha) => (
            <TableRow key={linha} className="hover:bg-transparent">
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

/** Célula sem dado. Texto do glossário, em cor secundária; nunca travessão. */
export function Vazio({ texto = VAZIO.naoInformado }: { texto?: string }) {
  return <span className="text-muted-foreground">{texto}</span>;
}

/**
 * Exclusão de uma linha, com o botão de lixeira como gatilho. Por trás é o
 * `ConfirmarExclusao` do produto: mesmo diálogo, mesmo carregamento, rótulo
 * com o objeto. A rejeição da mutation é engolida aqui porque o `onError`
 * dela já mostrou o toast; sem isso ficaria uma rejeição sem tratamento.
 */
export function ExcluirLinha({
  titulo, descricao, rotuloConfirmar, rotuloAcessivel, aoConfirmar, desabilitado, tom,
}: {
  titulo: string;
  descricao: ReactNode;
  /** Sempre com o objeto: "Excluir projeto", "Remover voluntário". */
  rotuloConfirmar: string;
  /** Nome do item, para o leitor de tela distinguir um botão de lixeira do outro. */
  rotuloAcessivel: string;
  aoConfirmar: () => void | Promise<unknown>;
  desabilitado?: boolean;
  tom?: "destrutivo" | "atencao";
}) {
  // "Remover voluntário" mostra "Removendo…", não "Excluindo…".
  const rotuloCarregando = rotuloConfirmar.startsWith("Remover") ? "Removendo…" : undefined;
  return (
    <ConfirmarExclusao
      titulo={titulo}
      descricao={descricao}
      rotuloConfirmar={rotuloConfirmar}
      rotuloCarregando={rotuloCarregando}
      tom={tom}
      onConfirmar={aoConfirmar}
    >
      <Button
        size="icon"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        aria-label={rotuloAcessivel}
        disabled={desabilitado}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </ConfirmarExclusao>
  );
}

/**
 * Liga/desliga um registro. Antes era `Badge` clicável em Projetos e Eventos e
 * `Switch` em ONGs e Usuários: o mesmo gesto com duas aparências, e a versão
 * em `Badge` não era alcançável pelo teclado como controle de estado.
 */
export function AlternarStatus({
  ativo, aoAlternar, rotulo, ocupado, rotulos = ["Ativo", "Inativo"],
}: {
  ativo: boolean;
  aoAlternar: () => void;
  /** Identifica o que o controle liga, ex.: "Visibilidade de Casa do Caminho no site". */
  rotulo: string;
  ocupado?: boolean;
  /** Texto ao lado do controle: [ligado, desligado]. Use os `TERMOS`. */
  rotulos?: readonly [string, string];
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={ativo} onCheckedChange={aoAlternar} disabled={ocupado} aria-label={rotulo} />
      <span className={cn("whitespace-nowrap text-xs", ativo ? "text-foreground" : "text-muted-foreground")}>
        {ativo ? rotulos[0] : rotulos[1]}
      </span>
    </div>
  );
}

/**
 * Paginação servidor-side. `pagina` começa em zero, como o `.range()` do
 * Supabase.
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
    <nav
      aria-label="Páginas da lista"
      className="flex flex-wrap items-center justify-between gap-3 border-t bg-tinta-creme/30 px-4 py-3"
    >
      <p className="numero text-sm text-muted-foreground">
        {primeiro} a {ultimo} de {total.toLocaleString("pt-BR")}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={pagina <= 0} onClick={() => aoMudar(pagina - 1)}>
          <ChevronLeft aria-hidden="true" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= ultimaPagina}
          onClick={() => aoMudar(pagina + 1)}
        >
          Próxima
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/** Atributos que o `Campo` entrega ao controle para ligar rótulo, dica e erro. */
export type AtributosDoCampo = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/**
 * Campo de formulário com `Label` associado por `id`, dica e erro inline.
 *
 * O erro chega ao leitor de tela por `aria-describedby` e pinta a borda por
 * `aria-invalid` (o `Input` já responde a isso). O filho pode ser um elemento,
 * que recebe os atributos por `cloneElement`, ou uma função, para os casos em
 * que o controle que precisa deles não é o filho direto (o `Select` do Radix
 * não repassa atributos ao gatilho).
 */
export function Campo({
  id, rotulo, obrigatorio, dica, erro, children, className,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: ReactNode;
  erro?: string;
  children: ReactNode | ((atributos: AtributosDoCampo) => ReactNode);
  className?: string;
}) {
  const idDaDica = `${id}-dica`;
  const idDoErro = `${id}-erro`;
  const descritoPor = [erro ? idDoErro : null, dica ? idDaDica : null].filter(Boolean).join(" ");

  const atributos: AtributosDoCampo = {
    id,
    ...(erro ? { "aria-invalid": true as const } : {}),
    ...(descritoPor ? { "aria-describedby": descritoPor } : {}),
  };

  const controle =
    typeof children === "function"
      ? children(atributos)
      : isValidElement(children)
        ? cloneElement(children as ReactElement<Omit<AtributosDoCampo, "id">>, {
            ...(erro ? { "aria-invalid": true as const } : {}),
            ...(descritoPor ? { "aria-describedby": descritoPor } : {}),
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
      {erro && (
        <p id={idDoErro} role="alert" className="text-xs font-medium text-destructive">
          {erro}
        </p>
      )}
      {dica && (
        <p id={idDaDica} className="text-xs text-muted-foreground">
          {dica}
        </p>
      )}
    </div>
  );
}
