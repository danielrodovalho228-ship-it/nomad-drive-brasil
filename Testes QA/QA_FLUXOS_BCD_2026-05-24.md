# QA — Fluxos B/C/D + e-mails (sessão 2026-05-24, madrugada autônoma)

**Ambiente:** https://nomadedrive.com.br · **Stripe:** Test Mode
**Contas:** `qa-*@nomadedrive.com.br` (senha Teste123) · aliases caem em `contato@nomadedrive.com.br`
**Executado por:** Claude (QA, navegador + acesso ao repo/código)

---

## TL;DR
- **Fluxo B (check-in/out sem avaria): VALIDADO end-to-end.** Inclusive o submit dos
  formulários de retirada/devolução (que antes não saíam pela automação) agora funciona —
  passei a usar `form.requestSubmit()`.
- **Domínio do Resend está verificado:** e-mails pros `qa-*` chegam como **Delivered**
  (confirmado no Resend e na caixa Hostinger). A limitação de sandbox do QA antigo acabou.
- **3 achados de e-mail** (1 já com fix escrito, 2 com handoff no INBOX_COWORKER).
- **Fluxos C e D:** bloqueados só por falta de reservas novas (SQL pronto em
  `supabase-fase32-qa-reservas-cd.sql`) + passos de Stripe (que faço quando as reservas existirem).

---

## Fluxo B — Check-in / check-out (sem avaria) ✅
Reserva Onix `53e86074` (qa-cliente / qa-proprietario):
1. Cliente **solicita retirada** → insert 200, toast "Solicitação enviada" ✅
2. Proprietário **aprova retirada** → vistoria 204, status "em uso" ✅
   - ⚠️ e-mail "Retirada aprovada" **NÃO saiu** (bug RLS — ver abaixo; fix fase 31).
3. Cliente **solicita devolução** (km 38500 > 38000) → insert 201 ✅
4. Proprietário **aprova devolução SEM avaria** → `close-rental` 200:
   - assinatura cancelada ✅ · caução **liberada/estornada** (não capturada) ✅ · e-mail enviado ✅
5. Timeline da reserva: todas as etapas "Concluído"; caução **Estornado**; assinatura encerrada ✅
6. E-mail **"Locação encerrada"** → **Delivered** no Resend e na caixa Hostinger ✅

**Observação menor (cosmética):** `close-rental` não muda `bookings.status` — o pill do
topo da reserva continua "Aprovado" mesmo encerrada (a timeline mostra "Locação encerrada").
Não mexi (criar status "encerrada" exige tratar em vários painéis/filtros). Baixa prioridade.

**Observação menor:** o e-mail "Locação encerrada" (do `close-rental`) não saúda o cliente
pelo nome (template só usa veículo/valor). Cosmético.

---

## Bug principal encontrado: e-mails "navegador → contraparte" não saem (RLS) — FIX PRONTO
- **Causa:** `ndEmails.notify()` resolve o e-mail do destinatário lendo `profiles` na sessão
  do navegador. A policy `profiles_select_own` só deixa ler o próprio perfil → quando o
  proprietário tenta mandar "Retirada aprovada" pro cliente, lê 0 linhas → `email_not_found`.
- **Confirmado** com cliente supabase autenticado (qa-proprietario): lê booking OK, lê profile
  do cliente = 0 linhas, `notify(...)` → `{ok:false, error:"email_not_found"}`.
- **Afeta (cobertos pela fase 31):** "Retirada aprovada"/"recusada" (owner→client) e
  "check-in/out solicitado" (client→owner).
- **FIX (Daniel escolheu Opção A — RLS):** `supabase-fase31-profiles-partes-reserva.sql`
  (policy `profiles_booking_parties_select`). **FALTA RODAR** no SQL Editor do Supabase.
  Não apliquei eu mesmo por ser controle de acesso. Handoff em
  `INBOX_COWORKER/BUG_email_retirada_aprovada_rls.md`.

---

## Auditoria dos 14 e-mails — ✅ 14/14 DELIVERED (após fixes + deploy)
| # | E-mail (assunto real) | Origem | Status |
|---|---|---|---|
| 1 | Seu cadastro foi aprovado | admin cadastros (notifyEmail) | ✅ **Delivered** (qa-parceiro) |
| 2 | Sobre seu cadastro… (recusa) | admin cadastros (notifyEmail) | ✅ **Delivered** (qa-parceiro) |
| 3 | Seus documentos foram aprovados | admin KYC (kyc_approved) | ✅ **Delivered** (qa-cliente) |
| 4 | Documentos precisam de ajustes (recusa) | admin KYC (kyc_rejected) | ✅ **Delivered** (qa-cliente) |
| 5 | Seu veículo foi aprovado | admin Frota (cowork fix) | ✅ **Delivered** (qa-proprietario) |
| 6 | Seu veículo não foi aprovado | admin Frota (cowork fix) | ✅ **Delivered** (qa-proprietario) |
| 7 | Mensalidade confirmada | stripe-webhook (service role) | ✅ Delivered |
| 8 | Caução autorizada | stripe-webhook (service role) | ✅ Delivered |
| 9 | Check-in aprovado / Retirada aprovada | navegador (notify) | ✅ **Delivered** (após fase 31) |
| 10 | Locação encerrada | close-rental (service role) | ✅ Delivered |
| 11 | Devolução recebida — avaria em análise | close-rental (service role) | ✅ **Delivered** (Fluxo C) |
| 12 | Decisão da Proteção | damage-capture (service role) | ✅ **Delivered** (após fix de fallback + deploy) |
| 13 | Contestação registrada (+ aviso Proteção) | navegador (cowork) | ✅ **Delivered** (após deploy) |
| 14 | Assinatura cancelada | stripe-subscription (service role) | ✅ **Delivered** (Fluxo D) |

**Todos os 14 confirmados Delivered no Resend** (qa-cliente / qa-proprietario / suporte).
Os gaps #5/#6 (veículo) e #13 (contestação) foram implementados pelo cowork; #9 destravado
pela fase 31; #12 corrigido (fallback de e-mail no damage-capture). **Bônus entregues:**
case_resolved (Triagem concluída), case_opened (Recebemos sua ocorrência + aviso Proteção).

Extra (fora dos 14): `case_resolved_client` (ocorrência triada pela Proteção → cliente)
também falha por RLS — a Proteção não é parte da reserva, e a fase 31 não cobre.
Handoffs: `INBOX_COWORKER/BUG_email_contestacao_inexistente.md` e
`INBOX_COWORKER/BUG_email_case_resolved_protecao_rls.md`.

---

## ✅ Fluxo C — Avaria + captura de caução — VALIDADO (funcional)
Reserva HB20 (após Daniel autorizar a caução R$1.000):
- check-in solicitado (201) → proprietário aprovou (204) → **#9 "Check-in aprovado" Delivered** ✅
- devolução solicitada (201) → proprietário aprovou COM avaria (Risco na lataria, R$300):
  damage insert 201, close-rental 200, **caução RETIDA** (held, não liberada) ✅,
  **#11 "Devolução recebida — avaria em análise" Delivered** ✅
- Proteção aprovou captura: damage-capture 200, **capturou R$300** (R$700 liberado),
  payment→pago ✅ — **MAS #12 não saiu** (`email_sent:false`; bug corrigido, aguarda deploy Edge)
- cliente contestou: damages update 204, status `em_contestacao` ✅ — **#13 não saiu**
  (código do cowork pronto, aguarda deploy)

## ✅ Fluxo D — Cancelar assinatura — VALIDADO
Após o Daniel pagar a mensalidade do T-Cross (assinatura criada):
- Cliente clica "Cancelar assinatura" → `stripe-subscription` (action cancel) → 200/ok:true.
- App: notice "Assinatura cancelada. Não haverá novas cobranças.", status → **Cancelada**,
  botão → "Assinatura cancelada" (desabilitado).
- Banco: `stripe_subscription_id` → **NULL** ✅.
- E-mails (Resend, qa-cliente, **Delivered**): **#14 "Assinatura cancelada"** ✅ +
  #7 "Mensalidade confirmada" ✅.

## Atualização (madrugada, autônomo)
- **Seed RODADO** direto no SQL Editor do Supabase ✅. Reservas criadas:
  - HB20 (Fluxo C): `fdd3cf24-df66-41ac-b392-61fe818e20f0`
  - T-Cross (Fluxo D): `b95ddf57-c150-4ac6-a894-97c500d6d7e2`
- **stripe-checkout validado:** "Pagar mensalidade" do T-Cross abre o Checkout em modo
  subscription (`cs_test_...`), **sem o erro `cancel_at`** — aquele bug está corrigido. ✅
- **BLOQUEIO real pra concluir C e D:** a tela de cartão do Stripe (`checkout.stripe.com`)
  é **bloqueada pra automação** (camada de segurança — não preencho cartão em formulário).
  Então NÃO consigo digitar o cartão de teste. Isso trava:
  - **Fluxo D:** completar o pagamento → criar a assinatura → (aí eu cancelo + valido #14).
  - **Fluxo C:** autorizar a caução → (aí eu faço avaria/captura/contestação + valido #11/#12).

## O que falta pra fechar (e como destravar)
1. **Rodar `supabase-fase31-...sql`** → libera e-mail #9. Depois eu reteto.
2. **Daniel entra com o cartão de teste 4242 nas telas do Stripe:**
   - **D:** completar o Checkout do T-Cross (já abri uma aba nele). Cria a assinatura → eu cancelo + valido #14.
   - **C:** autorizar a caução do HB20. Depois eu faço check-in → devolução COM avaria (R$300+fotos)
     → Proteção captura (damage-capture) → cliente contesta → valido #11/#12/#13.
3. **E-mails admin #1–6:** preciso de um login admin de teste (ou alguém dispara e eu valido
   no Resend). Não tenho a senha do super-admin.

## Melhorias pro code (consolidado em INBOX_COWORKER/MELHORIAS_code.md)
1. Aplicar fase 31 (RLS) — alta. 2. E-mail "Contestação registrada" #13 (não existe) — média.
3. case_resolved_client via server-side — média. 4. bookings.status → "encerrada" — baixa/cosmético.
5. E-mails de Edge Function saudarem pelo nome — baixo/cosmético. 6. Robustez: resolver e-mail do
cliente sem depender do Stripe Customer (fallback por profiles/applications) — média.

---

## Arquivos criados nesta sessão
- `supabase-fase31-profiles-partes-reserva.sql` (fix RLS — RODAR)
- `supabase-fase32-qa-reservas-cd.sql` (seed reservas C/D — RODAR)
- `INBOX_COWORKER/BUG_email_retirada_aprovada_rls.md`
- `INBOX_COWORKER/BUG_email_contestacao_inexistente.md`
- `INBOX_COWORKER/BUG_email_case_resolved_protecao_rls.md`
