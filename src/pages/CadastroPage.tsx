import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Building2, Check, Eye, EyeOff, HandHeart, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader,
} from "@/components/ui/card";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PublicShell } from "@/components/layout/PublicShell";
import { Seo } from "@/components/common/Seo";
import { Callout } from "@/components/common/Callout";
import { regrasDeSenha } from "@/lib/schemas/auth";
import {
  cadastroDoadorSchema, cadastroOngSchema,
  type CadastroDoadorInput, type CadastroOngInput,
} from "@/lib/schemas/cadastro";
import { UFS } from "@/lib/constants/ufs";
import { formatCep, formatPhone } from "@/lib/format";
import { buscarCep } from "@/lib/viacep";
import { onlyDigits } from "@/lib/validators";

type TipoDeConta = "doador" | "ong";

/** Checklist de senha, alimentado pelas mesmas regras que o schema zod usa. */
function ChecklistDeSenha({ senha }: { senha: string }) {
  return (
    <ul className="space-y-1" aria-label="Requisitos da senha">
      {regrasDeSenha.map((regra) => {
        const ok = regra.testa(senha);
        return (
          <li key={regra.id} className="flex items-center gap-2 text-xs">
            {ok ? (
              <Check className="h-3 w-3 text-success" aria-hidden="true" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={ok ? "text-success" : "text-muted-foreground"}>{regra.texto}</span>
            <span className="sr-only">{ok ? "atendido" : "pendente"}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Campos comuns aos dois tipos de conta. */
function CamposDeIdentificacao({
  form, rotuloDoNome, mostrarSenha, alternarSenha,
}: {
  // Os dois schemas divergem, mas estes três campos são idênticos em ambos.
  form: UseFormReturn<any>;
  rotuloDoNome: string;
  mostrarSenha: boolean;
  alternarSenha: () => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="nome"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{rotuloDoNome}</FormLabel>
            <FormControl>
              <Input autoComplete="name" maxLength={80} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl>
              <Input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="senha"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Senha</FormLabel>
            <div className="relative">
              <FormControl>
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  {...field}
                />
              </FormControl>
              <button
                type="button"
                onClick={alternarSenha}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              >
                {mostrarSenha ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <ChecklistDeSenha senha={field.value || ""} />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function AceiteDosTermos({ form }: { form: UseFormReturn<any> }) {
  return (
    <FormField
      control={form.control}
      name="aceite"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start gap-3 space-y-0">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="font-normal">
              Li e aceito os{" "}
              <Link to="/termos" target="_blank" className="text-primary underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" target="_blank" className="text-primary underline">
                Política de Privacidade
              </Link>
              .
            </FormLabel>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

function FormularioDoador({ aoTrocarTipo }: { aoTrocarTipo: () => void }) {
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const form = useForm<CadastroDoadorInput>({
    resolver: zodResolver(cadastroDoadorSchema),
    defaultValues: { nome: "", email: "", senha: "", aceite: false as unknown as true },
  });

  const enviar = async (dados: CadastroDoadorInput) => {
    const { error } = await supabase.auth.signUp({
      email: dados.email.trim().toLowerCase(),
      password: dados.senha,
      options: {
        data: { nome: dados.nome.trim(), contato_ong: true },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "Já existe uma conta com esse e-mail. Tente entrar."
          : "Não foi possível criar a conta. Tente novamente.",
      );
      return;
    }

    toast.success("Conta criada. Bem-vindo.");
    navigate("/");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} noValidate className="space-y-4">
        <CamposDeIdentificacao
          form={form}
          rotuloDoNome="Nome completo"
          mostrarSenha={mostrarSenha}
          alternarSenha={() => setMostrarSenha((v) => !v)}
        />
        <AceiteDosTermos form={form} />

        <Callout tom="info">
          Só isso. Telefone e endereço a gente pede depois, quando fizerem diferença:
          para agendar a coleta de uma doação, por exemplo.
        </Callout>

        <Button type="submit" className="pressionavel w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Criar conta
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={aoTrocarTipo}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Escolher outro tipo de conta
        </Button>
      </form>
    </Form>
  );
}

function FormularioOng({ aoTrocarTipo }: { aoTrocarTipo: () => void }) {
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const form = useForm<CadastroOngInput>({
    resolver: zodResolver(cadastroOngSchema),
    defaultValues: {
      nome: "", email: "", senha: "", nome_ong: "", codigo_ong: "",
      telefone: "", data_nascimento: "", cep: "", logradouro: "",
      cidade: "", estado: undefined, aceite: false as unknown as true,
    },
  });

  /** Ao completar 8 dígitos, preenche cidade, UF e logradouro (achado 11). */
  const aoDigitarCep = async (valor: string) => {
    const formatado = formatCep(valor);
    form.setValue("cep", formatado, { shouldValidate: formatado.length >= 9 });
    if (onlyDigits(formatado).length !== 8) return;

    setBuscandoCep(true);
    const endereco = await buscarCep(formatado);
    setBuscandoCep(false);
    if (!endereco) return;

    if (endereco.cidade) form.setValue("cidade", endereco.cidade, { shouldValidate: true });
    if (endereco.estado) form.setValue("estado", endereco.estado, { shouldValidate: true });
    if (endereco.logradouro) form.setValue("logradouro", endereco.logradouro, { shouldValidate: true });
  };

  const enviar = async (dados: CadastroOngInput) => {
    const { data, error } = await supabase.functions.invoke("ong-signup", {
      body: {
        email: dados.email.trim().toLowerCase(),
        password: dados.senha,
        nome: dados.nome.trim(),
        code: dados.codigo_ong.trim().toUpperCase(),
        nome_ong: dados.nome_ong.trim(),
        // A Edge Function espera só os dígitos nesses três campos.
        telefone: onlyDigits(dados.telefone),
        data_nascimento: dados.data_nascimento,
        cidade: dados.cidade.trim(),
        estado: dados.estado,
        cep: onlyDigits(dados.cep),
        logradouro: dados.logradouro.trim(),
      },
    });

    const mensagemDeErro = (data as { error?: string } | null)?.error || error?.message;
    if (mensagemDeErro) {
      // A Edge Function devolve mensagens técnicas; só as conhecidas viram
      // orientação útil, o resto cai num texto que não assusta.
      const ehChave = /chave|code|invalid|used/i.test(mensagemDeErro);
      toast.error(
        ehChave
          ? "Chave de acesso inválida ou já utilizada. Confira com quem forneceu a chave."
          : "Não foi possível concluir o cadastro agora. Tente novamente em instantes.",
      );
      return;
    }

    toast.success("ONG cadastrada. Agora entre com o e-mail e a senha que você criou.");
    navigate("/login");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} noValidate className="space-y-4">
        <FormField
          control={form.control}
          name="nome_ong"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da ONG</FormLabel>
              <FormControl>
                <Input autoComplete="organization" maxLength={80} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="codigo_ong"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chave de acesso</FormLabel>
              <FormControl>
                <Input
                  className="font-mono"
                  placeholder="ONG-XXXX-XXXX"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                Fornecida pela administração da plataforma após a verificação da organização.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <CamposDeIdentificacao
          form={form}
          rotuloDoNome="Nome do responsável"
          mostrarSenha={mostrarSenha}
          alternarSenha={() => setMostrarSenha((v) => !v)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="telefone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="(11) 98765-4321"
                    {...field}
                    onChange={(e) => field.onChange(formatPhone(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_nascimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de nascimento do responsável</FormLabel>
                <FormControl>
                  <Input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="01310-100"
                    {...field}
                    onChange={(e) => aoDigitarCep(e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  {buscandoCep ? "Buscando endereço…" : "Preenche cidade e estado automaticamente."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a UF" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf.sigla} value={uf.sigla}>
                        {uf.sigla} ({uf.nome})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input autoComplete="address-level2" maxLength={80} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logradouro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logradouro</FormLabel>
              <FormControl>
                <Input autoComplete="street-address" maxLength={120} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <AceiteDosTermos form={form} />

        <Button type="submit" className="pressionavel w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Criar a conta da ONG
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={aoTrocarTipo}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Escolher outro tipo de conta
        </Button>
      </form>
    </Form>
  );
}

const opcoesDeConta = [
  {
    chave: "doador" as const,
    icone: HandHeart,
    titulo: "Quero doar ou ser voluntário",
    descricao: "Doar dinheiro ou itens, acompanhar o que a ONG confirmou e se inscrever nos projetos.",
  },
  {
    chave: "ong" as const,
    icone: Building2,
    titulo: "Sou uma ONG",
    descricao: "Precisa da chave de acesso que a administração envia depois de conferir a organização.",
  },
];

export default function CadastroPage() {
  const [params] = useSearchParams();
  const [tipoDeConta, setTipoDeConta] = useState<TipoDeConta | null>(null);

  useEffect(() => {
    const tipo = params.get("tipo");
    if (tipo === "ong" || tipo === "doador") setTipoDeConta(tipo);
  }, [params]);

  const moldura = (titulo: string, descricao: React.ReactNode, conteudo: React.ReactNode, largura: string) => (
    <PublicShell>
      <Seo title="Criar conta" description="Crie sua conta para doar, acompanhar projetos e ser voluntário." />
      <div className="container flex min-h-[70vh] items-center justify-center py-14">
        <Card className={`w-full rounded-xl shadow-sutil ${largura}`}>
          <CardHeader className="text-center">
            <h1 className="break-words font-display text-2xl font-bold">{titulo}</h1>
            <CardDescription>{descricao}</CardDescription>
          </CardHeader>
          <CardContent>{conteudo}</CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="text-primary underline underline-offset-2">Entrar</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </PublicShell>
  );

  if (!tipoDeConta) {
    return moldura(
      "Como você quer participar?",
      "Escolha o tipo de conta para seguir.",
      <div className="grid gap-3 md:grid-cols-2">
        {opcoesDeConta.map((opcao) => (
          <button
            key={opcao.chave}
            type="button"
            onClick={() => setTipoDeConta(opcao.chave)}
            className="elevavel min-h-40 rounded-xl border bg-card p-5 text-left shadow-sutil hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <opcao.icone className="mb-3 h-8 w-8 text-primary" aria-hidden="true" />
            <p className="mb-1 break-words font-semibold">{opcao.titulo}</p>
            <p className="text-sm text-muted-foreground">{opcao.descricao}</p>
          </button>
        ))}
      </div>,
      "max-w-2xl",
    );
  }

  const ehOng = tipoDeConta === "ong";
  return moldura(
    ehOng ? "Cadastro de ONG" : "Cadastro de doador e voluntário",
    ehOng
      ? "Informe os dados da organização e do responsável."
      : "Três campos e pronto.",
    ehOng ? (
      <FormularioOng aoTrocarTipo={() => setTipoDeConta(null)} />
    ) : (
      <FormularioDoador aoTrocarTipo={() => setTipoDeConta(null)} />
    ),
    "max-w-lg",
  );
}
