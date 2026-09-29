import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BadgeCheck, Building2, HandCoins, Loader2, MapPin, Package } from "lucide-react";
import { toast } from "sonner";
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
import { Stepper, type PassoDoFluxo } from "@/components/common/Stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useProjeto, type OngDoProjeto } from "@/hooks/queries/useProjeto";
import { maskCurrency, parseCurrency } from "@/lib/format";
import {
  doacaoDinheiroSchema, doacaoItemSchema, VALORES_SUGERIDOS,
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

/**
 * Fluxo de doação em uma página só, com o passo atual sinalizado no `Stepper`.
 *
 * O login deixa de ser exigido: antes o visitante preenchia tudo e só então
 * descobria que precisava criar conta. Agora bastam nome e e-mail, e a conta
 * fica como sugestão na tela de agradecimento.
 *
 * O aviso de que o dinheiro vai direto para a ONG abre a tela de propósito:
 * essa informação só existia nos Termos de Uso, e é ela que decide se a pessoa
 * confia o suficiente para transferir.
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

  const formItem = useForm<DoacaoItemInput>({
    resolver: zodResolver(doacaoItemSchema),
    defaultValues: {
      quantidade: undefined as unknown as number,
      forma_entrega: "levar",
      doador_nome: profile?.nome ?? "",
      doador_email: user?.email ?? "",
      anonima: false,
    },
  });

  const registrar = async (corpo: Record<string, unknown>) => {
    setEnviando(true);
    const { data, error } = await supabase.functions.invoke("registrar-doacao", {
      body: { id_projeto: projeto!.id, id_necessidade: idNecessidade, ...corpo },
    });
    setEnviando(false);

    const mensagem = (data as { error?: string } | null)?.error || error?.message;
    if (mensagem) {
      toast.error(mensagem);
      return;
    }
    navigate(`/obrigado/${(data as { id: string }).id}`);
  };

  if (isPending) return <PublicShell><PageSkeleton /></PublicShell>;

  if (isError || !projeto) {
    return (
      <PublicShell>
        <Seo title="Projeto não encontrado" noIndex />
        <div className="container py-16">
          <EmptyState
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

  return (
    <PublicShell>
      <Seo
        title={`Doar para ${projeto.nome_projeto}`}
        description={`Contribua com o projeto ${projeto.nome_projeto}.`}
        noIndex
      />

      {/* pb-28 no mobile reserva o espaço da barra fixa com a ação principal */}
      <div className="container max-w-2xl py-8 pb-28 md:pb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to={`/projetos/${projeto.slug ?? projeto.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar ao projeto
          </Link>
        </Button>

        <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">
          Doar para {projeto.nome_projeto}
        </h1>

        {projeto.ong && <SeloDaOng ong={projeto.ong} />}

        <Callout
          tom="confianca"
          titulo={
            ehItem
              ? "A entrega é combinada direto com a organização"
              : "O dinheiro vai direto para a conta da ONG"
          }
          className="mt-4"
        >
          {ehItem ? (
            <>
              O Voluntá não recebe nem guarda os itens: você entrega para{" "}
              <strong className="font-medium text-foreground">{projeto.ong?.nome}</strong>, sem
              taxa nenhuma. Aqui você só registra a doação para a ONG poder confirmar o
              recebimento.
            </>
          ) : (
            <>
              {temPix ? "O Pix sai da sua conta direto para " : "A transferência vai direto para "}
              <strong className="font-medium text-foreground">{nomeRecebedor}</strong>. A
              Voluntá não processa o pagamento, não retém valor nenhum e não cobra taxa
              de ninguém: nem de você, nem da organização. Antes de confirmar, confira se o nome
              do recebedor no app do seu banco é esse.
            </>
          )}
        </Callout>

        <Stepper passos={passos} atual={passoAtual} className="mt-6" />

        {/* Passo 1: o que doar */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">O que você quer doar?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={idNecessidade ?? "dinheiro-livre"}
              onValueChange={(v) => {
                setIdNecessidade(v === "dinheiro-livre" ? null : v);
                setDestinoEscolhido(true);
              }}
              className="space-y-2"
            >
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="dinheiro-livre" id="op-dinheiro-livre" className="mt-1" />
                <Label htmlFor="op-dinheiro-livre" className="flex-1 cursor-pointer font-normal">
                  <span className="flex items-center gap-2 font-medium">
                    <HandCoins className="h-4 w-4" aria-hidden="true" />
                    Dinheiro, para o projeto usar onde precisar
                  </span>
                </Label>
              </div>

              {projeto.necessidades.map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <RadioGroupItem value={n.id} id={`op-${n.id}`} className="mt-1" />
                  <Label htmlFor={`op-${n.id}`} className="flex-1 cursor-pointer font-normal">
                    <span className="flex items-center gap-2 font-medium">
                      {n.tipo === "item" ? (
                        <Package className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <HandCoins className="h-4 w-4" aria-hidden="true" />
                      )}
                      {n.nome}
                    </span>
                    <ProgressBar
                      className="mt-2"
                      arrecadado={n.arrecadado}
                      meta={n.meta}
                      tipo={n.tipo}
                      unidade={n.unidade}
                    />
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {ehItem ? (
          <Form {...formItem}>
            <form
              onSubmit={formItem.handleSubmit((d) =>
                registrar({
                  quantidade: d.quantidade,
                  forma_entrega: d.forma_entrega,
                  doador_nome: d.doador_nome,
                  doador_email: d.doador_email,
                  anonima: d.anonima,
                }),
              )}
              noValidate
            >
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Quanto e como entregar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={formItem.control}
                    name="quantidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Quantidade{necessidade?.unidade ? ` (${necessidade.unidade})` : ""}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={formItem.control}
                    name="forma_entrega"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Como a doação chega até a ONG?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            <div className="flex items-start gap-3 rounded-lg border p-3">
                              <RadioGroupItem value="levar" id="entrega-levar" className="mt-1" />
                              <Label htmlFor="entrega-levar" className="flex-1 cursor-pointer font-normal">
                                <span className="font-medium">Vou levar no local</span>
                                {projeto.ong?.endereco_entrega && (
                                  <span className="mt-1 block text-sm text-muted-foreground">
                                    {projeto.ong.endereco_entrega}
                                    {projeto.ong.horarios_recebimento
                                      ? `. Recebe ${projeto.ong.horarios_recebimento}`
                                      : ""}
                                  </span>
                                )}
                              </Label>
                            </div>
                            <div className="flex items-start gap-3 rounded-lg border p-3">
                              <RadioGroupItem value="coleta" id="entrega-coleta" className="mt-1" />
                              <Label htmlFor="entrega-coleta" className="flex-1 cursor-pointer font-normal">
                                <span className="font-medium">Quero combinar uma coleta</span>
                                <span className="mt-1 block text-sm text-muted-foreground">
                                  A ONG escreve para o e-mail que você informar e combina dia e hora.
                                </span>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <CamposDeIdentificacao form={formItem as unknown as UseFormReturn<IdentificacaoDoador>} />

              <AvisoDeConfirmacao />

              <BarraDeAcao rotulo="Registrar e avisar a ONG" enviando={enviando} />
            </form>
          </Form>
        ) : (
          <Form {...formDinheiro}>
            <form
              onSubmit={formDinheiro.handleSubmit((d) =>
                registrar({
                  valor: d.valor,
                  doador_nome: d.doador_nome,
                  doador_email: d.doador_email,
                  anonima: d.anonima,
                  tipo_doacao: "pix",
                }),
              )}
              noValidate
            >
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Quanto você quer doar?</CardTitle>
                  <CardDescription>
                    Escolha um valor ou digite outro. Não existe valor mínimo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sugestões em ordem crescente: começar por um valor alto ancora
                      a decisão para cima e reduz a chance de a pessoa doar. */}
                  <div className="grid grid-cols-3 gap-2">
                    {VALORES_SUGERIDOS.map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={valorEmReais === v ? "default" : "outline"}
                        aria-pressed={valorEmReais === v}
                        className="pressionavel tabular-nums"
                        onClick={() =>
                          formDinheiro.setValue("valor", v, { shouldValidate: true })
                        }
                      >
                        R$ <span className="tabular-nums">{v}</span>
                      </Button>
                    ))}
                  </div>

                  <FormField
                    control={formDinheiro.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outro valor</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            placeholder="R$ 0,00"
                            className="tabular-nums"
                            value={field.value ? maskCurrency(String(Math.round(field.value * 100))) : ""}
                            onChange={(e) => field.onChange(parseCurrency(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <CamposDeIdentificacao form={formDinheiro as unknown as UseFormReturn<IdentificacaoDoador>} />

              {valorEmReais > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Pague com Pix</CardTitle>
                    <CardDescription>
                      Faça a transferência no app do seu banco. Depois registre aqui, para a
                      ONG conseguir confirmar que o valor chegou.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              <AvisoDeConfirmacao />

              {/* Sem valor não há QR Code na tela: liberar o registro aqui criaria uma
                  doação pendente que a ONG teria de perseguir e cancelar. */}
              <BarraDeAcao
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
      <Footer />
    </PublicShell>
  );
}

/**
 * Quem chega por link compartilhado cai direto aqui e nunca viu o perfil da
 * organização. O nome, a cidade e o selo de verificada são o mínimo para saber
 * para quem o dinheiro está indo.
 */
function SeloDaOng({ ong }: { ong: OngDoProjeto }) {
  const local = [ong.cidade, ong.estado].filter(Boolean).join(", ");

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link
        to={`/ongs/${ong.slug ?? ong.id}`}
        className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
        {ong.nome}
      </Link>

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
  );
}

/**
 * Antecipa a espera. Isso só era dito na tela de agradecimento, depois do
 * envio: a pessoa voltava ao projeto, via a barra igual e achava que o
 * registro tinha falhado.
 */
function AvisoDeConfirmacao() {
  return (
    <Callout tom="info" titulo="A barra do projeto não sobe na hora" className="mt-4">
      Depois de registrar, sua doação fica esperando a organização confirmar que recebeu. É
      essa checagem que mantém os números daqui honestos. Você recebe um e-mail assim que a
      confirmação sair.
    </Callout>
  );
}

/**
 * Ação principal. No celular vira barra fixa no rodapé: o formulário é longo e
 * o botão ficava fora do alcance do polegar depois do QR Code. Fica dentro do
 * `<form>` de propósito, para continuar submetendo.
 */
function BarraDeAcao({
  rotulo,
  enviando,
  desabilitado,
}: {
  rotulo: string;
  enviando: boolean;
  desabilitado?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
      <div className="mx-auto max-w-2xl">
        <Button
          type="submit"
          size="lg"
          variant="cta"
          className="pressionavel w-full shadow-cta"
          disabled={enviando || desabilitado}
        >
          {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          {rotulo}
        </Button>
      </div>
    </div>
  );
}

/**
 * Identificação do doador, igual para item e dinheiro. Os dois esquemas estendem
 * `identificacaoDoadorSchema`, então o componente enxerga só essa parte.
 */
function CamposDeIdentificacao({ form }: { form: UseFormReturn<IdentificacaoDoador> }) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Quem está doando</CardTitle>
        <CardDescription>
          Não precisa criar senha. O e-mail serve para te avisar quando a ONG confirmar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal">Quero doar anonimamente</FormLabel>
                <FormDescription>
                  Seu nome não aparece em nenhuma tela pública. A ONG continua vendo os dados,
                  porque é ela que confirma o recebimento.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
