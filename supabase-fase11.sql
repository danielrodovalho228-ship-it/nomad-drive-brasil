-- ============================================================
-- Nomade Drive Brasil — Fase 11: auditoria de ações sensíveis
-- ------------------------------------------------------------
-- COMO USAR:
--   1. Supabase Dashboard > SQL Editor > New query.
--   2. Cole este arquivo inteiro e clique em "Run".
-- Script idempotente: pode ser executado novamente com segurança.
--
-- O QUE ESTE SCRIPT FAZ:
--   - Cria a função audit_row_change(), que registra em admin_audit_logs
--     toda criação e toda mudança de status nas tabelas sensíveis.
--   - Liga gatilhos (triggers) nessas tabelas. Como a função é
--     SECURITY DEFINER, o registro é gravado mesmo que o usuário não
--     tenha permissão de escrita em admin_audit_logs — ou seja, a
--     auditoria não pode ser burlada pelo front-end.
--   - O autor da ação é capturado por auth.uid(); o que mudou vai em
--     metadata_json. Só o admin lê admin_audit_logs (RLS do esquema base).
-- ============================================================

-- ------------------------------------------------------------
-- 1. FUNÇÃO DE AUDITORIA
-- ------------------------------------------------------------
-- Argumentos do trigger:
--   tg_argv[0] = nome da coluna de status a observar
--   tg_argv[1] = rótulo do tipo de alvo (ex.: 'reserva')
--   tg_argv[2] = 'true' para também registrar a criação (INSERT)
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col        text    := tg_argv[0];
  v_label      text    := tg_argv[1];
  v_log_insert boolean := coalesce(tg_argv[2], 'false') = 'true';
  v_old        text;
  v_new        text;
begin
  if tg_op = 'INSERT' then
    if v_log_insert then
      insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata_json)
      values (
        auth.uid(), v_label || '_criado', v_label,
        (to_jsonb(new)->>'id')::uuid,
        jsonb_build_object('status', to_jsonb(new)->>v_col)
      );
    end if;
    return new;
  end if;

  -- UPDATE: registra apenas quando o status realmente mudou
  v_old := to_jsonb(old)->>v_col;
  v_new := to_jsonb(new)->>v_col;
  if v_old is distinct from v_new then
    insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata_json)
    values (
      auth.uid(), v_label || '_status_alterado', v_label,
      (to_jsonb(new)->>'id')::uuid,
      jsonb_build_object('de', v_old, 'para', v_new)
    );
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. GATILHOS NAS TABELAS SENSÍVEIS
-- ------------------------------------------------------------
do $$
declare
  t record;
begin
  -- auditoria de CRIAÇÃO + mudança de status
  for t in
    select * from (values
      ('bookings',            'status',              'reserva'),
      ('vehicles',            'status',              'veiculo'),
      ('protection_cases',    'status',              'ocorrencia'),
      ('rental_inspections',  'status',              'vistoria'),
      ('user_documents',      'status',              'documento')
    ) as x(tbl, col, label)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists trg_audit_%I on public.%I;', t.tbl, t.tbl);
      execute format(
        'create trigger trg_audit_%I after insert or update on public.%I
         for each row execute function public.audit_row_change(%L, %L, %L);',
        t.tbl, t.tbl, t.col, t.label, 'true');
    end if;
  end loop;

  -- auditoria apenas de mudança de status (sem registrar a criação)
  for t in
    select * from (values
      ('user_roles',   'status',              'papel'),
      ('profiles',     'verification_status', 'perfil'),
      ('applications', 'status',              'cadastro')
    ) as x(tbl, col, label)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists trg_audit_%I on public.%I;', t.tbl, t.tbl);
      execute format(
        'create trigger trg_audit_%I after update on public.%I
         for each row execute function public.audit_row_change(%L, %L, %L);',
        t.tbl, t.tbl, t.col, t.label, 'false');
    end if;
  end loop;
end $$;

-- ============================================================
-- Fim — Fase 11 (auditoria de ações sensíveis).
-- ============================================================
