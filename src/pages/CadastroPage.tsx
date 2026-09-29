import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CascaDeAuth } from "@/components/auth/CascaDeAuth";
import { BotaoMostrarSenha, ChecklistDeSenha } from "@/components/auth/CampoDeSenha";
import { Callout } from "@/components/common/Callout";
import { Ilustracao, type NomeDaIlustracao } from "@/components/common/Ilustracao";
import {
  cadastroDoadorSchema, cadastroOngSchema,
  type CadastroDoadorInput, type CadastroOngInput,
} from "@/lib/schemas/cadastro";
import { UFS } from "@/lib/constants/ufs";
import { formatCep, formatPhone } from "@/lib/format";
import { buscarCep } from "@/lib/viacep";
import { onlyDigits } from "@/lib/validators";
import { mensagemAmigavel } from "@/lib/erros";
import { CTA, TERMOS } from "@/lib/copy";

type TipoDeConta = "doador" | "ong";

const EMAIL_JA_CADASTRADO = /already|registered|exists|já está cadastrado/i;
/** Mensagens da Edge Function `ong-signup` sobre a chave (lá chamada de código). */
const CHAVE_EXPIRADA = /expirad/i;
const CHAVE_INVALIDA = /código|chave/i;

const ERRO_EMAIL_DUPLICADO = "Já existe uma conta com esse e-mail. Tente entrar";
const ERRO_GENERICO = "Não foi possível criar a conta agora. Tente de novo em instantes.";

/**
 * A Edge Function responde todo erro com status 400 ou 500 e `{ error }` no
 * corpo. O `invoke` então devolve `data: null` e um `FunctionsHttpError` cuja
 * mensagem é só "non-2xx status code": o texto útil está em `context`.
 */
async function mensagemDaFuncao(data: unknown, error: unknown): Promise<string | null> {
  const doCorpo = (data as { error?: string } | null)?.error;
  if (doCorpo) return doCorpo;
  if (!error) return null;
  if (error instanceof FunctionsHttpError) {
    const corpo = await error.context.json().catch(() => null);
    if (corpo?.error) return String(corpo.error);
  }
  return error instanceof Error ? error.message : String(error);
}

/** Erro geral do formulário, embaixo do botão. Fica na tela até o próximo envio. */
function ErroDoFormulario({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="rounded-controle bg-tinta-pessego px-4 py-3 text-sm text-foreground">
      {mensagem}
    </p>
  );
}

/** Campos comuns aos dois tipos de conta. */
/** Campos presentes nos dois cadastros, doador e ONG. */
type CamposComuns = { nome?: string; email?: string; senha?: string; aceite?: true };

function CamposDeIdentificacao({
  form, rotuloDoNome, mostrarSenha, alternarSenha,
}: {
  // Os dois schemas divergem, mas estes três campos são idênticos em ambos.
  form: UseFormReturn<CamposComuns>;
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
              <Input type="email" inputMode="email" autoComplete="email" placeholder="voce@exemplo.com" {...field} />
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
                  className="pr-11"
                  {...field}
                />
              </FormControl>
              <BotaoMostrarSenha visivel={mostrarSenha} aoAlternar={alternarSenha} />
            </div>
            <ChecklistDeSenha senha={field.value || ""} />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

function AceiteDosTermos({ form }: { form: UseFormReturn<CamposComuns> }) {
  return (
    <FormField
      control={form.control}
      name="aceite"
      render={({ field }) => (
        <FormItem className="flex flex-row items-start gap-3 space-y-0">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
          </FormControl>
          <div className="space-y-1">
            <FormLabel className="font-normal leading-snug">
              Li e aceito os{" "}
              <Link to="/termos" target="_blank" className="link-vivo text-primary">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/privacidade" target="_blank" className="link-vivo text-primary">
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

function BotaoTrocarTipo({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" className="w-full" onClick={onClick}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Escolher outro tipo de conta
    </Button>
  );
}

function FormularioDoador({ aoTrocarTipo }: { aoTrocarTipo: () => void }) {
  const navigate = useNavigate();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailAguardandoConfirmacao, setEmailAguardandoConfirmacao] = useState<string | null>(null);

  const form = useForm<CadastroDoadorInput>({
    resolver: zodResolver(cadastroDoadorSchema),
    defaultValues: { nome: "", email: "", senha: "", aceite: false as unknown as true },
  });

  const enviar = async (dados: CadastroDoadorInput) => {
    const email = dados.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: dados.senha,
      options: {
        data: { nome: dados.nome.trim(), contato_ong: true },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      if (EMAIL_JA_CADASTRADO.test(error.message)) {
        form.setError("email", { type: "server", message: ERRO_EMAIL_DUPLICADO });
      } else {
        form.setError("root", { message: mensagemAmigavel(error.message, ERRO_GENERICO) });
      }
      return;
    }

    // Com a confirmação de e-mail ligada, o Supabase responde a um e-mail já
    // cadastrado com um usuário sem identidades, para não revelar quem tem conta.
    if (data.user && data.user.identities?.length === 0) {
      form.setError("email", { type: "server", message: ERRO_EMAIL_DUPLICADO });
      return;
    }

    // Sem sessão na resposta, a conta só ativa depois do clique no link do
    // e-mail (`emailRedirectTo` traz a pessoa de volta para cá).
    if (!data.session) {
      setEmailAguardandoConfirmacao(email);
      return;
    }

    toast.success("Conta criada. Bem-vindo.");
    navigate("/");
  };

  if (emailAguardandoConfirmacao) {
    return (
      <CascaDeAuth
        tituloDaPagina="Confirme seu e-mail"
        eyebrow="Falta um passo"
        titulo="Confirme seu e-mail"
        descricao={
          <>
            Enviamos um link para <strong className="text-foreground">{emailAguardandoConfirmacao}</strong>.
            Abra a mensagem e clique nele para ativar a conta.
          </>
        }
      >
        <div className="space-y-4">
          <Callout tom="info">
            Não achou? Olhe a pasta de spam. O remetente é a Voluntá.
          </Callout>
          <Button asChild size="lg" className="pressionavel w-full">
            <Link to="/login">Já confirmei, quero entrar</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </CascaDeAuth>
    );
  }

  const enviando = form.formState.isSubmitting;

  return (
    <CascaDeAuth
      tituloDaPagina="Criar conta"
      eyebrow="Criar conta"
      titulo="Cadastro de doador e voluntário"
      descricao="Três campos e pronto."
      rodape={<LinkParaEntrar />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(enviar)} noValidate className="space-y-5">
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

          <div className="space-y-3">
            <Button type="submit" className="pressionavel w-full" size="lg" disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {enviando ? CTA.criando : "Criar conta"}
            </Button>
            <ErroDoFormulario mensagem={form.formState.errors.root?.message} />
          </div>
          <BotaoTrocarTipo onClick={aoTrocarTipo} />
        </form>
      </Form>
    </CascaDeAuth>
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

  /** Ao completar 8 dígitos, preenche cidade, UF e logradouro. */
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

    const mensagemDeErro = await mensagemDaFuncao(data, error);
    if (mensagemDeErro) {
      // As mensagens conhecidas caem no campo certo; o resto vira um texto
      // que não assusta, embaixo do botão.
      if (EMAIL_JA_CADASTRADO.test(mensagemDeErro)) {
        form.setError("email", { type: "server", message: ERRO_EMAIL_DUPLICADO });
      } else if (CHAVE_EXPIRADA.test(mensagemDeErro)) {
        form.setError("codigo_ong", {
          type: "server",
          message: "Essa chave de acesso expirou. Peça uma nova para a administração",
        });
      } else if (CHAVE_INVALIDA.test(mensagemDeErro)) {
        form.setError("codigo_ong", {
          type: "server",
          message: "Chave de acesso inválida ou já usada. Confira com quem forneceu a chave",
        });
      } else {
        form.setError("root", { message: mensagemAmigavel(mensagemDeErro, ERRO_GENERICO) });
      }
      return;
    }

    toast.success("ONG cadastrada. Agora entre com o e-mail e a senha que você criou.");
    navigate("/login");
  };

  const enviando = form.formState.isSubmitting;

  return (
    <CascaDeAuth
      tituloDaPagina="Cadastro de ONG"
      eyebrow="Criar conta"
      titulo="Cadastro de ONG"
      descricao="Os dados da organização e da pessoa responsável por ela."
      largura="lg"
      rodape={<LinkParaEntrar />}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(enviar)} noValidate className="space-y-5">
          <fieldset className="space-y-5">
            <legend className="font-display text-lg font-semibold">A organização</legend>

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
                      className="font-mono uppercase"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="ONG-XXXX-XXXX"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    A {TERMOS.chave} chega por e-mail depois que a administração confere a organização.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-5 sm:grid-cols-2">
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
                    <FormDescription aria-live="polite">
                      {buscandoCep ? "Buscando endereço…" : "Preenche cidade e estado sozinho."}
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha a UF" />
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
          </fieldset>

          <div className="border-t" role="presentation" />

          <fieldset className="space-y-5">
            <legend className="font-display text-lg font-semibold">Quem responde pela ONG</legend>

            <CamposDeIdentificacao
              form={form}
              rotuloDoNome="Nome do responsável"
              mostrarSenha={mostrarSenha}
              alternarSenha={() => setMostrarSenha((v) => !v)}
            />

            <div className="grid gap-5 sm:grid-cols-2">
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
                    <FormLabel>Data de nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          <AceiteDosTermos form={form} />

          <div className="space-y-3">
            <Button type="submit" className="pressionavel w-full" size="lg" disabled={enviando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {enviando ? CTA.criando : "Criar a conta da ONG"}
            </Button>
            <ErroDoFormulario mensagem={form.formState.errors.root?.message} />
          </div>
          <BotaoTrocarTipo onClick={aoTrocarTipo} />
        </form>
      </Form>
    </CascaDeAuth>
  );
}

function LinkParaEntrar() {
  return (
    <>
      Já tem conta?{" "}
      <Link to="/login" className="link-vivo font-medium text-primary">
        Entrar
      </Link>
    </>
  );
}

const opcoesDeConta: {
  chave: TipoDeConta;
  ilustracao: NomeDaIlustracao;
  titulo: string;
  descricao: string;
}[] = [
  {
    chave: "doador",
    ilustracao: "obrigado",
    titulo: "Quero doar ou ser voluntário",
    descricao: "Doar dinheiro ou itens, acompanhar o que a ONG confirmou e se inscrever nos projetos.",
  },
  {
    chave: "ong",
    ilustracao: "caixa",
    titulo: "Sou uma ONG",
    descricao: `Precisa da ${TERMOS.chave} que a administração envia depois de conferir a organização.`,
  },
];

export default function CadastroPage() {
  const [params, setParams] = useSearchParams();
  const tipoNaUrl = params.get("tipo");
  const tipoDeConta: TipoDeConta | null =
    tipoNaUrl === "ong" || tipoNaUrl === "doador" ? tipoNaUrl : null;

  // O tipo mora na URL: o botão de voltar do navegador e um refresh
  // preservam a escolha, e `/cadastro?tipo=ong` continua linkável.
  const escolher = (tipo: TipoDeConta) => setParams({ tipo });
  const voltar = () => setParams({});

  if (tipoDeConta === "ong") return <FormularioOng aoTrocarTipo={voltar} />;
  if (tipoDeConta === "doador") return <FormularioDoador aoTrocarTipo={voltar} />;

  return (
    <CascaDeAuth
      tituloDaPagina="Criar conta"
      eyebrow="Criar conta"
      titulo="Como você quer participar?"
      descricao="Escolha o tipo de conta para seguir."
      largura="lg"
      rodape={<LinkParaEntrar />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {opcoesDeConta.map((opcao) => (
          <button
            key={opcao.chave}
            type="button"
            onClick={() => escolher(opcao.chave)}
            className="elevavel group flex min-h-52 flex-col rounded-xl border bg-background p-5 text-left shadow-sutil transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Ilustracao nome={opcao.ilustracao} className="h-20" />
            <span className="mt-4 block font-display text-lg font-semibold leading-tight">
              {opcao.titulo}
            </span>
            <span className="mt-1.5 block text-sm text-muted-foreground">{opcao.descricao}</span>
            <span className="link-vivo mt-auto block pt-4 text-sm font-medium text-primary">
              Continuar
            </span>
          </button>
        ))}
      </div>
    </CascaDeAuth>
  );
}
