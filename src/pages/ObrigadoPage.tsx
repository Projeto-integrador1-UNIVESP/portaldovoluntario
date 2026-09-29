import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ShareButton } from "@/components/common/ShareButton";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { Callout } from "@/components/common/Callout";
import { CopyField } from "@/components/common/CopyField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";

const EH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Os oito primeiros caracteres do id bastam para a ONG achar a doação. */
const codigoDoComprovante = (id: string) => id.slice(0, 8).toUpperCase();

/**
 * Comprovante da doação.
 *
 * O estado de confirmação é o assunto da tela, não uma nota de pé de página: a
 * doação nasce "aguardando a ONG confirmar", e quem não entende isso volta ao
 * projeto, vê a barra igual e acha que o registro falhou.
 */
export default function ObrigadoPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: doacao, isPending } = useQuery({
    queryKey: ["doacao", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("doacoes")
        .select(
          "id, valor, quantidade, status, confirmada_em, data_doacao, doador_nome, id_ong, id_projeto, id_necessidade",
        )
        .eq("id", id!)
        .maybeSingle();
      if (!data) return null;

      const [{ data: projeto }, { data: necessidade }, { data: ong }] = await Promise.all([
        data.id_projeto
          ? supabase.from("projetos").select("nome_projeto, slug, id").eq("id", data.id_projeto).maybeSingle()
          : Promise.resolve({ data: null }),
        data.id_necessidade
          ? supabase.from("necessidades").select("nome, unidade").eq("id", data.id_necessidade).maybeSingle()
          : Promise.resolve({ data: null }),
        data.id_ong
          ? supabase.from("ongs").select("id, nome, slug").eq("id", data.id_ong).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return { ...data, projeto, necessidade, ong };
    },
    enabled: Boolean(id),
  });

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (!doacao) {
    // Doação feita sem conta não é legível pelo próprio doador: as policies de
    // SELECT em `doacoes` cobrem dono da conta, ONG e admin. Em vez de dizer
    // "não encontramos" a quem acabou de doar, mostramos o comprovante mínimo
    // que dá para provar pelo próprio link.
    if (id && EH_UUID.test(id)) return <ComprovanteSemDetalhes id={id} />;

    return (
      <PublicShell>
        <Seo title="Doação não encontrada" noIndex />
        <div className="container py-16">
          <EmptyState
            title="Não encontramos essa doação"
            description="O link pode estar incompleto."
            action={{ label: "Ver projetos", to: "/projetos" }}
          />
        </div>
      </PublicShell>
    );
  }

  const ehItem = Boolean(doacao.id_necessidade && doacao.quantidade);
  const confirmada = doacao.status === "confirmada";
  // Doações confirmadas antes da coluna `confirmada_em` existir não têm data;
  // cair na data da doação evita mostrar "aguardando" para algo já confirmado.
  const confirmadaEm = confirmada ? doacao.confirmada_em ?? doacao.data_doacao : null;
  const linkProjeto = doacao.projeto ? `/projetos/${doacao.projeto.slug ?? doacao.projeto.id}` : "/projetos";
  const linkOng = doacao.ong ? `/ongs/${doacao.ong.slug ?? doacao.ong.id}` : null;
  const cancelada = doacao.status === "cancelada";
  const codigo = codigoDoComprovante(doacao.id);
  const primeiroNome = doacao.doador_nome?.trim().split(" ")[0];

  return (
    <PublicShell>
      <Seo title="Obrigado pela sua doação" noIndex />

      <div className="container max-w-xl py-12">
        <div className="text-center">
          <ReceiptText className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em]">
            {cancelada
              ? "Esta doação foi marcada como não recebida"
              : `Obrigado${primeiroNome ? `, ${primeiroNome}` : ""}!`}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {cancelada
              ? "O registro continua aqui, mas ele não conta no progresso do projeto."
              : "Sua doação está registrada. Esta página é o seu comprovante."}
          </p>
        </div>

        {/* `SeloConfirmacao` só distingue confirmada de pendente; dizer "aguardando"
            para uma doação cancelada seria mentir no único ponto em que o produto
            promete não mentir. */}
        {cancelada ? (
          <Callout tom="atencao" titulo="A organização não registrou este recebimento" className="mt-6">
            Isso costuma acontecer quando a transferência não chegou ou quando a doação foi
            registrada duas vezes. Se você tem certeza de que pagou, fale com{" "}
            {linkOng ? (
              <Link to={linkOng} className="font-medium text-primary underline underline-offset-2">
                {doacao.ong?.nome}
              </Link>
            ) : (
              "a organização"
            )}{" "}
            com o código deste comprovante em mãos.
          </Callout>
        ) : (
          <SeloConfirmacao variante="completo" confirmadaEm={confirmadaEm} className="mt-6" />
        )}

        {!confirmada && !cancelada && (
          <Callout tom="info" titulo="Quanto tempo costuma levar" className="mt-4">
            Quem confirma é a organização, no painel dela — em geral em alguns dias úteis. Se
            passar de uma semana sem confirmação,{" "}
            {linkOng ? (
              <Link to={linkOng} className="font-medium text-primary underline underline-offset-2">
                fale com {doacao.ong?.nome}
              </Link>
            ) : (
              "fale com a organização"
            )}{" "}
            e informe o código deste comprovante.
          </Callout>
        )}

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Comprovante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {doacao.projeto && <Linha rotulo="Projeto" valor={doacao.projeto.nome_projeto} />}
            <Linha rotulo="Recebedor" valor={doacao.ong?.nome ?? "—"} />
            <Linha
              rotulo={ehItem ? "Item" : "Valor"}
              valor={
                ehItem
                  ? `${Number(doacao.quantidade)} ${doacao.necessidade?.unidade ?? ""} de ${doacao.necessidade?.nome ?? ""}`.trim()
                  : formatCurrency(Number(doacao.valor))
              }
            />
            <Linha rotulo="Data" valor={formatDateTime(doacao.data_doacao)} />

            <BlocoDoCodigo codigo={codigo} className="border-t pt-3" />
          </CardContent>
        </Card>

        <Callout
          tom="confianca"
          titulo={
            ehItem
              ? "A entrega é entre você e a organização"
              : "Este valor não passou pela Solidariedade"
          }
          className="mt-4"
        >
          {ehItem
            ? "A plataforma não recebe nem guarda itens: o que você combinou vai direto para a ONG, sem taxa."
            : "O Pix saiu da sua conta direto para a conta da organização. A plataforma não processou o pagamento e não cobrou taxa de ninguém."}
        </Callout>

        <div className="mt-8 space-y-4">
          {!cancelada && (
            <ShareButton titulo={`Acabei de apoiar ${doacao.projeto?.nome_projeto ?? "um projeto"}`} />
          )}

          {!user && (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Quer acompanhar esta doação?</p>
                  <p className="text-sm text-muted-foreground">
                    Criar uma conta leva três campos e você vê o status de tudo que já doou.
                  </p>
                </div>
                <Button asChild className="shrink-0">
                  <Link to="/cadastro?tipo=doador">
                    <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Criar conta
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" asChild className="w-full">
            <Link to={linkProjeto}>
              {doacao.projeto ? "Voltar ao projeto" : "Ver projetos abertos"}
            </Link>
          </Button>
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}

/**
 * Comprovante possível quando a doação não pode ser lida.
 *
 * É o caso de quem doa sem criar conta: as policies de SELECT em `doacoes`
 * cobrem o dono da conta, a ONG destinatária e o admin. Até existir uma leitura
 * pública por id, o que dá para entregar é o código (que está no próprio link)
 * e a explicação da espera — melhor do que "não encontramos essa doação" para
 * quem acabou de transferir dinheiro.
 */
function ComprovanteSemDetalhes({ id }: { id: string }) {
  return (
    <PublicShell>
      <Seo title="Comprovante da doação" noIndex />

      <div className="container max-w-xl py-12">
        <div className="text-center">
          <ReceiptText className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em]">
            Obrigado pela doação!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Não conseguimos abrir os detalhes desta doação nesta tela — eles ficam visíveis para
            a organização e para quem doa com conta. Guarde o código abaixo.
          </p>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6 text-sm">
            <BlocoDoCodigo codigo={codigoDoComprovante(id)} />
          </CardContent>
        </Card>

        <SeloConfirmacao variante="completo" confirmadaEm={null} className="mt-4" />

        <div className="mt-8 space-y-4">
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Quer acompanhar esta doação?</p>
                <p className="text-sm text-muted-foreground">
                  Com uma conta, o status de cada doação fica visível para você.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/cadastro?tipo=doador">
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Criar conta
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" asChild className="w-full">
            <Link to="/projetos">Ver projetos abertos</Link>
          </Button>
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}

function BlocoDoCodigo({ codigo, className }: { codigo: string; className?: string }) {
  return (
    <div className={className}>
      <p className="font-medium">Código do comprovante</p>
      <p className="mt-1 text-muted-foreground">
        É por ele que a ONG e o suporte encontram esta doação. Guarde ou copie antes de sair da
        página.
      </p>
      <CopyField className="mt-2" valor={codigo} rotulo="Copiar o código do comprovante" />
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium">{valor}</span>
    </div>
  );
}
