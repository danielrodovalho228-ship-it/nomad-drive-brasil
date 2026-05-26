# ✅ Checklist QA — 30 minutos · Top 20 cenários críticos

> Roda em ordem. Use 1 carro do Daniel (Cobalt) + 1 cliente teste (você mesmo) na produção.
> Marque ☐ → ✅ conforme passa. Se falhar, anota no fim.

---

## 🔥 BLOCO 1 — Acesso público (5 min) — anônimo, sem cadastro

- [ ] **1. Landing carrega** — `https://nomadedrive.com.br` abre, hero verde + carrossel de carros aparece
- [ ] **2. Simulador público** — clica "Simular ganho com meu carro" → `/simulador-roi-proprietario.html` abre **sem cadastro**, sliders funcionam ao vivo
- [ ] **3. Compartilhar simulação** — botão "Copiar link" copia URL com query string; cola em nova aba → simulador abre com mesmos valores
- [ ] **4. PDF simulação** — botão "PDF" abre dialog "Salvar como PDF" do browser
- [ ] **5. Programa Gold** — clica em qualquer "Como funciona Gold" → `/programa-gold.html` abre, 4 tiers visíveis (Bronze/Silver/Gold/Platinum)

---

## 👤 BLOCO 2 — Cadastro + login (5 min) — crie conta NOVA

> Use **e-mail descartável** ou +alias do gmail (ex: `seuemail+test1@gmail.com`)

- [ ] **6. Cadastro cliente** — `/cadastro.html` → escolhe "Cliente locatário" → preenche → submete
- [ ] **7. Tela "Conta criada"** aparece com botões "Reenviar e-mail" e "Corrigir e-mail"
- [ ] **8. E-mail de confirmação chega** (Resend SMTP) em até 2 min
- [ ] **9. Confirmação ativa conta** — clica link → vai pra login → entra com senha
- [ ] **10. Boas-vindas-cliente** — após login mostra 4 steps, nome aparece, "Bom dia/tarde" correto

---

## 🚗 BLOCO 3 — Reserva (10 min) — fluxo essencial

> Use cliente do Bloco 2

- [ ] **11. Ver frota** — `/frota.html` ou index → lista carros REAIS (Cobalt, HB20, etc.) com fotos
- [ ] **12. Click num carro** — `/car.html?id=cobalt` abre, fotos do Cobalt, preço, "Pedir orçamento"
- [ ] **13. Pedir orçamento** — formulário aceita dados, mostra confirmação
- [ ] **14. (Admin) Aprovar** — entra como admin → `/admin.html` → ver solicitação → aprovar
- [ ] **15. (Cliente) Receber notificação** — sino in-app no header com badge "1" + e-mail "Reserva aprovada"
- [ ] **16. Ver reserva detalhe** — `/reserva-detalhe.html?id=X` abre, mostra timeline + pagamento
- [ ] **17. Aplicar cupom** — caixa "Tem cupom?" aceita código de teste (criar cupom 10% no admin antes)

---

## 💰 BLOCO 4 — Pagamento + painéis (5 min)

- [ ] **18. Stripe Checkout** — clica "Pagar mensalidade" → vai pra Stripe → cartão teste `4242 4242 4242 4242` → volta confirmado
- [ ] **19. Histórico** — `/historico.html` mostra a reserva nova com status correto
- [ ] **20. Dashboard owner** — entra como proprietário → vê "Sua frota já rendeu R$ X" atualizado

---

## 📱 BLOCO 5 — Mobile (5 min) — abrir cada uma no celular/DevTools

> Use Chrome DevTools → toggle device toolbar → iPhone 13

- [ ] **21. Hero não corta** em `/cadastro.html` (foi o bug que Daniel reportou)
- [ ] **22. Boas-vindas cliente** sem nome cortado
- [ ] **23. Simulador** — sliders funcionam touch, split-bar 90/10 vira vertical em mobile
- [ ] **24. Dashboard cliente** — hero responsivo, KPIs caem 2-col em mobile
- [ ] **25. Sino notificações** — dropdown abre full-width em mobile

---

## ⚠️ Anote bugs encontrados aqui

```
Bug 1:
- Cenário: ...
- Esperado: ...
- Aconteceu: ...

Bug 2:
- ...
```

---

## 🎯 Como interpretar resultados

| Resultado | Ação |
|---|---|
| **25/25 passa** | 🚀 Pode lançar pré-lançamento real |
| **20-24 passa** | 🟡 Bugs menores OK; fixar antes campanha grande |
| **<20 passa** | 🔴 Bloqueado — corrigir críticos primeiro |

---

## 📋 O que NÃO está nesse checklist (mas existe)

Esses fluxos secundários ficam pro **roteiro completo** (`ROTEIRO_QA_FASE41_42_BACKLOG_MOBILE.md`):
- Cancelamento de assinatura
- Avarias / captura de caução
- Saque manual pra owner
- Recuperação de senha completa
- Programa de indicação
- Marketplace de oficina
- Triagem de protocolo
- Push notifications PWA

Esses 8 fluxos podem ser validados em uma **segunda rodada** mais profunda quando você tiver usuários reais usando.
