// Cadastro do Truco Mineiro: cria a conta já confirmada, com nome de usuário único.
// Publicada no Supabase como a função "cadastro" (verify_jwt desligado: a validação é feita aqui).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const USER_RE = /^[A-Za-z0-9][A-Za-z0-9_.]{2,15}$/;
const MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const pwOk = (p: string) =>
  p.length >= 8 && p.length <= 72 && /[A-ZÀ-Ý]/.test(p) && /[a-zß-ÿ]/.test(p) && /\d/.test(p) && /[^A-Za-zÀ-ÿ0-9\s]/.test(p);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  let body: { username?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return json({ erro: "dados", msg: "Dados inválidos." }, 400); }
  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!USER_RE.test(username)) return json({ erro: "nome", msg: "Nome de usuário inválido." }, 400);
  if (!MAIL_RE.test(email) || email.length > 80) return json({ erro: "email", msg: "E-mail inválido." }, 400);
  if (!pwOk(password)) return json({ erro: "senha", msg: "A senha não atende os requisitos." }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: taken } = await admin.from("profiles").select("id").eq("username_lower", username.toLowerCase()).maybeSingle();
  if (taken) return json({ erro: "nome", msg: `Já existe alguém chamado ${username}.` }, 409);

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { username },
  });
  if (error || !data?.user) {
    const dup = /already|registered|exists/i.test(error?.message ?? "");
    return json(dup ? { erro: "email", msg: "Já existe uma conta com esse e-mail." } : { erro: "falha", msg: "Não deu pra criar a conta agora. Tente de novo." }, dup ? 409 : 500);
  }
  // o gatilho cria o perfil; se alguém levou o nome no mesmo instante, desfaz
  const { data: prof } = await admin.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
  if (!prof || prof.username.toLowerCase() !== username.toLowerCase()) {
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ erro: "nome", msg: "Esse nome de usuário acabou de ser escolhido. Tente outro." }, 409);
  }
  return json({ ok: true, username: prof.username });
});
