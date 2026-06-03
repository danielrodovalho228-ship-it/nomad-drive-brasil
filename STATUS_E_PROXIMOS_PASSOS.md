# 📍 Status do projeto + Próximos passos

> Atualizado: 02/06/2026 · Site live em `nomadedrive.com.br`

---

## ✅ O que já está pronto (em produção)

### Site público (5 páginas)
- `index.html` — Home com hero, frota, "Para Quem É" (4 perfis com fotos Pexels), comparativo locadoras tradicionais, depoimentos honestos, FAQ 13 perguntas (incluindo Zero Caução + km excedente + estrangeiros), selos rodapé
- `carros/popular.html` — HB20 R$ 3.500/mês, calendário Airbnb, galeria + thumb vídeo, Zero Caução upsell R$ 290/mês
- `carros/sedan.html` — Cronos R$ 4.500/mês, mesma estrutura, Zero Caução R$ 370/mês
- `reservar.html` — 3 passos: datas+carro+motivo (dropdown 9 opções + "Outro"), mapa Leaflet OSM com 5 pontos UDI, dados pessoais com DDI internacional (28 países)
- `politica-privacidade.html` — LGPD-compliant

### Backend
- Supabase `zeexmbgacvsaciojcrwr` — leads, profiles, RLS configurado, security_invoker fixed
- Edge Function `nova-lead v7` — recebe lead + cria conta + envia 2 emails (admin + cliente) via Resend
- Logs confirmam: **emails enviados com sucesso** (último teste: 200 OK)

### Operação
- Documento `OPERACAO_CHECKIN_CHECKOUT.md` com protocolo 13 fotos + 2 opções de devolução + cofre igloohome roadmap
- `CUSTOS_OPERACIONAIS.md` v2.1 com 4 cenários (2/5/10/20 carros)
- `PESQUISA_COFRES_ELETRONICOS.md` com 7 opções comparadas

### Infraestrutura
- GitHub Pages auto-deploy (commit → 5min em prod)
- Supabase Storage configurado pra fotos futuras
- 18 páginas antigas arquivadas em `_arquivo_*/`

---

## 🟡 Pendente — requer decisão sua

| # | Item | Esforço | Custo | Status |
|---|---|---|---|---|
| 1 | **Email v8** — limpar link /nova/login arquivado | 30min | R$ 0 | aguardando OK |
| 2 | **Cloudflare Turnstile** — anti-bot reservar | 1h | R$ 0 | preciso da site key |
| 3 | **Multi-idioma PT/EN/ES** — 5 páginas | 6-8h | R$ 0 | aguardando OK |
| 4 | **OTP SMS** — verificação telefone antes submit | 4h | R$ 0,08-0,15/SMS | aguardando OK |
| 5 | **Sistema assinatura** — Autentique vs DocuSign | 4h impl | R$ 5-40/contrato | aguardando decisão |
| 6 | **Stripe LIVE** — sair de test mode | 30min | R$ 1 teste | aguardando você ativar |
| 7 | **Caf KYC** — validação CNH automática | 3h impl | R$ 8-15/check | aguardando reunião |
| 8 | **Captura email cedo** — refator wizard 3→4 steps | 6h | R$ 0 | aguardando OK |
| 9 | **Hold automático** — anti-duplo lead | 5h | R$ 0 | aguardando OK |
| 10 | **Replicar paleta navy** — carros/popular + sedan + politica | 4h | R$ 0 | aguardando OK |

---

## 📧 Status dos emails Resend

**Funcionando ✅** — logs confirmam status 200 nas últimas chamadas.

### O que já tem:
- Logo oficial Nomade Drive (https://nomadedrive.com.br/images/logo-nomade-drive.jpg) no header HTML
- Template responsivo (max-width 560-620px, mobile-friendly)
- Cores da marca (verde Nomade #4FA600 no admin, mais sóbrio no cliente)
- 2 emails por lead:
  - **Admin** (`contato@nomadedrive.com.br`): "Novo lead — site-reservar-mensal" com tabela de todos os dados
  - **Cliente**: "Cadastro recebido, [Nome]!" com CTA WhatsApp + próximos passos

### O que precisa melhorar (v8 sugerida):
- ❌ Link "Entrar na minha conta" ainda aponta pra `/nova/login.html` (arquivada na Fase 92-C)
- ❌ Textos em PT-BR apenas (sem multi-idioma)
- ❌ Não exibe nome do carro / período no email do cliente (só "cadastro recebido" genérico)
- ⚠ Precisa confirmar: domínio `nomadedrive.com.br` verificado no Resend? (se não, vai pra spam)

**Como verificar**: vai em https://resend.com/domains e confirma o status de `nomadedrive.com.br`. Deve ter SPF, DKIM e Return-Path verdes.

---

## 🌎 Multi-idioma PT / EN / ES — proposta de arquitetura

### Cenário ideal pro público:
- **PT-BR**: padrão (95% dos clientes provavelmente)
- **EN**: profissionais internacionais transferidos pra UDI (Cargill, Algar, Embraer parceiros)
- **ES**: vizinhos hispano-falantes (argentinos, paraguaios, bolivianos)

### Estratégia técnica (3 camadas)

**1. Frontend (5 páginas estáticas)**
- Criar `js/i18n.js` com dicionário PT/EN/ES (1 objeto JSON)
- Marcar cada texto traduzível com `data-i18n="hero.title"`
- Script lê preferência (URL `?lang=en`, depois localStorage, depois `navigator.language`)
- Aplica traduções no `DOMContentLoaded`
- Seletor `PT | EN | ES` no header (3 botões pequenos, ~30px cada)

**Exemplo HTML**:
```html
<h1 data-i18n="hero.title">Carros para quem está chegando em Uberlândia</h1>
<p data-i18n="hero.sub">Locação mensal de 30 a 180 dias...</p>
```

**Exemplo i18n.js**:
```js
const I18N = {
  pt: { 'hero.title': 'Carros para quem está chegando em Uberlândia', ... },
  en: { 'hero.title': 'Cars for those arriving in Uberlândia', ... },
  es: { 'hero.title': 'Coches para quien llega a Uberlândia', ... }
};
```

**2. Datas e moedas** (sem libs externas):
- Datas: `Intl.DateTimeFormat(lang)` (nativo)
- Moeda: continua em R$ (a operação é no Brasil), mas adiciona equivalência:
  - PT: "R$ 3.500/mês"
  - EN: "R$ 3,500/month (~$640 USD)"
  - ES: "R$ 3.500/mes (~€620 EUR)"

**3. Emails Resend** (Edge Function):
- Frontend envia `Accept-Language` header no fetch
- Edge Function lê o header e escolhe template PT/EN/ES
- 3 versões do `tplUser()` e `tplAdmin()`

### Esforço total:
- 5 páginas × ~80 strings = 400 traduções (você revisa as 400 frases)
- Implementação técnica: 6-8h
- Manutenção: cada texto novo precisa entrar nas 3 línguas

### Onde se altera o idioma:
- **Usuário**: clica `PT | EN | ES` no header de qualquer página
- **Daniel**: edita `js/i18n.js` se quiser trocar uma frase

### Recomendação prática
Não implementar AGORA. Razões:
1. 95% dos primeiros leads vão ser BR
2. Pra atender o ocasional estrangeiro, basta o WhatsApp em inglês (você fala)
3. Quando tiver 5+ leads EN/ES, justifica o esforço

**Alternativa rápida** (1h): adicionar barra no topo "🇺🇸 English visitor? WhatsApp Daniel directly" que faz `wa.me/...?text=Hi, I'm interested in long-term car rental in Uberlandia`. Já cobre 90% dos casos sem traduzir nada.

---

## ✍ Sistema de assinatura — Autentique vs DocuSign vs Caf

### Comparação:

| Item | Autentique | DocuSign | Caf |
|---|---|---|---|
| **Função primária** | Assinatura digital | Assinatura digital | KYC (validação identidade) |
| **Origem** | Brasil 🇧🇷 | EUA 🇺🇸 (global) | Brasil 🇧🇷 |
| **Preço/assinatura** | R$ 4-7 | R$ 35-80 | N/A |
| **Preço/KYC** | N/A | N/A | R$ 8-15 |
| **Vencimento** | Sem trial | Trial 30d | Pay-as-you-go |
| **Validade jurídica BR** | ✅ MP 2.200-2/2001 | ✅ MP 2.200-2/2001 | ✅ KYC reconhecido |
| **Validade jurídica EUA/EU** | ⚠ limitada | ✅ ESIGN Act, eIDAS | N/A |
| **API REST** | ✅ simples (1 dia integra) | ✅ complexa (2-3 dias) | ✅ médio (1-2 dias) |
| **WhatsApp signing** | ✅ link mágico | ❌ só email | N/A |
| **Cliente precisa criar conta** | ❌ não | ❌ não | ❌ não |
| **Selfie + CNH biométrico** | ❌ | ❌ | ✅ |
| **Verificação face/CNH** | ❌ | ❌ | ✅ |
| **Score de risco** | ❌ | ❌ | ✅ |

### Resposta direta:

**Autentique ≠ Caf ≠ DocuSign** — não são substitutos, fazem coisas diferentes:

- **Caf valida QUEM É a pessoa** (CNH é real? selfie bate? está na lista negra?)
- **Autentique/DocuSign captura a ASSINATURA** (pessoa concorda com termos?)

### Recomendação ideal pra Nomade Drive:

```
Fluxo de contrato:
1. Cliente preenche reserva no site → Edge Function nova-lead salva
2. Daniel responde por WhatsApp confirmando disponibilidade
3. Cliente envia documentos (CNH + selfie) →
   • Caf API faz validação automática em 30s (R$ 8-15)
   • Aprovado? continua. Reprovado? Daniel manda email humanizado.
4. Daniel gera contrato PDF + manda link Autentique no WhatsApp
   • Cliente assina pelo celular em 60s (R$ 5)
5. PIX da 1ª parcela
6. Carro entregue
```

**Custo total por locação**: ~R$ 13-20 em validação+assinatura (Caf + Autentique)
**Alternativa internacional**: substituir Autentique por DocuSign quando cliente for EUA/EU

### Próximo passo:
- Você marca a reunião do Caf (sem isso não cadastra)
- Eu implemento Autentique enquanto isso (Fase 82-5, ~4h)

---

## 🛡 Proteção anti-fraude — cenários e soluções

### Risco 1: Bot enchendo o formulário com leads falsos
**Solução**: Cloudflare Turnstile (CAPTCHA invisível)
- ✅ Gratuito até 1M requests/mês
- ✅ Sem prompt visual (cliente nem percebe)
- ✅ Bloqueia 99% dos bots sem atrito
- **Implementação**: 1h (preciso só da `site key` que você gera em cloudflare.com/turnstile)

### Risco 2: Alguém clona o site (phishing copiando UI) pra capturar leads
**Soluções em camadas**:

**Camada 1 — DNS + Domain**:
- Você já tem `nomadedrive.com.br` registrado (proteção contra typosquatting limitada)
- Adicionar registros DMARC + DKIM no DNS pra impedir spoofing de email
- Configurar Cloudflare na frente do GitHub Pages → ativa rate limiting + bot detection

**Camada 2 — Site oficial visível**:
- Selo "Site oficial" no footer (já tem CNPJ)
- Verificar conta no Instagram + LinkedIn (icon azul de verificação aumenta confiança)
- Avisos no WhatsApp: "Nosso domínio oficial é nomadedrive.com.br — não responda links de outros domínios"

**Camada 3 — Verificação dupla no fluxo**:
- **OTP SMS no telefone do lead** (Fase 97): cliente digita código 6 dígitos recebido por SMS antes do submit. Impede:
  - Lead em massa com números aleatórios
  - Phishing-clone capturando lead pra usar em golpe
- Custo: R$ 0,08/SMS via Z-API (parceiro nacional)

### Risco 3: Alguém invade o admin
**Solução: 2FA obrigatório no Supabase Auth**:
- Já tem login email+senha do admin
- Adicionar 2FA TOTP (Google Authenticator / Authy)
- Supabase suporta nativamente — só ativar em Auth Settings
- Senha do admin com mínimo 12 chars

### Risco 4: Cliente vê valor R$ 4.500 e tenta golpear (Pix falso, etc)
**Solução: nunca cobrar antes da assinatura do contrato**:
- Fluxo é sempre: contrato Autentique assinado → depois cobrança via Stripe/PIX
- Webhook Stripe confirma pagamento (não confiar em "comprovante" enviado por WhatsApp)
- Cliente que envia "comprovante de PIX" sem aparecer no extrato real = bloqueia + reporta

### Risco 5: Cliente foge com o carro
**Soluções já planejadas**:
- Caf KYC: confirma identidade real
- Caução pré-autorizada no cartão (R$ 1.500-2.500)
- Telemetria Cobli: rastreamento + corte motor remoto opcional
- BO automático após X horas sem resposta

### Resumo de proteções recomendadas (em ordem de prioridade)

| # | Proteção | Esforço | Custo/mês | Bloqueia |
|---|---|---|---|---|
| 1 | Cloudflare Turnstile | 1h | R$ 0 | 99% dos bots |
| 2 | Cloudflare CDN na frente do GitHub Pages | 30min | R$ 0 | DDoS, scraping, geoblock |
| 3 | DMARC/DKIM no DNS | 30min | R$ 0 | Spoofing email |
| 4 | OTP SMS no telefone | 4h | R$ 0,08/lead | Lead fake, phishing |
| 5 | 2FA admin | 15min | R$ 0 | Invasão admin |
| 6 | Caf KYC antes do contrato | 3h | R$ 8-15/check | Identidade falsa |
| 7 | Nunca cobrar sem contrato assinado | regra | R$ 0 | Golpe Pix |
| 8 | Cobli telemetria + corte motor | já tem | já no custo | Fuga com carro |

**Recomendação**: começar pelo #1, #2 e #5 (todos juntos em 2h de trabalho, zero custo recorrente, bloqueia 90% dos cenários).

---

## 🎯 Próximos passos sugeridos (em ordem)

### Esta semana
1. ✅ **Validar emails** (você fazer 1 teste de reserva real e ver se chega) — 5min
2. ✅ **Decidir Fase 99 (email v8)** — eu deployo se aprovar — 30min
3. ✅ **Cloudflare Turnstile** — você cria conta (free), eu integro — 1h
4. ✅ **2FA admin** — você ativa em Supabase Auth — 15min

### Próximas 2 semanas
5. Stripe LIVE — você ativa, eu valido webhook — 30min
6. Reunião Caf — você marca e me passa as credenciais — externo
7. Autentique cadastro — você cria conta (free trial), eu integro — 4h

### Mês 2
8. Replicar paleta navy nas 2 páginas de carro (Fase 93-B) — 4h
9. Captura email cedo (refator wizard) — 6h
10. Página `vistoria.html` (fotos check-in/check-out) — 4h

### Mês 3+
11. Multi-idioma PT/EN/ES (só se aparecerem 5+ leads internacionais) — 8h
12. Hold automático contra duplo lead (só se 20+ leads/mês) — 5h
13. App PWA pra cliente tirar foto na devolução — 6h
14. Cofres igloohome (só após 10+ entregas sem incidente) — R$ 4.000

---

## 📞 O que eu PRECISO de você pra desbloquear

| Item | O que fazer | Onde |
|---|---|---|
| Resend domain | Verificar status `nomadedrive.com.br` | resend.com/domains |
| Cloudflare Turnstile | Criar conta, gerar site key | cloudflare.com/turnstile |
| Stripe LIVE | Ativar conta produção + me passar STRIPE_LIVE_SECRET_KEY | dashboard.stripe.com |
| Autentique | Criar conta + me passar API_TOKEN | autentique.com.br |
| Caf | Marcar reunião + me passar API credentials | caf.io |
| Cobli | Confirmar status setup + me passar API | cobli.co |
| Google Maps | (opcional, hoje uso OSM gratuito) | console.cloud.google.com |
| Foto profissional 4 perfis + 5 pontos UDI | Sócio operacional fotografar | celular sócio |
| Foto SUV preview | Baixar 1 stock photo SUV branco | Pexels |
