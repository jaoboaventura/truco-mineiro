-- Truco Mineiro · banco no Supabase
-- Registro das migrações já aplicadas no projeto (na ordem). Serve de referência
-- para recriar o banco num projeto novo: cole tudo no SQL Editor e rode.

-- ============ 1. contas_e_ranking ============
-- Perfis dos jogadores (1 por conta do Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9][A-Za-z0-9_.]{2,15}$'),
  username_lower text generated always as (lower(username)) stored unique,
  char text not null default 'ze' check (char in ('ze','cida','jorge','lucia','beto')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "perfis visiveis" on public.profiles for select to anon, authenticated using (true);
create policy "dono altera personagem" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from anon, authenticated;
grant update (char) on public.profiles to authenticated;

-- Cria o perfil quando a conta nasce (o nome vem do cadastro)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u text := new.raw_user_meta_data->>'username';
begin
  if u is null or u !~ '^[A-Za-z0-9][A-Za-z0-9_.]{2,15}$' or exists (select 1 from public.profiles p where p.username_lower = lower(u)) then
    u := 'jogador_' || substr(replace(new.id::text,'-',''),1,8);
  end if;
  insert into public.profiles (id, username) values (new.id, u);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Checagens ao vivo do cadastro
create or replace function public.username_available(u text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username_lower = lower(trim(u)));
$$;
create or replace function public.email_available(e text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from auth.users where lower(email) = lower(trim(e)));
$$;
revoke all on function public.username_available(text), public.email_available(text) from public;
grant execute on function public.username_available(text), public.email_available(text) to anon, authenticated;

-- Ranking semanal (semana ISO no horário de Brasília, ex. 2026-W43)
create table public.ranking (
  id uuid primary key references public.profiles(id) on delete cascade,
  semana text not null,
  pts int not null default 0, vit int not null default 0, jogos int not null default 0,
  sem_ant text, pts_ant int not null default 0, vit_ant int not null default 0, jogos_ant int not null default 0,
  xp int not null default 0,
  apelido text not null,
  char text not null default 'ze',
  updated_at timestamptz not null default now()
);
create index ranking_semana_pts on public.ranking (semana, pts desc);
create index ranking_sem_ant on public.ranking (sem_ant);
alter table public.ranking enable row level security;
create policy "ranking publico" on public.ranking for select to anon, authenticated using (true);

create or replace function public.week_id(t timestamptz default now()) returns text
language sql stable set search_path = '' as $$
  select to_char((t at time zone 'America/Sao_Paulo')::date, 'IYYY-"W"IW');
$$;

-- Única forma de pontuar: o servidor confere limites e vira a semana
create or replace function public.record_result(p_won boolean, p_pts int, p_xp int) returns public.ranking
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); wk text := public.week_id(); pr public.profiles; r public.ranking;
begin
  if me is null then raise exception 'sem sessão'; end if;
  if p_pts < 0 or p_pts > 15 or p_xp < 0 or p_xp > 500 then raise exception 'resultado inválido'; end if;
  select * into pr from public.profiles where id = me;
  insert into public.ranking as k (id, semana, apelido, char) values (me, wk, pr.username, pr.char)
    on conflict (id) do nothing;
  select * into r from public.ranking where id = me for update;
  if r.semana <> wk then
    r.sem_ant := r.semana; r.pts_ant := r.pts; r.vit_ant := r.vit; r.jogos_ant := r.jogos;
    r.semana := wk; r.pts := 0; r.vit := 0; r.jogos := 0;
  end if;
  update public.ranking set semana = r.semana, sem_ant = r.sem_ant, pts_ant = r.pts_ant, vit_ant = r.vit_ant, jogos_ant = r.jogos_ant,
    pts = r.pts + p_pts, vit = r.vit + (case when p_won then 1 else 0 end), jogos = r.jogos + 1, xp = r.xp + p_xp,
    apelido = pr.username, char = pr.char, updated_at = now()
  where id = me returning * into r;
  return r;
end $$;
revoke all on function public.record_result(boolean,int,int) from public, anon;
grant execute on function public.record_result(boolean,int,int) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ============ 2. ranking_somente_leitura ============
revoke insert, update, delete on public.ranking from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- ============ 3. login_por_usuario ============
-- Login com nome de usuário: devolve o e-mail da conta só quando a senha confere,
-- assim o navegador entra pelo Supabase Auth sem que o e-mail de ninguém fique exposto.
create or replace function public.login_email(p_user text, p_pw text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare e text; h text;
begin
  if p_user is null or p_pw is null or length(p_pw) > 72 or length(p_user) > 40 then return null; end if;
  select u.email, u.encrypted_password into e, h
    from public.profiles p join auth.users u on u.id = p.id
   where p.username_lower = lower(trim(p_user));
  if e is null or coalesce(h, '') = '' then return null; end if;
  if extensions.crypt(p_pw, h) = h then return e; end if;
  return null;
end $$;
revoke all on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;

-- ============ 4. salas_realtime ============
-- Salas online: canais privados "truco:*" do Realtime, só para quem está logado
create policy "truco: jogadores ouvem as salas" on realtime.messages
  for select to authenticated
  using (realtime.topic() like 'truco:%' and realtime.messages.extension in ('broadcast', 'presence'));
create policy "truco: jogadores falam nas salas" on realtime.messages
  for insert to authenticated
  with check (realtime.topic() like 'truco:%' and realtime.messages.extension in ('broadcast', 'presence'));
