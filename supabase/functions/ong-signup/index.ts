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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const { email, password, nome, code, nome_ong, telefone, cidade, estado } = body ?? {};

    if (!email || !password || !nome || !code || !nome_ong) {
      return json({ error: "Campos obrigatórios faltando." }, 400);
    }
    if (String(password).length < 8) {
      return json({ error: "Senha muito curta." }, 400);
    }

    // 1. Validate code
    const { data: codeRow, error: codeErr } = await admin
      .from("ong_access_codes")
      .select("id, used, expires_at")
      .eq("code", code)
      .maybeSingle();
    if (codeErr) throw codeErr;
    if (!codeRow || codeRow.used) {
      return json({ error: "Código inválido ou já utilizado." }, 400);
    }
    if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
      return json({ error: "Código expirado." }, 400);
    }

    // 2. Create auth user
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
    const userId = created.user!.id;

    // 3. Promote to 'ong' role
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: "ong" });

    // 4. Create ONG record
    const { data: ong, error: ongErr } = await admin
      .from("ongs")
      .insert({
        nome: nome_ong,
        telefone: telefone ?? null,
        cidade: cidade ?? null,
        estado: estado ?? null,
        status: true,
      })
      .select("id")
      .single();
    if (ongErr) throw ongErr;

    // 5. Link user as ONG member
    await admin.from("usuarios_ong").insert({
      id_usuario: userId,
      id_ong: ong.id,
      status: true,
    });

    // 6. Mark code as used
    await admin
      .from("ong_access_codes")
      .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
      .eq("id", codeRow.id);

    return json({ ok: true, ong_id: ong.id });
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});