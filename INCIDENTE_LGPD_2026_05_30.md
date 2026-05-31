# Incidente LGPD — 2026-05-30

**Status:** Resolvido em ~1h.
**Severidade:** Média (vazamento confirmado, sem evidência de exploração).
**Detectado por:** Auditoria interna durante debugging de outro bug (não houve denúncia externa).

---

## 1. O que aconteceu

15 views no schema `public` do Supabase (projeto `zeexmbgacvsaciojcrwr`) foram criadas como `owner = postgres` (superuser) e SEM o option `security_invoker = on`.

Em PostgreSQL, quando uma view é dona de um superuser e não tem `security_invoker = on`, ela acessa as tabelas-base com os privilégios do **dono** e não do **chamador**. Resultado: as Row Level Security (RLS) policies das tabelas-base são bypassadas. Qualquer chamador com a chave `anon` do Supabase (que é pública por design e está embutida em todos os arquivos HTML do site `nomadedrive.com.br`) podia executar `GET /rest/v1/<view>` e baixar dados que deveriam ser restritos a `admin`, `owner`, ou ao próprio `client`.

## 2. Views afetadas e dados expostos

| View | Tipo de dado vazado | Rows expostos em 30/05/2026 |
|---|---|---|
| `leads_enriched` | **PII de leads:** nome, email/telefone, cidade, intenção, observações | 12 |
| `client_loyalty` / `client_loyalty_overview` | Tier de fidelidade + nome de clientes ativos/históricos | 5 |
| `damages_full` | Avarias com nome/telefone/email de cliente, dados do veículo, placa, fotos | 4 |
| `owner_earnings` / `owner_dashboard_summary` | Receita acumulada por proprietário, valores líquidos por booking | 4 / 1 |
| `protection_cases_full` | Casos de proteção com PII do reportante, placa, evidências | 8 |
| `top_owners` | Ranking de proprietários por receita gerada (nome, email, R$) | 1 |
| `v_caucao_suggested` | Tier de caução sugerida por cliente (com nome) | 10 |
| `vehicle_health_latest` | Status de rastreador, multas, KM, região por veículo, cliente ativo | 4 |
| `renewal_opportunities` | Bookings prestes a renovar com PII de cliente | 2 |
| `growth_by_period` / `growth_funnel` / `protection_dashboard_stats` / `quality_summary` | **Agregações sem PII** (counts, sums, NPS) — risco menor mas vazavam métricas internas | 1 row cada com valores reais |

**Total de registros únicos com PII potencialmente exposto:** ~30 a 50 (com overlap entre views).
**Categorias especiais (LGPD art. 5º II):** Nenhuma. Não há dados de saúde, biometria, raça, etc.
**Documentos de identificação:** Não há CPF/RG nas views (estão em outras tabelas com RLS funcionando).

## 3. Janela de exposição

- **Início:** desconhecido. As views existem antes do lead mais antigo registrado (24/05/2026). Provavelmente desde a Fase 42 (`leads_enriched` foi criada nessa fase) e equivalentes para as outras.
- **Fim:** 30/05/2026, ~02:30 UTC (quando o `ALTER VIEW SET (security_invoker = on)` foi aplicado).
- **Janela máxima estimada:** ~6 dias (24/05 a 30/05) para `leads_enriched`. Para as outras views, possivelmente meses (não auditado).

## 4. Evidência de exploração

**Análise dos logs disponíveis (`mcp__supabase__get_logs service=api`):**

- Retenção visível na consulta: ~últimas 24h.
- Único `HEAD /rest/v1/<view-vazada>` registrado no período: o teste de verificação que eu mesmo rodei via curl em 30/05.
- Não há tráfego suspeito (IPs externos, user-agents não-browser) nas views afetadas no período auditado.
- **Não há retenção de logs HTTP da janela completa** (24/05 a 30/05) — não é possível afirmar com 100% que ninguém explorou.

**Conclusão:** sem evidência de exploração, mas sem prova de que não houve.

## 5. Resposta — o que foi feito

1. **00:30 UTC** — Vazamento descoberto durante debugging do bug "lista vazia no admin.html".
2. **00:45 UTC** — Simulação completa em transação atômica (`BEGIN ... ROLLBACK`) com 5 roles (anon, authd-fake, client, owner, super_admin) confirmou que o `ALTER VIEW SET (security_invoker = on)` fecha o vazamento sem quebrar funcionalidade legítima.
3. **02:30 UTC** — Aplicado em produção (`ALTER VIEW` em 15 views, em transação única).
4. **02:35 UTC** — Verificação via REST API real com a anon key: as 8 views sensíveis testadas retornam `content-range: 0-0/0` para `anon`.
5. **02:40 UTC** — Migration salva como `fase_82_security_invoker_views` no histórico Supabase + arquivo `FASE_82_SECURITY_INVOKER_VIEWS.sql` versionado no repo.

## 6. Avaliação de notificação ANPD (LGPD art. 48)

**Critério legal:** "Quando o incidente puder acarretar risco ou dano relevante aos titulares."

**Análise por critério (conforme guia ANPD):**

| Critério | Avaliação |
|---|---|
| Natureza dos dados | Dados de contato (nome, telefone, email) — categoria comum, não sensível |
| Quantidade de titulares | ~30-50 (volume baixo) |
| Facilidade de identificação | Alta (dados não-anonimizados) |
| Consequências possíveis | Phishing dirigido, ofertas concorrentes, contatos não-solicitados |
| Boa-fé/dolo | Falha técnica não intencional; descoberta e correção pelo próprio controlador |
| Medidas de mitigação | Fix aplicado em <2h da detecção; migration permanente; sem evidência de exploração |
| Categoria especial | Não |

**Recomendação:** O caso fica na **zona cinzenta** do art. 48. Volume baixo + dados não-sensíveis + boa-fé + correção rápida + sem evidência de exploração geralmente NÃO obrigam notificação à ANPD, mas:

1. **Documentar internamente** ✅ (este arquivo).
2. **Avaliar com advogado especializado em LGPD** antes de decidir definitivamente — recomendo consulta nos próximos 2 dias úteis (prazo "razoável" do art. 48 §1º).
3. **Se decidir notificar:** usar formulário "Comunicação de Incidente de Segurança" no portal da ANPD (`https://www.gov.br/anpd/`). Incluir tudo desta seção + a evidência técnica.
4. **Comunicação aos titulares:** se o advogado entender que sim, enviar email aos 12 leads + clientes/owners afetados. Texto-modelo está pendente até decisão jurídica.

## 7. Ações preventivas (já implementadas)

- ✅ Migration `FASE_82_SECURITY_INVOKER_VIEWS.sql` versionada no repo — fix sobrevive a recriações.
- ✅ Comentário no arquivo `FASE_82` instrui devs: **toda nova view deve ter `WITH (security_invoker = on)` no CREATE**.

## 8. Ações preventivas recomendadas (a fazer)

1. **Auditoria periódica** — rodar mensalmente:
   ```sql
   SELECT v.viewname, COALESCE(array_to_string(c.reloptions, ','), 'NO OPTIONS') AS opts
   FROM pg_views v JOIN pg_class c ON c.relname = v.viewname
   WHERE v.schemaname = 'public'
     AND (c.reloptions IS NULL OR NOT 'security_invoker=on' = ANY(c.reloptions))
     AND (has_table_privilege('anon', c.oid, 'SELECT')
       OR has_table_privilege('authenticated', c.oid, 'SELECT'));
   -- Esperado: 0 linhas
   ```
2. **Code review obrigatório** em PRs que toquem schema/views.
3. **Considerar** rate-limiting na anon key via Supabase (já existe, mas não está enforced em rotas REST).
4. **Avaliar Supabase Audit Log** (recurso pago) pra retenção de logs >24h.

---

**Documento criado em:** 2026-05-30
**Próxima revisão:** após consulta jurídica.
