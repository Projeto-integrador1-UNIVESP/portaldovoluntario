import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, CircleSlash, Loader2, MapPin, PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Callout } from "@/components/common/Callout";
import { PixQrCode } from "@/components/common/PixQrCode";
import { SeloConfirmacao } from "@/components/common/SeloConfirmacao";
import { OngAvatar } from "@/components/common/OngAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatPrazo, maskCurrency, parseCurrency } from "@/lib/format";
import { VALORES_SUGERIDOS } from "@/lib/schemas/doacao";

const EH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Doação para a organização, sem projeto escolhido. É o destino de links
 * antigos e do botão "Doar" no perfil da ONG.
 *
 * Por que esta tela empurra para um projeto em vez de só receber o valor: uma
 * doação sem projeto não alimenta meta nenhuma, e a barra que só sobe com
 * confirmação é a tese do produto. Com projeto aberto, a escolha do destino é
 * a tela toda; sem nenhum projeto aberto, a doação avulsa continua possível
 * (é o único caminho que resta), agora com QR Code de verdade no lugar da
 * chave Pix em texto cru.
 */
export default function DoarPage() {
  const { ongId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [valor, setValor] = useState<number | undefined>();
  const [enviando, setEnviando] = useState(false);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["doar-ong", ongId, user?.id],
    queryFn: async () => {
      const { data: ong, error } = await supabase
        .from("ongs")
        .select(
          "id, slug, nome, cidade, estado, logo_url, img_url, pix, pix_nome_recebedor, banco, agencia, conta, verificada_em",
        )
        .eq(EH_UUID.test(ongId!) ? "id" : "slug", ongId!)
        .maybeSingle();

      if (error) throw error;
      if (!ong) return null;

      const [{ data: projetos }, { data: minhasDoacoes }] = await Promise.all([
        supabase
          .from("projetos")
          .select("id, slug, nome_projeto, descricao, data_fim")
          .eq("id_ong", ong.id)
          .eq("status", true)
          .order("data_fim", { ascending: true }),
        user
          ? supabase
              .from("doacoes")
              .select("id, valor, status, confirmada_em, data_doacao")
              .eq("id_ong", ong.id)
              .eq("id_usuario", user.id)
              .order("data_doacao", { ascending: false })
              .limit(10)
          : Promise.resolve({ data: null }),
      ]);

      return { ong, projetos: projetos ?? [], minhasDoacoes: minhasDoacoes ?? [] };
    },
    enabled: Boolean(ongId),
  });

  const registrarDoacaoAvulsa = async (e: React.FormEvent) => {
    e.preventDefault();
    const ong = data?.ong;
    if (!ong) return;

    if (!user) {
      navigate(`/login?redirect=/doar/${ongId}`);
      return;
    }
    if (!valor || valor <= 0) {
      toast.error("Escolha ou digite quanto você vai doar.");
      return;
    }

    setEnviando(true);
    // Sem projeto, a função `registrar-doacao` não serve (ela exige projeto),
    // então o registro é insert direto, o que só a policy de doador logado
    // permite. O status fica 'pendente' pelo default da coluna: quem confirma
    // continua sendo a ONG.
    const { data: criada, error } = await supabase
      .from("doacoes")
      .insert({
        id_ong: ong.id,
        id_usuario: user.id,
        valor,
        tipo_doacao: "pix",
        doador_nome: profile?.nome ?? null,
        doador_email: user.email ?? null,
      })
      .select("id")
      .single();
    setEnviando(false);

    if (error || !criada) {
      toast.error("Não foi possível registrar sua doação. Tente de novo.");
      return;
    }
    navigate(`/obrigado/${criada.id}`);
  };

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (isError) {
    return (
      <PublicShell>
        <Seo title="Doar" noIndex />
        <div className="container py-16">
          <ErrorState
            title="Não foi possível carregar esta organização"
            onRetry={() => refetch()}
          />
        </div>
      </PublicShell>
    );
  }

  if (!data) {
    return (
      <PublicShell>
        <Seo title="ONG não encontrada" noIndex />
        <div className="container py-16">
          <EmptyState
            icon={Building2}
            title="ONG não encontrada"
            description="Ela pode ter saído da plataforma ou o link está incorreto."
            action={{ label: "Ver as ONGs parceiras", to: "/ongs" }}
          />
        </div>
      </PublicShell>
    );
  }

  const { ong, projetos, minhasDoacoes } = data;
  const local = [ong.cidade, ong.estado].filter(Boolean).join(", ");
  const nomeRecebedor = ong.pix_nome_recebedor?.trim() || ong.nome;
  const linkOng = `/ongs/${ong.slug ?? ong.id}`;

  return (
    <PublicShell>
      {/* noIndex: o conteúdo canônico da organização é o perfil, esta é a tela de ação. */}
      <Seo title={`Doar para ${ong.nome}`} noIndex />

      <div className="container max-w-2xl py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to={linkOng}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar para {ong.nome}
          </Link>
        </Button>

        <div className="flex items-center gap-4">
          <OngAvatar nome={ong.nome} logoUrl={ong.logo_url} imgUrl={ong.img_url} />
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
            Doar para {ong.nome}
          </h1>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {ong.verificada_em && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              ONG verificada
            </span>
          )}
          {local && (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {local}
            </span>
          )}
        </div>

        <Callout tom="confianca" titulo="O dinheiro vai direto para a conta da ONG" className="mt-4">
          {ong.pix?.trim() ? "O Pix sai da sua conta direto para " : "A transferência vai direto para "}
          <strong className="font-medium text-foreground">{nomeRecebedor}</strong>. A
          Voluntá não processa o pagamento, não retém valor nenhum e não cobra taxa de
          ninguém: nem de você, nem da organização. Antes de confirmar, confira se o nome do
          recebedor no app do seu banco é esse.
        </Callout>

        {projetos.length > 0 ? (
          <section className="mt-8" aria-labelledby="titulo-destino">
            <h2 id="titulo-destino" className="font-display text-lg font-bold">
              Escolha onde sua doação entra
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando a doação tem projeto, a organização confirma o recebimento e o valor
              aparece no progresso da meta. Sem projeto, ela fica só registrada.
            </p>

            <ul className="mt-6 space-y-3">
              {projetos.map((p) => {
                const prazo = formatPrazo(p.data_fim);
                return (
                  <li key={p.id}>
                    <Link
                      to={`/doar/projeto/${p.slug ?? p.id}`}
                      className="elevavel flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sutil"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{p.nome_projeto}</span>
                        {p.descricao && (
                          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                            {p.descricao}
                          </span>
                        )}
                        {prazo && (
                          <span className="mt-1 block text-sm text-muted-foreground">{prazo}</span>
                        )}
                      </span>
                      <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <form onSubmit={registrarDoacaoAvulsa} noValidate>
            {!user && (
              <Callout tom="atencao" titulo="Para registrar esta doação é preciso entrar" className="mt-4">
                Esta organização não tem projeto aberto agora, e doação sem projeto só pode ser
                registrada por quem tem conta.{" "}
                <Link
                  to={`/login?redirect=/doar/${ongId}`}
                  className="font-medium text-primary underline underline-offset-2"
                >
                  Entrar na plataforma
                </Link>
                .
              </Callout>
            )}

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Quanto você quer doar?</CardTitle>
                <CardDescription>
                  Escolha um valor ou digite outro. Não existe valor mínimo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sugestões em ordem crescente: começar por um valor alto ancora a
                    decisão para cima e reduz a chance de a pessoa doar. */}
                <div className="grid grid-cols-3 gap-2">
                  {VALORES_SUGERIDOS.map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant={valor === v ? "default" : "outline"}
                      aria-pressed={valor === v}
                      className="pressionavel tabular-nums"
                      onClick={() => setValor(v)}
                    >
                      R$ <span className="tabular-nums">{v}</span>
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor-doacao">Outro valor</Label>
                  <Input
                    id="valor-doacao"
                    name="valor"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="R$ 0,00"
                    className="tabular-nums"
                    value={valor ? maskCurrency(String(Math.round(valor * 100))) : ""}
                    onChange={(e) => setValor(parseCurrency(e.target.value) || undefined)}
                  />
                </div>
              </CardContent>
            </Card>

            {valor && valor > 0 ? (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Pague com Pix</CardTitle>
                  <CardDescription>
                    Faça a transferência no app do seu banco. Depois registre aqui, para a ONG
                    conseguir confirmar que o valor chegou.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PixQrCode
                    chave={ong.pix}
                    nomeRecebedor={nomeRecebedor}
                    cidade={ong.cidade}
                    valor={valor}
                    dadosBancarios={{ banco: ong.banco, agencia: ong.agencia, conta: ong.conta }}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Callout tom="info" titulo="A confirmação é da organização" className="mt-4">
              Depois de registrar, sua doação espera a ONG confirmar que recebeu. Você
              acompanha esse status aqui mesmo.
            </Callout>

            <Button
              type="submit"
              size="lg"
              variant="cta"
              className="pressionavel mt-4 w-full shadow-cta"
              disabled={enviando || !valor}
            >
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {valor ? "Já paguei, registrar minha doação" : "Escolha um valor para continuar"}
            </Button>
          </form>
        )}

        {user && (
          <section className="mt-10" aria-labelledby="titulo-minhas-doacoes">
            <h2 id="titulo-minhas-doacoes" className="font-display text-lg font-bold">
              Suas doações para esta ONG
            </h2>

            <div className="mt-6">
              {minhasDoacoes.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="Você ainda não doou para esta organização"
                  description="Depois da primeira doação, o status de cada uma aparece aqui."
                  action={{ label: "Ver projetos abertos", to: "/projetos" }}
                />
              ) : (
                <ul className="space-y-2">
                  {minhasDoacoes.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatDate(d.data_doacao)}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(Number(d.valor))}
                      </span>
                      {d.status === "cancelada" ? (
                        // O selo só distingue confirmada de pendente: uma doação
                        // cancelada apareceria como "aguardando", o que é falso.
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          <CircleSlash className="h-3.5 w-3.5" aria-hidden="true" />
                          Não recebida
                        </span>
                      ) : (
                        <SeloConfirmacao
                          confirmadaEm={
                            d.status === "confirmada" ? d.confirmada_em ?? d.data_doacao : null
                          }
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </PublicShell>
  );
}
