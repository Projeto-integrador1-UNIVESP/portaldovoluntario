import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const onlyDigits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const requiredText = (value: unknown, max = 255) => String(value ?? "").trim().slice(0, max);
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
const futureDate = (date: string) => Boolean(date) && date > new Date().toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let userId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const email = requiredText(body?.email, 255).toLowerCase();
    const password = String(body?.password ?? "");
    const nome = requiredText(body?.nome, 80);
    const code = requiredText(body?.code, 40).toUpperCase();
    const nomeOng = requiredText(body?.nome_ong, 80);
    const telefone = onlyDigits(body?.telefone);
    const dataNascimento = requiredText(body?.data_nascimento, 10);
    const cidade = requiredText(body?.cidade, 80);
    const estado = requiredText(body?.estado, 2).toUpperCase();
    const cep = onlyDigits(body?.cep);
    const logradouro = requiredText(body?.logradouro, 120);

    if (!email || !password || !nome || !code || !nomeOng || !telefone || !dataNascimento || !cidade || !estado || !cep || !logradouro) {
      return json({ error: "Preencha todos os campos obrigatórios." }, 400);
    }
    if (!validEmail(email)) return json({ error: "Informe um email válido com domínio, como nome@email.com." }, 400);
    if (password.length < 8) return json({ error: "Senha muito curta." }, 400);
    if (telefone.length !== 10 && telefone.length !== 11) return json({ error: "Telefone deve conter 10 ou 11 números." }, 400);
    if (cep.length !== 8) return json({ error: "CEP deve conter exatamente 8 números." }, 400);
    if (futureDate(dataNascimento)) return json({ error: "Data de nascimento não pode ser no futuro." }, 400);

    const { data: codeRow, error: codeErr } = await admin
      .from("ong_access_codes")
      .select("id, used, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (codeErr) throw codeErr;
    if (!codeRow || codeRow.used) return json({ error: "Código inválido ou já utilizado." }, 400);
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) return json({ error: "Código expirado." }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (createErr) {
      const msg = /already been registered|already registered|exists/i.test(createErr.message)
        ? "Este email já está cadastrado. Faça login ou use outro email."
        : createErr.message;
      return json({ error: msg }, 400);
    }
    userId = created.user!.id;

    await admin.from("profiles").delete().eq("user_id", userId);
    const { error: profileErr } = await admin.from("profiles").insert({
      user_id: userId,
      nome,
      email,
      telefone,
      data_nascimento: dataNascimento,
      cidade,
      estado,
      cep,
      logradouro,
      contato_ong: false,
      ativo: true,
    });
    if (profileErr) throw profileErr;

    await admin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: "ong" });
    if (roleErr) throw roleErr;

    const { data: ong, error: ongErr } = await admin
      .from("ongs")
      .insert({
        nome: nomeOng,
        telefone,
        cidade,
        estado,
        cep,
        logradouro,
        status: true,
      })
      .select("id")
      .single();
    if (ongErr) throw ongErr;

    const { error: memberErr } = await admin.from("usuarios_ong").insert({
      id_usuario: userId,
      id_ong: ong.id,
      status: true,
    });
    if (memberErr) throw memberErr;

    const { error: codeUpdateErr } = await admin
      .from("ong_access_codes")
      .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq("id", codeRow.id);
    if (codeUpdateErr) throw codeUpdateErr;

    return json({ ok: true, ong_id: ong.id });
  } catch (e: any) {
    if (userId) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        await createClient(SUPABASE_URL, SERVICE_KEY).auth.admin.deleteUser(userId);
      } catch (_) {
        // best-effort cleanup only
      }
    }
    return json({ error: e?.message ?? String(e) }, 500);
  }
});
