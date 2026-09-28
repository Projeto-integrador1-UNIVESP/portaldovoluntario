import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Registra uma doação, inclusive de quem não tem conta.
 *
 * Por que não uma policy de INSERT para `anon` em `doacoes`: isso deixaria
 * qualquer pessoa gravar linhas arbitrárias contra qualquer ONG, já
 * confirmadas, inflando o progresso sem nada ter chegado. Aqui o servidor
 * valida os dados, ignora o status que o cliente mandar e força 'pendente' —
 * só a ONG destinatária confirma depois.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(v);

const numeroPositivo = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Limite por IP em memória. Some a cada cold start, então não substitui um
 * rate limit de verdade — serve para conter envio repetido acidental e o
 * abuso mais ingênuo.
 */
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 5;
const historico = new Map<string, number[]>();

const excedeuLimite = (ip: string) => {
  const agora = Date.now();
  const recentes = (historico.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  recentes.push(agora);
  historico.set(ip, recentes);
  return recentes.length > MAX_POR_JANELA;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
    if (excedeuLimite(ip)) {
      return json({ error: "Muitas tentativas seguidas. Aguarde um minuto." }, 429);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Corpo da requisição inválido" }, 400);

    const idProjeto = texto(body.id_projeto, 36);
    const idNecessidade = texto(body.id_necessidade, 36);
    const anonima = body.anonima === true;
    const doadorNome = texto(body.doador_nome, 120);
    const doadorEmail = texto(body.doador_email, 160).toLowerCase();
    const formaEntrega = texto(body.forma_entrega, 20);

    if (!idProjeto) return json({ error: "Informe o projeto da doação." }, 400);
    if (!doadorNome || doadorNome.length < 3) {
      return json({ error: "Informe seu nome." }, 400);
    }
    if (!emailValido(doadorEmail)) {
      return json({ error: "Informe um e-mail válido." }, 400);
    }
    if (formaEntrega && !["levar", "coleta"].includes(formaEntrega)) {
      return json({ error: "Forma de entrega inválida." }, 400);
    }

    // A ONG destinatária vem do projeto, nunca do cliente: senão daria para
    // creditar uma doação a uma ONG que não tem nada a ver com o projeto.
    const { data: projeto, error: erroProjeto } = await admin
      .from("projetos")
      .select("id, id_ong, status")
      .eq("id", idProjeto)
      .maybeSingle();

    if (erroProjeto || !projeto) return json({ error: "Projeto não encontrado." }, 404);
    if (!projeto.status) return json({ error: "Este projeto não está mais recebendo doações." }, 409);

    let valor = 0;
    let quantidade: number | null = null;

    if (idNecessidade) {
      const { data: necessidade } = await admin
        .from("necessidades")
        .select("id, tipo, status, id_projeto")
        .eq("id", idNecessidade)
        .maybeSingle();

      if (!necessidade || !necessidade.status) {
        return json({ error: "Necessidade não encontrada." }, 404);
      }
      if (necessidade.id_projeto !== projeto.id) {
        return json({ error: "Essa necessidade não pertence a este projeto." }, 400);
      }

      if (necessidade.tipo === "item") {
        quantidade = numeroPositivo(body.quantidade);
        if (quantidade === null) return json({ error: "Informe quantos itens vai doar." }, 400);
      } else {
        const informado = numeroPositivo(body.valor);
        if (informado === null) return json({ error: "Informe o valor da doação." }, 400);
        valor = informado;
      }
    } else {
      const informado = numeroPositivo(body.valor);
      if (informado === null) return json({ error: "Informe o valor da doação." }, 400);
      valor = informado;
    }

    // Se veio uma sessão válida, a doação fica vinculada à conta.
    let idUsuario: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const comSessao = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await comSessao.auth.getUser();
      idUsuario = data.user?.id ?? null;
    }

    const { data: doacao, error } = await admin
      .from("doacoes")
      .insert({
        id_ong: projeto.id_ong,
        id_projeto: projeto.id,
        id_necessidade: idNecessidade || null,
        id_usuario: idUsuario,
        valor,
        quantidade,
        // Ignorado de propósito o que o cliente mandar: quem confirma é a ONG.
        status: "pendente",
        tipo_doacao: texto(body.tipo_doacao, 20) || "pix",
        doador_nome: doadorNome,
        doador_email: doadorEmail,
        anonima,
        forma_entrega: formaEntrega || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Falha ao gravar doação:", error);
      return json({ error: "Não foi possível registrar a doação." }, 500);
    }

    return json({ id: doacao.id });
  } catch (erro) {
    console.error("Erro inesperado em registrar-doacao:", erro);
    return json({ error: "Erro inesperado ao registrar a doação." }, 500);
  }
});
