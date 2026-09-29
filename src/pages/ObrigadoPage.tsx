import { Link, useLocation, useParams } from "react-router-dom";
import { capaDoProjeto } from "@/lib/capaDoProjeto";
import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Ilustracao } from "@/components/common/Ilustracao";
import { Capa } from "@/components/common/Capa";
import { ProgressBar } from "@/components/common/ProgressBar";
import { ShareButton } from "@/components/common/ShareButton";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { CopyField } from "@/components/common/CopyField";
import { Button } from "@/components/ui/button";
import { useProjeto } from "@/hooks/queries/useProjeto";
import { formatCurrency, formatDateTime, formatQuantidade } from "@/lib/format";
import { A_MARCA, CTA } from "@/lib/copy";
import { cn } from "@/lib/utils";

const EH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Os oito primeiros caracteres do id bastam para a ONG achar a doação. */
const codigoDoComprovante = (id: string) => id.slice(0, 8).toUpperCase();

/** O que a RPC `get_comprovante_doacao` devolve: o recibo, sem o e-mail de quem doou. */
type Comprovante = {
  id: string;
  valor: number | null;
  quantidade: number | null;
  status: string;
  anonima: boolean;
  forma_entrega: string | null;
  data_doacao: string;
  confirmada_em: string | null;
  doador_nome: string | null;
  projeto_nome: string | null;
  projeto_slug: string | null;
  necessidade_nome: string | null;
  necessidade_unidade: string | null;
  ong_nome: string | null;
  ong_slug: string | null;
};

/**
 * Comprovante da doação.
 *
 * A leitura vem da RPC `get_comprovante_doacao`, que existe para quem doou sem
 * conta: as policies de `doacoes` só liberam SELECT para dono da conta, ONG e
 * admin, e o fluxo de doação não exige login. Antes a tela consultava a tabela
 * direto, então o caminho mais comum caía no "comprovante sem detalhes".
 *
 * O estado de confirmação é o assunto da tela, não uma nota de pé de página: a
 * doação nasce "aguardando a ONG confirmar", e quem não entende isso volta ao
 * projeto, vê a barra igual e acha que o registro falhou. A barra aqui mostra
 * a doação na faixa pendente, no lugar exato onde ela vai entrar.
 */
export default function ObrigadoPage() {
  const { id } = useParams();
  const { state } = useLocation() as { state?: { idNecessidade?: string | null } | null };
  const { user } = useAuth();
  const idValido = Boolean(id && EH_UUID.test(id));

  const { data: doacao, isPending, isError, refetch } = useQuery({
    queryKey: ["comprovante", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_comprovante_doacao", { _id: id! });
      if (error) throw error;
      return ((data as Comprovante[] | null)?.[0] as Comprovante | undefined) ?? null;
    },
    enabled: idValido,
  });

  // Capa e barra vêm do projeto (leitura pública, já em cache para quem veio
  // da tela de doação). A RPC devolve o nome do pedido, não o id: quem acabou
  // de doar traz o id no `state`; quem abre pelo link cai no nome.
  const { data: projeto } = useProjeto(doacao?.projeto_slug ?? undefined);

  if (!idValido) {
    return (
      <PublicShell>
        <Seo title="Doação não encontrada" noIndex />
        <div className="container py-16">
          <EmptyState
            ilustracao="perdido"
            title="Não encontramos essa doação"
            description="O link pode estar incompleto."
            action={{ label: "Ver projetos abertos", to: "/projetos" }}
          />
        </div>
      </PublicShell>
    );
  }

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (isError) {
    return (
      <PublicShell>
        <Seo title="Comprovante da doação" noIndex />
        <div className="container max-w-2xl py-16">
          <ErrorState
            title="Não foi possível abrir o comprovante"
            description="Sua doação continua registrada. Verifique a conexão e tente de novo."
            onRetry={() => refetch()}
          />
        </div>
      </PublicShell>
    );
  }

  if (!doacao) return <ComprovanteSemDetalhes id={id!} aoTentarDeNovo={() => refetch()} />;

  const ehItem = Boolean(doacao.necessidade_nome && doacao.quantidade);
  const confirmada = doacao.status === "confirmada";
  const cancelada = doacao.status === "cancelada";
  const pendente = !confirmada && !cancelada;
  // Doações confirmadas antes da coluna `confirmada_em` existir não têm data;
  // cair na data da doação evita mostrar "aguardando" para algo já confirmado.
  const confirmadaEm = confirmada ? doacao.confirmada_em ?? doacao.data_doacao : null;
  const linkProjeto = doacao.projeto_slug ? `/projetos/${doacao.projeto_slug}` : "/projetos";
  const linkOng = doacao.ong_slug ? `/ongs/${doacao.ong_slug}` : null;
  const codigo = codigoDoComprovante(doacao.id);
  const primeiroNome = doacao.doador_nome?.trim().split(" ")[0];
  const quantidade = Number(doacao.quantidade ?? 0);
  const valor = Number(doacao.valor ?? 0);

  const necessidade =
    projeto?.necessidades.find((n) => n.id === state?.idNecessidade) ??
    projeto?.necessidades.find((n) => n.nome === doacao.necessidade_nome) ??
    null;

  // O link compartilhado é o do projeto, nunca este: o UUID do comprovante é a
  // chave de acesso ao recibo, com nome e valor de quem doou.
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const linkParaCompartilhar = `${origem}${linkProjeto}`;

  const NomeDaOng = () =>
    linkOng ? (
      <Link to={linkOng} className="font-medium text-primary underline-offset-4 hover:underline">
        {doacao.ong_nome}
      </Link>
    ) : (
      <>a organização</>
    );

  return (
    <PublicShell>
      <Seo title="Obrigado pela sua doação" noIndex />

      <div className="container max-w-2xl py-10 md:py-16">
        <div className="text-center">
          <Ilustracao
            nome={cancelada ? "caixa" : "obrigado"}
            className={cn("mx-auto h-32 md:h-36", !cancelada && "confirmou")}
          />
          <h1 className="texto-display mt-5 font-display text-2xl-fluido font-bold">
            {cancelada
              ? "Esta doação foi marcada como não recebida"
              : `Obrigado${primeiroNome ? `, ${primeiroNome}` : ""}!`}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            {cancelada
              ? "O registro continua aqui, mas ele não conta no progresso do projeto."
              : "Sua doação está registrada. Esta página é o seu comprovante."}
          </p>
        </div>

        <article className="mt-10 overflow-hidden rounded-xl border bg-card shadow-media" aria-label="Comprovante">
          {projeto && (
            <Capa
              src={capaDoProjeto(projeto)}
              alt=""
              id={projeto.id}
              nome={projeto.nome_projeto}
              causa={projeto.causa}
              sizes="(min-width: 768px) 42rem, 100vw"
              className="aspect-[3/1] w-full"
            />
          )}

          <div className="p-5 sm:p-6">
            <p className="rotulo-caps">{ehItem ? "Você registrou" : "Você doou"}</p>
            <p className="numero mt-1 font-display text-2xl font-semibold leading-tight">
              {ehItem
                ? `${formatQuantidade(quantidade, doacao.necessidade_unidade)} de ${doacao.necessidade_nome}`
                : formatCurrency(valor)}
            </p>

            <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {doacao.projeto_nome && <Linha rotulo="Projeto" valor={doacao.projeto_nome} />}
              <Linha rotulo="Recebedor" valor={doacao.ong_nome ?? "Não informado"} />
              <Linha rotulo="Data" valor={formatDateTime(doacao.data_doacao)} />
              {ehItem && doacao.forma_entrega && (
                <Linha
                  rotulo="Entrega"
                  valor={doacao.forma_entrega === "coleta" ? "Coleta combinada com a ONG" : "Você leva no local"}
                />
              )}
            </dl>

            {necessidade && (
              <div className="mt-5 border-t pt-5">
                <p className="rotulo-caps">Onde sua doação entra</p>
                <p className="mt-1 text-sm font-semibold">{necessidade.nome}</p>
                <ProgressBar
                  className="mt-2.5"
                  arrecadado={necessidade.arrecadado}
                  meta={necessidade.meta}
                  pendente={pendente ? (ehItem ? quantidade : valor) : 0}
                  tipo={necessidade.tipo}
                  unidade={necessidade.unidade}
                  destacarFalta
                />
              </div>
            )}

            <SeloConfirmacao
              variante="completo"
              confirmadaEm={confirmadaEm}
              cancelada={cancelada}
              className="mt-5"
            />

            {pendente && (
              <p className="mt-3 text-sm text-muted-foreground">
                Quem confirma é a organização, no painel dela; costuma sair em alguns dias úteis.
                Se passar de uma semana, fale com <NomeDaOng /> e informe o código abaixo.
              </p>
            )}
            {cancelada && (
              <p className="mt-3 text-sm text-muted-foreground">
                Isso costuma acontecer quando a transferência não chegou ou quando a doação foi
                registrada duas vezes. Se você tem certeza de que pagou, fale com <NomeDaOng /> com o
                código abaixo em mãos.
              </p>
            )}

            <BlocoDoCodigo codigo={codigo} className="mt-5 border-t pt-5" />

            <p className="mt-5 text-xs text-muted-foreground">
              {ehItem
                ? `${A_MARCA.charAt(0).toUpperCase() + A_MARCA.slice(1)} não recebe nem guarda itens: o que você combinou vai direto para a ONG, sem taxa.`
                : `O Pix saiu da sua conta direto para a conta da organização. ${A_MARCA.charAt(0).toUpperCase() + A_MARCA.slice(1)} não processou o pagamento e não cobrou taxa.`}
            </p>
          </div>
        </article>

        {!cancelada && (
          <div className="mt-8">
            <p className="rotulo-caps">Chame mais gente</p>
            <div className="mt-3">
              <ShareButton
                titulo={`Acabei de apoiar ${doacao.projeto_nome ?? "um projeto"} na Voluntá`}
                url={linkParaCompartilhar}
              />
            </div>
          </div>
        )}

        {!user && <ConviteParaConta className="mt-10" />}

        <div className="mt-8">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to={linkProjeto}>
              {doacao.projeto_slug ? "Voltar ao projeto" : "Ver projetos abertos"}
            </Link>
          </Button>
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}

/**
 * Comprovante possível quando a RPC não devolve a doação: id que ainda não
 * existe (lag de replicação) ou função ausente no ambiente. Serve melhor do
 * que "não encontramos essa doação" para quem acabou de transferir dinheiro:
 * o código está no próprio link, e dá para tentar de novo.
 */
function ComprovanteSemDetalhes({ id, aoTentarDeNovo }: { id: string; aoTentarDeNovo: () => void }) {
  return (
    <PublicShell>
      <Seo title="Comprovante da doação" noIndex />

      <div className="container max-w-2xl py-10 md:py-16">
        <div className="text-center">
          <Ilustracao nome="obrigado" className="confirmou mx-auto h-32 md:h-36" />
          <h1 className="texto-display mt-5 font-display text-2xl-fluido font-bold">
            Obrigado pela doação!
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Os detalhes desta doação não abriram agora. Guarde o código abaixo: é por ele que a
            ONG encontra o seu registro.
          </p>
        </div>

        <article className="mt-10 rounded-xl border bg-card p-5 shadow-media sm:p-6" aria-label="Comprovante">
          <BlocoDoCodigo codigo={codigoDoComprovante(id)} />
          <SeloConfirmacao variante="completo" confirmadaEm={null} className="mt-5" />
          <Button variant="outline" className="mt-5" onClick={aoTentarDeNovo}>
            {CTA.tentarDeNovo}
          </Button>
        </article>

        <ConviteParaConta className="mt-10" />

        <div className="mt-8">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link to="/projetos">Ver projetos abertos</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}

/** Bloco de tinta com o convite para criar conta: o único destaque da tela. */
function ConviteParaConta({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[28px_8px] bg-tinta-azulpo p-6 sm:p-8", className)}>
      <p className="font-display text-xl font-semibold">Quer acompanhar esta doação?</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Com uma conta, você vê o status de tudo que já doou e recebe o aviso na hora em que a ONG
        confirmar. São três campos.
      </p>
      <Button asChild className="mt-5">
        <Link to="/cadastro?tipo=doador">
          <UserPlus aria-hidden="true" />
          Criar conta e acompanhar
        </Link>
      </Button>
    </div>
  );
}

function BlocoDoCodigo({ codigo, className }: { codigo: string; className?: string }) {
  return (
    <div className={className}>
      <p className="font-medium">Código do comprovante</p>
      <p className="mt-1 text-sm text-muted-foreground">
        É por ele que a ONG e o suporte encontram esta doação. Guarde ou copie antes de sair da
        página.
      </p>
      <CopyField
        className="mt-3"
        valor={codigo}
        rotulo="Copiar o código do comprovante"
        objeto="Código do comprovante"
      />
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 font-medium">{valor}</dd>
    </div>
  );
}
