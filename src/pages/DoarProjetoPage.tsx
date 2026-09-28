import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, HandCoins, Loader2, Package } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useProjeto } from "@/hooks/queries/useProjeto";
import { maskCurrency, parseCurrency, formatCurrency } from "@/lib/format";
import {
  doacaoDinheiroSchema, doacaoItemSchema, VALORES_SUGERIDOS,
  type DoacaoDinheiroInput, type DoacaoItemInput,
} from "@/lib/schemas/doacao";

/**
 * Fluxo de doação em uma página só, com os passos visíveis.
 *
 * O login deixa de ser exigido: antes o visitante preenchia tudo e só então
 * descobria que precisava criar conta. Agora bastam nome e e-mail, e a conta
 * fica como sugestão na tela de agradecimento.
 */
export default function DoarProjetoPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { data: projeto, isPending, isError } = useProjeto(slug);
  const [idNecessidade, setIdNecessidade] = useState<string | null>(params.get("necessidade"));
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
  const nomeRecebedor =
    projeto.ong?.pix_nome_recebedor?.trim() || projeto.ong?.nome || "Organização";

  return (
    <PublicShell>
      <Seo
        title={`Doar para ${projeto.nome_projeto}`}
        description={`Contribua com o projeto ${projeto.nome_projeto}.`}
        noIndex
      />

      <div className="container max-w-2xl py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to={`/projetos/${projeto.slug ?? projeto.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar ao projeto
          </Link>
        </Button>

        <h1 className="text-2xl font-bold">Doar para {projeto.nome_projeto}</h1>
        <p className="mt-1 text-muted-foreground">{projeto.ong?.nome}</p>

        {/* Passo 1 — o que doar */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">1. O que você quer doar?</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={idNecessidade ?? "dinheiro-livre"}
              onValueChange={(v) => setIdNecessidade(v === "dinheiro-livre" ? null : v)}
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
                  <CardTitle className="text-lg">2. Quanto e como entregar</CardTitle>
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
                                      ? ` — ${projeto.ong.horarios_recebimento}`
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
                                  A ONG entra em contato pelo e-mail que você informar.
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

              <CamposDeIdentificacao form={formItem} />

              <Button type="submit" size="lg" variant="cta" className="mt-4 w-full" disabled={enviando}>
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar doação
              </Button>
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
                  <CardTitle className="text-lg">2. Quanto você quer doar?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {VALORES_SUGERIDOS.map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={valorEmReais === v ? "default" : "outline"}
                        onClick={() =>
                          formDinheiro.setValue("valor", v, { shouldValidate: true })
                        }
                      >
                        {formatCurrency(v)}
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

              <CamposDeIdentificacao form={formDinheiro} />

              {valorEmReais > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">4. Pague com Pix</CardTitle>
                    <CardDescription>
                      Faça a transferência no app do seu banco e depois registre a doação
                      aqui, para a ONG conseguir confirmar o recebimento.
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

              <Button type="submit" size="lg" variant="cta" className="mt-4 w-full" disabled={enviando}>
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Já paguei, registrar doação
              </Button>
            </form>
          </Form>
        )}
      </div>
      <Footer />
    </PublicShell>
  );
}

/** Passo 3, igual para item e dinheiro. */
function CamposDeIdentificacao({ form }: { form: ReturnType<typeof useForm<any>> }) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">3. Quem está doando</CardTitle>
        <CardDescription>
          Não é preciso criar senha. Usamos o e-mail para avisar quando a ONG confirmar.
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
                  Seu nome não aparece em nenhuma exibição pública. A ONG ainda vê os dados
                  para poder confirmar o recebimento.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
