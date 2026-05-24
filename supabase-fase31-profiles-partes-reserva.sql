-- ====================================================================
-- Nomade Drive Brasil — Fase 31
-- Partes de uma mesma reserva podem LER o perfil uma da outra
-- --------------------------------------------------------------------
-- PROBLEMA (encontrado no QA — Fluxo B):
--   Os e-mails disparados pelo NAVEGADOR (não pela Edge Function) onde o
--   destinatário é a CONTRAPARTE da reserva nunca eram enviados.
--   Ex.: proprietário aprova a retirada → deveria sair "Retirada aprovada"
--   pro cliente, mas o `ndEmails.notify(...)` roda na sessão do navegador
--   do proprietário e tenta resolver o e-mail do cliente em `profiles`.
--   A policy `profiles_select_own` só deixa cada usuário ler o PRÓPRIO
--   perfil (`id = auth.uid() or is_admin()`), então a busca volta com
--   ZERO linhas → o runtime devolve `email_not_found` → e-mail não sai.
--
--   Afeta todos os e-mails "navegador → contraparte":
--     - "Retirada aprovada" / "Check-in recusado" (proprietário → cliente)
--     - "Check-in/out solicitado" (cliente → proprietário)
--     - decisões/contestações que notificam a outra parte pelo dashboard.
--   Os e-mails que saem das Edge Functions (stripe-webhook, close-rental)
--   NÃO sofrem disso, porque usam service role (ignora RLS).
--
-- CORREÇÃO:
--   Adiciona uma policy de SELECT em `profiles` permitindo que o
--   proprietário e o cliente de UMA MESMA reserva leiam o perfil um do
--   outro. Como políticas permissivas no Postgres são combinadas por OR,
--   isto SOMA à `profiles_select_own` (cada um continua lendo o próprio).
--
-- OBSERVAÇÃO DE PRIVACIDADE (revisar):
--   RLS é row-level, não column-level — então esta policy expõe a LINHA
--   inteira do perfil da contraparte ao navegador (inclui telefone,
--   stripe_customer_id, caucao_tier, etc.), não só email/nome. Para quem
--   está transacionando uma locação isso costuma ser aceitável, mas se
--   quiser restringir às colunas (id, full_name, email), me peça que eu
--   troco por uma VIEW/【RPC SECURITY DEFINER】 exposta só com esses campos.
-- ====================================================================

-- 1. SELECT cruzado entre partes da reserva
drop policy if exists profiles_booking_parties_select on public.profiles;
create policy profiles_booking_parties_select on public.profiles
  for select using (
    exists (
      select 1
      from public.bookings b
      where (b.owner_id  = auth.uid() and b.client_id = profiles.id)
         or (b.client_id = auth.uid() and b.owner_id  = profiles.id)
    )
  );

-- ====================================================================
-- 2. Verificação (apenas informativa nos logs do SQL editor)
-- ====================================================================
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'profiles'
    and policyname = 'profiles_booking_parties_select';

  if v_count = 1 then
    raise notice 'OK — policy profiles_booking_parties_select criada. As partes de uma reserva agora leem o perfil uma da outra (e-mails do navegador voltam a sair).';
  else
    raise exception 'FALHA: policy profiles_booking_parties_select não foi criada.';
  end if;
end $$;

-- ====================================================================
-- Fim — Fase 31.
-- ====================================================================
