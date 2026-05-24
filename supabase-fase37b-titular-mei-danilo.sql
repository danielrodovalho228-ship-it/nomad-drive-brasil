-- ====================================================================
-- Nomade Drive Brasil — Fase 37b: Configurar MEI no nome do Danilo
-- --------------------------------------------------------------------
-- Decisão de negócio (Daniel, 2026-05-24):
--   Abrir MEI no nome do irmão Danilo Tomaz Rodovalho como ÚNICO DONO.
--   MEI é Empresário Individual — não permite sócio nem mais de 1
--   funcionário CLT. Daniel atua como "sócio operacional" informal
--   (sem vínculo formal no MEI).
--
--   Quando o negócio crescer (faturamento > R$ 60k anual ou precisar
--   contratar formalmente), migrar pra ME no Simples Nacional pra:
--     - Aceitar sócios oficiais (Daniel entra como sócio)
--     - Contratar mais funcionários CLT
--     - Faturar até R$ 360k/ano (vs R$ 81k MEI)
--
-- Esse SQL:
--   1. Atualiza business_settings com nome do titular
--   2. Pre-cadastra Danilo na tabela employees como titular MEI
--   3. Pre-cadastra Daniel como "sócio operacional informal"
--
-- DEPENDÊNCIA: supabase-fase37-cockpit-financeiro.sql tem que ter
-- rodado antes (tabelas business_settings + employees).
--
-- Idempotente — pode rodar de novo sem duplicar.
-- ====================================================================

-- 1. Atualizar configurações da empresa
update public.business_settings
   set company_name = 'Nomade Drive Brasil',
       legal_name = 'Danilo Tomaz Rodovalho 00000000000',  -- razão social MEI: nome + CPF (atualizar quando tiver CPF real)
       tax_regime = 'mei',
       mei_annual_limit = 81000,
       das_mei_monthly = 75.90,
       notes = 'MEI no nome do Danilo Tomaz Rodovalho. Daniel é sócio operacional informal (sem vínculo formal MEI). Migrar pra ME quando faturamento >= R$ 60k anual ou precisar formalizar equipe.',
       updated_at = now()
 where id = 1;

-- 2. Pré-cadastrar Danilo como titular MEI (idempotente)
insert into public.employees (
  full_name, role_title, contract_type,
  monthly_salary, benefits_monthly, hire_date,
  notes, active
)
select 'Danilo Tomaz Rodovalho', 'Titular MEI (CEO formal)', 'socio',
       0, 0, current_date,
       'Titular único do MEI Nomade Drive Brasil. Empresário Individual — assina contratos, recibos, NFs. Daniel opera o negócio no dia-a-dia mas sem vínculo formal MEI. Quando migrar pra ME, Danilo + Daniel viram sócios cotistas.',
       true
where not exists (
  select 1 from public.employees
  where full_name = 'Danilo Tomaz Rodovalho' and active = true
);

-- 3. Pré-cadastrar Daniel como sócio operacional informal
insert into public.employees (
  full_name, role_title, contract_type,
  monthly_salary, benefits_monthly, hire_date,
  notes, active
)
select 'Daniel Tomaz Rodovalho', 'CEO operacional (informal)', 'informal',
       0, 0, current_date,
       'Sócio operacional do Nomade Drive Brasil. Responsável por TI, produto, marketing e operação. Sem vínculo formal no MEI (atual estrutura não permite). Receberá distribuição de lucros como pessoa física via Pix do MEI.',
       true
where not exists (
  select 1 from public.employees
  where full_name like 'Daniel%Tomaz%Rodovalho' and active = true
);

-- 4. Adicionar despesa recorrente: distribuição mensal pro Daniel (quando começar)
--    COMENTADO pra você ativar quando começar a retirar.
-- insert into public.expenses (category, vendor, description, amount, due_date, recurrence, notes)
-- values (
--   'distribuicao_lucros', 'Daniel Tomaz Rodovalho',
--   'Distribuição mensal de lucros — Daniel (sócio operacional)',
--   2000.00, date_trunc('month', current_date) + interval '1 month',
--   'monthly', 'MEI isenta até R$ 28.560/ano (Lei 11.482/2007). Excedente sujeito a IRPF.'
-- );

-- 5. Verificação
do $$
declare
  has_settings boolean;
  emp_count int;
  socios int;
begin
  select exists(select 1 from public.business_settings where legal_name like 'Danilo%') into has_settings;
  select count(*) into emp_count from public.employees where active = true;
  select count(*) into socios from public.employees where active = true and contract_type in ('socio','informal');

  raise notice '=== Fase 37b: MEI Danilo ===';
  raise notice 'business_settings.legal_name atualizado: %', has_settings;
  raise notice 'employees ativos: %', emp_count;
  raise notice 'sócios (formal + informal): %', socios;

  if has_settings and emp_count >= 2 then
    raise notice 'OK — Cockpit vai mostrar titular MEI + Daniel como sócio operacional.';
    raise notice '';
    raise notice 'Próximos passos sugeridos:';
    raise notice '  1. Quando tiver CPF do Danilo formalizado, atualizar legal_name';
    raise notice '  2. Quando começar distribuição de lucros, descomentar despesa recorrente';
    raise notice '  3. Quando contratar 2 funcionários, alerta MEI vai aparecer (precisa ME)';
  end if;
end $$;

-- ====================================================================
-- ROLLBACK (se precisar reverter):
-- delete from public.employees where full_name in (
--   'Danilo Tomaz Rodovalho', 'Daniel Tomaz Rodovalho'
-- );
-- update public.business_settings set legal_name = null where id = 1;
-- ====================================================================
