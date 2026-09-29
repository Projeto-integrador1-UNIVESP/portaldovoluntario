import { useState } from "react";
import { EASE_SUAVE } from "@/lib/movimento";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
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
import { SeloVerificada } from "@/components/common/SeloVerificada";
import { OngAvatar } from "@/components/common/OngAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency, formatDate, formatPrazo, maskCurrency, parseCurrency } from "@/lib/format";
import { mensagemAmigavel } from "@/lib/erros";
import { CTA, A_MARCA_INICIAL } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { doacaoAvulsaSchema, VALORES_SUGERIDOS, type DoacaoAvulsaInput } from "@/lib/schemas/doacao";

const EH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Doação para a organização, sem projeto escolhido. É o destino de links
 * antigos e do botão "Doar" no perfil da ONG.
 *
 * Por que esta tela empurra para um projeto em vez de só receber o valor: uma
 * doação sem projeto não alimenta meta nenhuma, e a barra que só sobe com
 * confirmação é a tese do produto. Com projeto aberto, a escolha do destino é
 * a tela toda; sem nenhum projeto aberto, a doação avulsa continua possível
 * (é o único caminho que resta), com QR Code de verdade.
 */
export default function DoarPage() {
  const { ongId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<DoacaoAvulsaInput>({
    resolver: zodResolver(doacaoAvulsaSchema),
    defaultValues: { valor: undefined as unknown as number },
  });
  const valor = form.watch("valor");

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

      const [projetos, minhasDoacoes] = await Promise.all([
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
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (projetos.error) throw projetos.error;
      if (minhasDoacoes.error) throw minhasDoacoes.error;

      return { ong, projetos: projetos.data ?? [], minhasDoacoes: minhasDoacoes.data ?? [] };
    },
    enabled: Boolean(ongId),
  });

  const registrar = async ({ valor }: DoacaoAvulsaInput) => {
    const ong = data?.ong;
    if (!ong) return;

    if (!user) {
      navigate(`/login?redirect=/doar/${ongId}`);
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
      toast.error(mensagemAmigavel(error, "Não foi possível registrar sua doação. Tente de novo em instantes."));
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
            ilustracao="perdido"
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
  const temProjetos = projetos.length > 0;

  return (
    <PublicShell>
      {/* noIndex: o conteúdo canônico da organização é o perfil, esta é a tela de ação. */}
      <Seo title={`Doar para ${ong.nome}`} noIndex />

      <div className={cn("container py-6 md:py-10 md:pb-14", !temProjetos && "pb-28")}>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={linkOng}>
            <ArrowLeft aria-hidden="true" />
            Voltar para {ong.nome}
          </Link>
        </Button>

        <h1 className="mt-3 font-display text-2xl-fluido font-bold">Doar para {ong.nome}</h1>

        <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
          <div className="order-2 min-w-0 lg:order-1">
            {temProjetos ? (
              <section aria-labelledby="titulo-destino">
                <h2 id="titulo-destino" className="font-display text-xl font-semibold">
                  Escolha onde sua doação entra
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Com projeto, sua doação aparece na barra da meta assim que a ONG confirmar o
                  recebimento. Sem projeto, ela fica só registrada.
                </p>

                <ul className="mt-6 space-y-3">
                  {projetos.map((p) => {
                    const prazo = formatPrazo(p.data_fim);
                    return (
                      <li key={p.id}>
                        <Link
                          to={`/doar/projeto/${p.slug ?? p.id}`}
                          className="elevavel flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sutil hover:border-primary/40"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-lg font-semibold leading-tight">
                              {p.nome_projeto}
                            </span>
                            {p.descricao && (
                              <span className="mt-1.5 line-clamp-2 block text-sm text-muted-foreground">
                                {p.descricao}
                              </span>
                            )}
                            {prazo && (
                              <span className="rotulo-caps mt-2 block">{prazo}</span>
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
              <Form {...form}>
                <form onSubmit={form.handleSubmit(registrar)} noValidate className="space-y-5">
                  {!user && (
                    <Callout tom="atencao" titulo="Para registrar esta doação é preciso entrar">
                      Esta organização não tem projeto aberto agora, e doação sem projeto só pode
                      ser registrada por quem tem conta. Você escolhe o valor aqui e, na hora de
                      registrar, entra ou cria a conta em um minuto.
                    </Callout>
                  )}

                  <section
                    aria-labelledby="titulo-valor"
                    className={cn(
                      "rounded-xl border bg-card p-5 shadow-sutil transition-[border-color,box-shadow] duration-300 ease-suave sm:p-6",
                      !(valor > 0) && "border-primary/50 shadow-media",
                    )}
                  >
                    <h2 id="titulo-valor" className="font-display text-xl font-semibold">
                      Quanto você quer doar?
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Escolha um valor ou digite outro. Não existe valor mínimo.
                    </p>

                    {/* Sugestões em ordem crescente: começar por um valor alto ancora a
                        decisão para cima e reduz a chance de a pessoa doar. */}
                    <div className="mt-5 grid grid-cols-3 gap-3" role="group" aria-label="Valores sugeridos">
                      {VALORES_SUGERIDOS.map((v) => {
                        const escolhido = valor === v;
                        return (
                          <button
                            key={v}
                            type="button"
                            aria-pressed={escolhido}
                            onClick={() => form.setValue("valor", v, { shouldValidate: true, shouldDirty: true })}
                            className={cn(
                              "numero flex h-14 items-baseline justify-center gap-1 rounded-controle border font-display text-xl font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100",
                              escolhido
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-card text-foreground hover:border-primary/50 hover:bg-accent",
                            )}
                          >
                            <span className="font-sans text-sm font-medium opacity-80">R$</span> {v}
                          </button>
                        );
                      })}
                    </div>

                    <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                        <FormItem className="mt-5">
                          <FormLabel>Outro valor</FormLabel>
                          <FormControl>
                            <Input
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="R$ 0,00"
                              className="numero max-w-[14rem]"
                              {...field}
                              value={field.value ? maskCurrency(String(Math.round(field.value * 100))) : ""}
                              onChange={(e) => field.onChange(parseCurrency(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </section>

                  <AnimatePresence initial={false}>
                    {valor > 0 && (
                      <m.section
                        key="pix"
                        aria-labelledby="titulo-pix"
                        className="rounded-xl border border-primary/50 bg-card p-5 shadow-media sm:p-6"
                        initial={{ x: 32, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -24, opacity: 0 }}
                        transition={{ duration: 0.28, ease: EASE_SUAVE }}
                      >
                        <h2 id="titulo-pix" className="font-display text-xl font-semibold">Pague com Pix</h2>
                        <ol className="mt-5 space-y-1.5 text-sm text-muted-foreground">
                          <li className="flex gap-2">
                            <span className="numero font-display font-semibold text-primary">1.</span>
                            Abra o app do seu banco e leia o QR Code, ou cole o código Pix.
                          </li>
                          <li className="flex gap-2">
                            <span className="numero font-display font-semibold text-primary">2.</span>
                            <span>
                              Confira o nome do recebedor:{" "}
                              <strong className="font-medium text-foreground">{nomeRecebedor}</strong>.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <span className="numero font-display font-semibold text-primary">3.</span>
                            Depois de pagar, volte aqui e registre a doação.
                          </li>
                        </ol>
                        <div className="mt-5">
                          <PixQrCode
                            chave={ong.pix}
                            nomeRecebedor={nomeRecebedor}
                            cidade={ong.cidade}
                            valor={valor}
                            dadosBancarios={{ banco: ong.banco, agencia: ong.agencia, conta: ong.conta }}
                          />
                        </div>
                      </m.section>
                    )}
                  </AnimatePresence>

                  {/* Sem animação de layout: o transform dela vira referência para a barra fixa do celular, que pulava para o meio do formulário. */}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Depois de registrar, sua doação espera a ONG confirmar que recebeu. Você
                      acompanha esse status aqui mesmo.
                    </p>
                    <div className="mt-4 max-md:barra-fixa-inferior max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:mt-0 max-md:border-t max-md:bg-card/95 max-md:px-4 max-md:pt-3 max-md:shadow-alta max-md:backdrop-blur-md">
                      <Button
                        type="submit"
                        size="lg"
                        variant="cta"
                        className="w-full"
                        disabled={enviando || !(valor > 0)}
                      >
                        {enviando && <Loader2 className="animate-spin" aria-hidden="true" />}
                        {enviando
                          ? CTA.registrando
                          : valor > 0
                            ? user
                              ? "Já paguei, registrar minha doação"
                              : "Entrar e registrar minha doação"
                            : "Escolha um valor para continuar"}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            )}

            {user && (
              <section className="mt-12" aria-labelledby="titulo-minhas-doacoes">
                <h2 id="titulo-minhas-doacoes" className="font-display text-xl font-semibold">
                  Suas doações para esta ONG
                </h2>

                <div className="mt-5">
                  {minhasDoacoes.length === 0 ? (
                    <EmptyState
                      ilustracao="caixa"
                      title="Você ainda não doou para esta organização"
                      description="Depois da primeira doação, o status de cada uma aparece aqui."
                      action={{ label: "Ver projetos abertos", to: "/projetos" }}
                    />
                  ) : (
                    <ul className="divide-y rounded-xl border bg-card shadow-sutil">
                      {minhasDoacoes.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5"
                        >
                          <span className="numero text-sm text-muted-foreground">
                            {formatDate(d.data_doacao)}
                          </span>
                          <span className="numero font-display text-lg font-semibold">
                            {formatCurrency(Number(d.valor))}
                          </span>
                          <SeloConfirmacao
                            cancelada={d.status === "cancelada"}
                            confirmadaEm={
                              d.status === "confirmada" ? d.confirmada_em ?? d.data_doacao : null
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24">
            <div className="rounded-xl border bg-card p-5 shadow-sutil">
              <div className="flex items-center gap-4">
                <OngAvatar nome={ong.nome} logoUrl={ong.logo_url} imgUrl={ong.img_url} tamanho="lg" />
                <div className="min-w-0">
                  <p className="rotulo-caps">Você está doando para</p>
                  <p className="mt-1 font-display text-lg font-semibold leading-tight">{ong.nome}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <SeloVerificada verificadaEm={ong.verificada_em} />
                    {local && <span className="text-muted-foreground">{local}</span>}
                  </div>
                </div>
              </div>
              <Link
                to={linkOng}
                className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver o perfil da organização
              </Link>
            </div>

            <Callout tom="confianca" titulo="O dinheiro vai direto para a conta da ONG">
              {ong.pix?.trim() ? "O Pix sai da sua conta direto para " : "A transferência vai direto para "}
              <strong className="font-medium text-foreground">{nomeRecebedor}</strong>. {A_MARCA_INICIAL} não
              processa o pagamento nem cobra taxa. Antes de confirmar no app do banco, confira se o
              nome do recebedor é esse.
            </Callout>
          </aside>
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}
