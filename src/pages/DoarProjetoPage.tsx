import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { EASE_SUAVE } from "@/lib/movimento";
import { capaDoProjeto } from "@/lib/capaDoProjeto";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicShell } from "@/components/layout/PublicShell";
import { Footer } from "@/components/layout/Footer";
import { Seo } from "@/components/common/Seo";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ProgressBar } from "@/components/common/ProgressBar";
import { PixQrCode } from "@/components/common/PixQrCode";
import { Callout } from "@/components/common/Callout";
import { Capa } from "@/components/common/Capa";
import { SeloVerificada } from "@/components/common/SeloVerificada";
import { Stepper, type PassoDoFluxo } from "@/components/common/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useProjeto, type ProjetoPublico } from "@/hooks/queries/useProjeto";
import type { Necessidade } from "@/components/common/NeedItem";
import { maskCurrency, parseCurrency } from "@/lib/format";
import { mensagemAmigavel } from "@/lib/erros";
import { MENSAGENS, CTA, A_MARCA_INICIAL } from "@/lib/copy";
import { cn } from "@/lib/utils";
import {
  doacaoDinheiroSchema, doacaoItemSchemaPara, unidadeAceitaFracao, VALORES_SUGERIDOS,
  type DoacaoDinheiroInput, type DoacaoItemInput, type IdentificacaoDoador,
} from "@/lib/schemas/doacao";

const PASSOS_DINHEIRO: PassoDoFluxo[] = [
  { id: "destino", rotulo: "O que doar" },
  { id: "valor", rotulo: "Quanto doar" },
  { id: "doador", rotulo: "Seus dados" },
  { id: "pix", rotulo: "Pagar com Pix" },
];

const PASSOS_ITEM: PassoDoFluxo[] = [
  { id: "destino", rotulo: "O que doar" },
  { id: "quantidade", rotulo: "Quanto e como entregar" },
  { id: "doador", rotulo: "Seus dados" },
];


/** "a Voluntá" começando frase. */

type CampoDoRegistro = "doador_nome" | "doador_email" | "valor" | "quantidade" | "forma_entrega";

/**
 * O que a Edge Function `registrar-doacao` devolve, traduzido para a tela.
 *
 * A função responde `{ error }` com status 400/404/409/429/500, e o cliente do
 * Supabase embrulha tudo num `FunctionsHttpError` cuja `message` é "Edge
 * Function returned a non-2xx status code": era isso que aparecia no toast.
 * O corpo fica em `error.context`. Cada trecho abaixo identifica um dos casos
 * da função; os de campo voltam para o campo, os outros viram toast.
 */
const ERROS_DA_FUNCAO: { trecho: RegExp; campo?: CampoDoRegistro; mensagem: string }[] = [
  { trecho: /seu nome/i, campo: "doador_nome", mensagem: "Informe seu nome" },
  { trecho: /e-mail/i, campo: "doador_email", mensagem: MENSAGENS.email },
  { trecho: /valor da doação/i, campo: "valor", mensagem: "Escolha ou digite quanto você quer doar" },
  { trecho: /quantos itens/i, campo: "quantidade", mensagem: "Diga quantos você vai doar" },
  { trecho: /forma de entrega/i, campo: "forma_entrega", mensagem: "Escolha como a doação vai chegar até a ONG" },
  { trecho: /não está mais recebendo/i, mensagem: "Este projeto encerrou as doações. Veja os projetos que continuam abertos." },
  { trecho: /projeto não encontrado|informe o projeto/i, mensagem: "Este projeto saiu do ar. Veja os projetos que continuam abertos." },
  { trecho: /necessidade/i, mensagem: "Esse pedido não está mais aberto. Escolha outro destino para a doação." },
  { trecho: /muitas tentativas/i, mensagem: "Muitas tentativas seguidas. Espere um minuto e tente de novo." },
];

const ERRO_PADRAO = "Não foi possível registrar sua doação. Tente de novo em instantes.";
const ERRO_DE_REDE = "Sem conexão com o servidor. Verifique sua internet e tente de novo.";

async function traduzirFalha(
  data: unknown,
  error: unknown,
): Promise<{ campo?: CampoDoRegistro; mensagem: string } | null> {
  let texto = (data as { error?: string } | null)?.error ?? "";

  if (!texto && error instanceof FunctionsHttpError) {
    try {
      texto = ((await error.context.json()) as { error?: string } | null)?.error ?? "";
    } catch {
      // Corpo que não é JSON (gateway fora do ar): cai na mensagem padrão.
    }
  }

  if (texto) return ERROS_DA_FUNCAO.find((e) => e.trecho.test(texto)) ?? { mensagem: ERRO_PADRAO };
  if (!error) return null;
  if (error instanceof FunctionsFetchError) {
    return { mensagem: mensagemAmigavel(error.context, ERRO_DE_REDE) };
  }
  return { mensagem: mensagemAmigavel(error, ERRO_PADRAO) };
}

/**
 * Fluxo de doação em uma página só, com o passo atual sinalizado no `Stepper`.
 *
 * O login deixa de ser exigido: antes o visitante preenchia tudo e só então
 * descobria que precisava criar conta. Agora bastam nome e e-mail, e a conta
 * fica como sugestão na tela de agradecimento.
 *
 * O formulário fica à esquerda e, ao lado, um resumo fixo do que a pessoa está
 * financiando: capa, organização, o que falta e a garantia de que o dinheiro
 * não passa pela plataforma. Essa garantia decide se a pessoa transfere, e
 * antes era dita três vezes na mesma tela. Agora é uma.
 */
export default function DoarProjetoPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: projeto, isPending, isError } = useProjeto(slug);
  const necessidadeDaUrl = params.get("necessidade");
  const [idNecessidade, setIdNecessidade] = useState<string | null>(necessidadeDaUrl);
  // Quem chega de um link com `?necessidade` já respondeu o passo 1.
  const [destinoEscolhido, setDestinoEscolhido] = useState(Boolean(necessidadeDaUrl));
  const [enviando, setEnviando] = useState(false);

  const necessidade = useMemo(
    () => projeto?.necessidades.find((n) => n.id === idNecessidade) ?? null,
    [projeto, idNecessidade],
  );

  // Link antigo para uma necessidade que já fechou: sem rádio marcado, o
  // envio daria 404 na função. Volta para "dinheiro livre" e reabre o passo 1.
  useEffect(() => {
    if (projeto && idNecessidade && !necessidade) {
      setIdNecessidade(null);
      setDestinoEscolhido(false);
    }
  }, [projeto, idNecessidade, necessidade]);

  const ehItem = necessidade?.tipo === "item";

  const formDinheiro = useForm<DoacaoDinheiroInput>({
    resolver: zodResolver(doacaoDinheiroSchema),
    defaultValues: {
      valor: undefined as unknown as number,
      doador_nome: profile?.nome ?? "",
      doador_email: user?.email ?? "",
      anonima: false,
    },
  });

  const schemaDeItem = useMemo(() => doacaoItemSchemaPara(necessidade?.unidade), [necessidade?.unidade]);
  const formItem = useForm<DoacaoItemInput>({
    resolver: zodResolver(schemaDeItem),
    defaultValues: {
      quantidade: undefined as unknown as number,
      forma_entrega: "levar",
      doador_nome: profile?.nome ?? "",
      doador_email: user?.email ?? "",
      anonima: false,
    },
  });

  const registrar = async (
    corpo: Record<string, unknown>,
    marcarCampo: (campo: CampoDoRegistro, mensagem: string) => boolean,
  ) => {
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("registrar-doacao", {
        body: { id_projeto: projeto!.id, id_necessidade: necessidade?.id ?? null, ...corpo },
      });

      const falha = await traduzirFalha(data, error);
      if (falha) {
        if (!falha.campo || !marcarCampo(falha.campo, falha.mensagem)) toast.error(falha.mensagem);
        return;
      }

      navigate(`/obrigado/${(data as { id: string }).id}`, {
        state: { idNecessidade: necessidade?.id ?? null },
      });
    } finally {
      setEnviando(false);
    }
  };

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (isError || !projeto) {
    return (
      <PublicShell>
        <Seo title="Projeto não encontrado" noIndex />
        <div className="container py-16">
          <EmptyState
            ilustracao="perdido"
            title="Projeto não encontrado"
            description="O link pode estar incorreto ou o projeto saiu do ar."
            action={{ label: "Ver todos os projetos", to: "/projetos" }}
          />
        </div>
      </PublicShell>
    );
  }

  const valorEmReais = formDinheiro.watch("valor");
  const quantidade = formItem.watch("quantidade");
  const nomeRecebedor =
    projeto.ong?.pix_nome_recebedor?.trim() || projeto.ong?.nome || "Organização";
  const temPix = Boolean(projeto.ong?.pix?.trim());

  const identificado =
    (formDinheiro.watch("doador_nome") ?? "").trim().length >= 3 &&
    (formDinheiro.watch("doador_email") ?? "").includes("@");

  // A primeira opção já vem marcada, então quem aceita o padrão nunca toca no
  // rádio: preencher valor ou quantidade também responde o passo 1.
  const respondeuDestino = destinoEscolhido || valorEmReais > 0 || Boolean(quantidade);

  const passos = ehItem ? PASSOS_ITEM : PASSOS_DINHEIRO;
  const passoAtual = !respondeuDestino
    ? 1
    : ehItem
      ? (quantidade ? 3 : 2)
      : valorEmReais > 0
        ? (identificado ? 4 : 3)
        : 2;

  // O resumo mostra a barra do pedido escolhido; sem pedido, a do mais urgente.
  const necessidadeEmFoco = necessidade ?? projeto.necessidades[0] ?? null;

  const escolherDestino = (id: string | null) => {
    setIdNecessidade(id);
    setDestinoEscolhido(true);
  };

  return (
    <PublicShell>
      <Seo
        title={`Doar para ${projeto.nome_projeto}`}
        description={`Contribua com o projeto ${projeto.nome_projeto}.`}
        noIndex
      />

      {/* pb-28 no celular reserva o espaço da barra fixa com a ação principal */}
      <div className="container py-6 pb-28 md:py-10 md:pb-14">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={`/projetos/${projeto.slug ?? projeto.id}`}>
            <ArrowLeft aria-hidden="true" />
            Voltar ao projeto
          </Link>
        </Button>

        <h1 className="mt-3 font-display text-2xl-fluido font-bold">
          Doar para {projeto.nome_projeto}
        </h1>

        <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
          <div className="order-2 min-w-0 lg:order-1">
            <Stepper passos={passos} atual={passoAtual} />

            <div className="mt-6 space-y-5">
              <PassoDestino
                projeto={projeto}
                idNecessidade={necessidade?.id ?? null}
                aoEscolher={escolherDestino}
                atual={passoAtual === 1}
              />

              {ehItem ? (
                <Form {...formItem}>
                  <form
                    onSubmit={formItem.handleSubmit((d) =>
                      registrar(
                        {
                          quantidade: d.quantidade,
                          forma_entrega: d.forma_entrega,
                          doador_nome: d.doador_nome,
                          doador_email: d.doador_email,
                          anonima: d.anonima,
                        },
                        (campo, mensagem) => {
                          if (campo === "valor") return false;
                          formItem.setError(campo, { type: "server", message: mensagem }, { shouldFocus: true });
                          return true;
                        },
                      ),
                    )}
                    noValidate
                    className="space-y-5"
                  >
                    <Passo titulo="Quanto e como entregar" atual={passoAtual === 2}>
                      <FormField
                        control={formItem.control}
                        name="quantidade"
                        render={({ field }) => {
                          const fracao = unidadeAceitaFracao(necessidade?.unidade);
                          return (
                            <FormItem>
                              <FormLabel>
                                Quantidade{necessidade?.unidade ? ` (${necessidade.unidade})` : ""}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  inputMode={fracao ? "decimal" : "numeric"}
                                  step={fracao ? "0.01" : 1}
                                  min={fracao ? 0.01 : 1}
                                  autoComplete="off"
                                  className="numero max-w-[12rem]"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={formItem.control}
                        name="forma_entrega"
                        render={({ field }) => (
                          <FormItem className="mt-5">
                            <FormControl>
                              <fieldset className="space-y-3">
                                <legend className="text-sm font-medium">Como a doação chega até a ONG?</legend>
                                <CartaoDeOpcao
                                  id="entrega-levar"
                                  name={field.name}
                                  value="levar"
                                  checked={field.value === "levar"}
                                  onChange={() => field.onChange("levar")}
                                  titulo="Vou levar no local"
                                  descricao={
                                    projeto.ong?.endereco_entrega
                                      ? `${projeto.ong.endereco_entrega}${projeto.ong.horarios_recebimento ? `. Recebe ${projeto.ong.horarios_recebimento}` : ""}`
                                      : undefined
                                  }
                                />
                                <CartaoDeOpcao
                                  id="entrega-coleta"
                                  name={field.name}
                                  value="coleta"
                                  checked={field.value === "coleta"}
                                  onChange={() => field.onChange("coleta")}
                                  titulo="Quero combinar uma coleta"
                                  descricao="A ONG escreve para o e-mail que você informar e combina dia e hora."
                                />
                              </fieldset>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Passo>

                    <CamposDeIdentificacao
                      form={formItem as unknown as UseFormReturn<IdentificacaoDoador>}
                      atual={passoAtual === 3}
                    />

                    <Rodape rotulo="Registrar e avisar a ONG" enviando={enviando} />
                  </form>
                </Form>
              ) : (
                <Form {...formDinheiro}>
                  <form
                    onSubmit={formDinheiro.handleSubmit((d) =>
                      registrar(
                        {
                          valor: d.valor,
                          doador_nome: d.doador_nome,
                          doador_email: d.doador_email,
                          anonima: d.anonima,
                          tipo_doacao: "pix",
                        },
                        (campo, mensagem) => {
                          if (campo === "quantidade" || campo === "forma_entrega") return false;
                          formDinheiro.setError(campo, { type: "server", message: mensagem }, { shouldFocus: true });
                          return true;
                        },
                      ),
                    )}
                    noValidate
                    className="space-y-5"
                  >
                    <Passo
                      titulo="Quanto você quer doar?"
                      descricao="Escolha um valor ou digite outro. Não existe valor mínimo."
                      atual={passoAtual === 2}
                    >
                      {/* Sugestões em ordem crescente: começar por um valor alto ancora
                          a decisão para cima e reduz a chance de a pessoa doar. */}
                      <div className="grid grid-cols-3 gap-3" role="group" aria-label="Valores sugeridos">
                        {VALORES_SUGERIDOS.map((v) => {
                          const escolhido = valorEmReais === v;
                          return (
                            <button
                              key={v}
                              type="button"
                              aria-pressed={escolhido}
                              onClick={() =>
                                formDinheiro.setValue("valor", v, { shouldValidate: true, shouldDirty: true })
                              }
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
                        control={formDinheiro.control}
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
                    </Passo>

                    <CamposDeIdentificacao
                      form={formDinheiro as unknown as UseFormReturn<IdentificacaoDoador>}
                      atual={passoAtual === 3}
                    />

                    <AnimatePresence initial={false}>
                      {valorEmReais > 0 && (
                        <m.div
                          key="pix"
                          initial={{ x: 32, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -24, opacity: 0 }}
                          transition={{ duration: 0.28, ease: EASE_SUAVE }}
                        >
                          <Passo titulo="Pague com Pix" atual={passoAtual === 4}>
                            <ol className="space-y-1.5 text-sm text-muted-foreground">
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
                                chave={projeto.ong?.pix}
                                nomeRecebedor={nomeRecebedor}
                                cidade={projeto.ong?.cidade}
                                valor={valorEmReais}
                                identificador={projeto.slug ?? undefined}
                                dadosBancarios={{
                                  banco: projeto.ong?.banco,
                                  agencia: projeto.ong?.agencia,
                                  conta: projeto.ong?.conta,
                                }}
                              />
                            </div>
                          </Passo>
                        </m.div>
                      )}
                    </AnimatePresence>

                    {/* Sem valor não há QR Code na tela: liberar o registro aqui criaria uma
                        doação pendente que a ONG teria de perseguir e cancelar. */}
                    <Rodape
                      rotulo={
                        valorEmReais > 0
                          ? "Já paguei, registrar minha doação"
                          : "Escolha um valor para continuar"
                      }
                      desabilitado={!(valorEmReais > 0)}
                      enviando={enviando}
                    />
                  </form>
                </Form>
              )}
            </div>
          </div>

          <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24">
            <ResumoDoProjeto
              projeto={projeto}
              necessidade={necessidadeEmFoco}
              rotuloDaNecessidade={necessidade ? "O que falta neste pedido" : "O pedido mais urgente"}
            />

            <Callout
              tom="confianca"
              titulo={
                ehItem
                  ? "A entrega é combinada direto com a organização"
                  : "O dinheiro vai direto para a conta da ONG"
              }
            >
              {ehItem ? (
                <>
                  {A_MARCA_INICIAL} não recebe nem guarda os itens: você entrega para{" "}
                  <strong className="font-medium text-foreground">{projeto.ong?.nome}</strong>, sem
                  taxa. Aqui você só registra a doação.
                </>
              ) : (
                <>
                  {temPix ? "O Pix sai da sua conta direto para " : "A transferência vai direto para "}
                  <strong className="font-medium text-foreground">{nomeRecebedor}</strong>. {A_MARCA_INICIAL}{" "}
                  não processa o pagamento nem cobra taxa. Antes de confirmar no app do banco,
                  confira se o nome do recebedor é esse.
                </>
              )}
            </Callout>
          </aside>
        </div>
      </div>
      <Footer />
    </PublicShell>
  );
}

/**
 * Resumo fixo do que está sendo financiado. Quem chega por link compartilhado
 * cai direto aqui e nunca viu o perfil da organização: capa, nome, selo de
 * verificada e o que falta são o mínimo para saber para quem o dinheiro vai.
 */
function ResumoDoProjeto({
  projeto,
  necessidade,
  rotuloDaNecessidade,
}: {
  projeto: ProjetoPublico;
  necessidade: Necessidade | null;
  rotuloDaNecessidade: string;
}) {
  const ong = projeto.ong;
  const local = [ong?.cidade, ong?.estado].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sutil">
      <Capa
        src={capaDoProjeto(projeto)}
        alt=""
        id={projeto.id}
        nome={projeto.nome_projeto}
        causa={projeto.causa}
        sizes="(min-width: 1024px) 22rem, 100vw"
        className="aspect-[2/1] w-full lg:aspect-[16/9]"
      />
      <div className="p-5">
        {/* No celular o resumo fica logo abaixo do h1, que já diz o nome do projeto. */}
        <div className="hidden lg:block">
          <p className="rotulo-caps">Você está doando para</p>
          <p className="mt-1 font-display text-lg font-semibold leading-tight">{projeto.nome_projeto}</p>
        </div>

        {ong && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm lg:mt-2.5">
            <Link
              to={`/ongs/${ong.slug ?? ong.id}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {ong.nome}
            </Link>
            <SeloVerificada verificadaEm={ong.verificada_em} />
            {local && <span className="text-muted-foreground">{local}</span>}
          </div>
        )}

        {necessidade && (
          <div className="mt-4 border-t pt-4">
            <p className="rotulo-caps">{rotuloDaNecessidade}</p>
            <p className="mt-1 text-sm font-semibold">{necessidade.nome}</p>
            <ProgressBar
              className="mt-2.5"
              arrecadado={necessidade.arrecadado}
              meta={necessidade.meta}
              tipo={necessidade.tipo}
              unidade={necessidade.unidade}
              destacarFalta
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Um passo do fluxo: papel com título Fraunces; o atual ganha borda de tinta. */
function Passo({
  titulo,
  descricao,
  atual,
  children,
}: {
  titulo: string;
  descricao?: string;
  atual?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sutil transition-[border-color,box-shadow] duration-300 ease-suave sm:p-6",
        atual && "border-primary/50 shadow-media",
      )}
    >
      <h2 id={id} className="font-display text-xl font-semibold">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Passo 1. Um `fieldset` com `legend` dá nome ao grupo para o leitor de tela;
 * o `RadioGroup` anterior não tinha nome nenhum. Os rádios são nativos e
 * ficam escondidos: o cartão inteiro é o alvo, e as setas do teclado
 * continuam trocando a opção.
 */
function PassoDestino({
  projeto,
  idNecessidade,
  aoEscolher,
  atual,
}: {
  projeto: ProjetoPublico;
  idNecessidade: string | null;
  aoEscolher: (id: string | null) => void;
  atual: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sutil transition-[border-color,box-shadow] duration-300 ease-suave sm:p-6",
        atual && "border-primary/50 shadow-media",
      )}
    >
      <fieldset>
        <legend className="font-display text-xl font-semibold">O que você quer doar?</legend>
        <div className="mt-5 space-y-3">
          <CartaoDeOpcao
            id="destino-dinheiro-livre"
            name="destino"
            value="dinheiro-livre"
            checked={idNecessidade === null}
            onChange={() => aoEscolher(null)}
            eyebrow="Dinheiro"
            titulo="Para o projeto usar onde precisar"
          />

          {projeto.necessidades.map((n) => (
            <CartaoDeOpcao
              key={n.id}
              id={`destino-${n.id}`}
              name="destino"
              value={n.id}
              checked={idNecessidade === n.id}
              onChange={() => aoEscolher(n.id)}
              eyebrow={n.tipo === "item" ? "Item" : "Dinheiro"}
              titulo={n.nome}
            >
              <ProgressBar
                arrecadado={n.arrecadado}
                meta={n.meta}
                tipo={n.tipo}
                unidade={n.unidade}
                destacarFalta
              />
            </CartaoDeOpcao>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

/**
 * Opção selecionável em papel: rádio nativo escondido, cartão que ganha borda
 * de tinta ao ser escolhido. O `label` cobre o cartão inteiro (`after`), e o
 * conteúdo extra (a barra) fica fora dele, para o leitor de tela ouvir só o
 * nome da opção.
 */
function CartaoDeOpcao({
  id,
  name,
  value,
  checked,
  onChange,
  eyebrow,
  titulo,
  descricao,
  children,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  children?: ReactNode;
}) {
  return (
    <div className="relative rounded-xl border bg-card p-4 transition-[border-color,background-color] duration-200 ease-suave hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-tinta-azulpo/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
      <div className="flex items-start gap-3">
        <input
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          aria-describedby={descricao ? `${id}-descricao` : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-input bg-card transition-[border-width,border-color] duration-150 peer-checked:border-[6px] peer-checked:border-primary"
        />
        <div className="min-w-0 flex-1">
          {eyebrow && <span className="rotulo-caps block">{eyebrow}</span>}
          <label
            htmlFor={id}
            className="block cursor-pointer font-semibold leading-snug after:absolute after:inset-0 after:rounded-xl"
          >
            {titulo}
          </label>
          {descricao && (
            <span id={`${id}-descricao`} className="mt-1 block text-sm text-muted-foreground">
              {descricao}
            </span>
          )}
        </div>
      </div>
      {children && <div className="mt-3 pl-8">{children}</div>}
    </div>
  );
}

/**
 * Ação principal, com a tese dita uma vez, logo acima do botão que a aciona.
 * No celular vira barra fixa no rodapé: o formulário é longo e o botão ficava
 * fora do alcance do polegar depois do QR Code. Fica dentro do `<form>` de
 * propósito, para continuar submetendo.
 */
function Rodape({
  rotulo,
  enviando,
  desabilitado,
}: {
  rotulo: string;
  enviando: boolean;
  desabilitado?: boolean;
}) {
  return (
    // Sem animação de layout: o transform dela vira referência para a barra
    // fixa do celular, que pulava para o meio do formulário.
    <div>
      <p className="text-sm text-muted-foreground">
        Sua doação entra na barra do projeto quando a ONG confirmar que recebeu. Você recebe um
        e-mail nessa hora.
      </p>
      <div className="mt-4 max-md:barra-fixa-inferior max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:mt-0 max-md:border-t max-md:bg-card/95 max-md:px-4 max-md:pt-3 max-md:shadow-alta max-md:backdrop-blur-md">
        <Button
          type="submit"
          size="lg"
          variant="cta"
          className="w-full"
          disabled={enviando || desabilitado}
        >
          {enviando && <Loader2 className="animate-spin" aria-hidden="true" />}
          {enviando ? CTA.registrando : rotulo}
        </Button>
      </div>
    </div>
  );
}

/**
 * Identificação do doador, igual para item e dinheiro. Os dois esquemas estendem
 * `identificacaoDoadorSchema`, então o componente enxerga só essa parte.
 */
function CamposDeIdentificacao({
  form,
  atual,
}: {
  form: UseFormReturn<IdentificacaoDoador>;
  atual: boolean;
}) {
  return (
    <Passo
      titulo="Quem está doando"
      descricao="Não precisa criar senha. O e-mail é por onde você recebe o comprovante."
      atual={atual}
    >
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="doador_nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seu nome</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="doador_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seu e-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="anonima"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="font-normal">Quero doar anonimamente</FormLabel>
                <FormDescription>
                  Seu nome não aparece em nenhuma tela pública. A ONG continua vendo os dados,
                  porque é ela que confirma o recebimento.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
    </Passo>
  );
}
