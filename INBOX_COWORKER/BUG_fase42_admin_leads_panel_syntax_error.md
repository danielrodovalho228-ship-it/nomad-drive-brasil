# [BUG Fase 42] Painel de Leads no admin não carrega — SyntaxError no admin.html deployado ("Unexpected token ')'")

**Autor:** Claude (QA) — 2026-05-24
**Severidade:** Alta (painel de leads 100% inoperante em produção)
**Tipo:** Bug de frontend no `admin.html` **deployado** (não bate com o local)

## Sintoma
`admin.html#leads` fica preso em **"Carregando leads..."** pra sempre. Nenhum card renderiza, KPIs ficam "—", e clicar "🔄 Atualizar" **não dispara nenhuma request** pra `leads_enriched`.

## Diagnóstico (confirmado em produção)
1. **Backend 100% OK** — após o redeploy da `submit-lead-quote`, o lead persiste e a view enriquece certinho. Provas:
   - Submeti "QA Teste 42 PosDeploy" → resposta `{"ok":true,"captured":true,"lead_id":"587ecda9-..."}`.
   - `leads_enriched` retorna a linha: `status=novo, source=landing_form, sla_status=ok, contact_type=email, age_hours=0`.
   - **A própria client da página** (`window.ndAuth.client().from('leads_enriched').select('*')`) retorna `OK, rowCount=1` — ou seja, RLS + query + dados estão perfeitos.

2. **O problema é puramente JS no admin.html deployado.** Console da página:
   ```
   [EXCEPTION] https://nomadedrive.com.br/admin.html:2057:45
   SyntaxError: Unexpected end of input
   ```
   Rodando `new Function()` em cada `<script>` inline do admin.html deployado, **o bloco #2 não compila**:
   - **Bloco inline #2 → linhas 1179–2058 do admin.html deployado (~39.5k chars)**
   - Erro real do parser: **`Unexpected token ')'`** (o browser mostra como "Unexpected end of input" no fim do bloco, linha 2057).
   - Contagem de parênteses no arquivo todo: **2423 `(` vs 2426 `)` → 3 `)` a mais**. Chaves `{}` e `[]` batem; sem template literals; `<script>`/`</script>` batem 11/11.
   - Linha 2057 (deployado) termina com "…co." (parece um trecho truncado/quebrado).

   Como o bloco #2 inteiro falha no parse, **nada dentro dele é definido** — confirmei que `window._leadsCache`, `window.loadLeadsRich` e o handler do botão "Atualizar" estão todos `undefined`. Por isso o painel nunca busca os leads.

## ⚠️ Observação importante: deployado ≠ local
O `admin.html` deployado tem **3902 linhas**. O `admin.html` no repo local que eu enxergo tem ~1730 linhas (e compila **limpo**, 0 erros de sintaxe). Ou seja, o build que está no ar é diferente do arquivo local — provavelmente o deployado foi gerado a partir de outra versão que tem o `)` sobrando. **Conferir qual fonte gera o admin.html de produção.**

## Fix
1. No source que gera o `admin.html` de produção, achar o **`)` sobrando** no bloco inline que vai da ~linha 1179 à ~2058 (região do painel de leads / `loadLeadsRich`). Dica: rodar o mesmo check —
   ```js
   // pra cada <script> sem src:
   try { new Function(scriptBody); } catch(e){ console.log(e.message); }
   ```
   até o bloco #2 compilar limpo. O parser para em `Unexpected token ')'`.
2. Conferir a divergência local↔deploy do `admin.html` (o local de 1730 linhas compila; o de prod de 3902 não). Sincronizar pra não re-deployar o errado.
3. Redeploy.

## Critério de aceite (eu reteto)
`admin.html#leads` carrega os leads (já tem 1 real: "QA Teste 42 PosDeploy"), KPIs contam certo, filtros/transições (`update_lead_status`) funcionam. Aí fecho o Bloco 6 inteiro.

## Status do resto da Fase 42
- Migração `supabase-fase42-painel-leads.sql` → **rodada ✅** (tabela/view/RPC existem).
- Redeploy `submit-lead-quote` → **feito ✅** (lead persiste, retorna lead_id).
- **Falta só** este fix do `)` no admin.html + redeploy → destrava o Bloco 6.
