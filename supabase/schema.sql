-- Faith Steps: banco na nuvem.
-- Cole tudo no SQL Editor do Supabase e clique em Run. Pode rodar mais de uma vez.
-- Cada pessoa só lê e grava os próprios dados (Row Level Security).

create table if not exists public.perfis (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  criado_em bigint not null,
  look jsonb not null,
  atualizado_em bigint not null
);

-- Histórico que só cresce: cada registro ou compra é uma linha nova, nunca editada.
-- O id vem do aparelho, então reenviar o mesmo registro não duplica.
create table if not exists public.eventos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dados jsonb not null,
  recebido_em timestamptz not null default now()
);
create index if not exists eventos_usuario_recebido on public.eventos (user_id, recebido_em);

alter table public.perfis enable row level security;
alter table public.eventos enable row level security;

drop policy if exists "perfil: ler o próprio" on public.perfis;
drop policy if exists "perfil: criar o próprio" on public.perfis;
drop policy if exists "perfil: atualizar o próprio" on public.perfis;
drop policy if exists "perfil: apagar o próprio" on public.perfis;
create policy "perfil: ler o próprio" on public.perfis for select to authenticated using ((select auth.uid()) = user_id);
create policy "perfil: criar o próprio" on public.perfis for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "perfil: atualizar o próprio" on public.perfis for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "perfil: apagar o próprio" on public.perfis for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "eventos: ler os próprios" on public.eventos;
drop policy if exists "eventos: criar os próprios" on public.eventos;
drop policy if exists "eventos: apagar os próprios" on public.eventos;
create policy "eventos: ler os próprios" on public.eventos for select to authenticated using ((select auth.uid()) = user_id);
create policy "eventos: criar os próprios" on public.eventos for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eventos: apagar os próprios" on public.eventos for delete to authenticated using ((select auth.uid()) = user_id);
