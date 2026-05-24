# Sprint 1 — Plano de Implementação UI (Timeline + Earnings Counter)

> **Data:** 2026-05-23
> **Fase:** 32
> **Status:** Spec pronta, aguardando deploy
> **Pré-req:** rodar `supabase-fase32-timeline-saques.sql` no Supabase

---

## 📋 Resumo do que vai ser entregue

1. **Contador "Sua frota já rendeu R$ X"** no topo do dashboard do proprietário (animado, count-up)
2. **Timeline visual de marcos** na página da reserva (pra cliente E proprietário)
3. **Card "Saque disponível"** com botão pra solicitar saque (Sprint 2 ativa o pagamento real)
4. **Detalhe por veículo** quando proprietário tem mais de 1 carro

---

## 🗂️ Arquivos que vão mudar

| Arquivo | O que muda | Esforço |
|---|---|---|
| `dashboard-proprietario.html` | + seção "Earnings Counter" no topo + lista de veículos com rendimento | 🟢 Médio |
| `reserva-detalhe.html` | + componente Timeline visual após "Pagamentos" | 🟢 Médio |
| `js/earnings.js` | **novo** — funções de fetch + count-up animado + formatação | 🟢 Baixo |
| `css/timeline.css` | **novo** — estilos da timeline horizontal | 🟢 Baixo |
| `supabase-fase32-timeline-saques.sql` | **novo** — schema + views (já criado) | ✅ Pronto |

---

## 🎨 Componente 1 — Earnings Counter (dashboard-proprietario.html)

### HTML (adicionar logo após o cabeçalho de boas-vindas)

```html
<!-- ============== EARNINGS COUNTER ============== -->
<section id="earnings-counter" class="earnings-section" hidden>
  <div class="earnings-card">
    <h2 class="earnings-label">💰 Sua frota já rendeu</h2>
    <div class="earnings-amount" id="earnings-total">R$ 0,00</div>
    <div class="earnings-deltas">
      <span class="delta-today">+<span id="delta-today">R$ 0</span> hoje</span>
      <span class="delta-sep">·</span>
      <span class="delta-week">+<span id="delta-week">R$ 0</span> esta semana</span>
    </div>
  </div>

  <div class="earnings-meta">
    <div class="meta-item">
      <span class="meta-label">📊 Disponível pra saque</span>
      <span class="meta-value" id="meta-available">R$ 0,00</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">📅 Próximo saque</span>
      <span class="meta-value" id="meta-next">—</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">📈 Projeção do contrato</span>
      <span class="meta-value" id="meta-projected">R$ 0,00</span>
    </div>
  </div>

  <!-- Lista por veículo (aparece se tem >1 veículo) -->
  <div class="earnings-by-vehicle" id="earnings-vehicles" hidden>
    <h3>Por veículo</h3>
    <ul id="earnings-vehicles-list"></ul>
  </div>

  <!-- Frase motivacional rotativa -->
  <p class="earnings-motivation" id="earnings-motivation">
    Carregando...
  </p>
</section>
```

### CSS (novo arquivo `css/earnings.css` ou inline)

```css
.earnings-section {
  background: linear-gradient(135deg, #0f5132 0%, #198754 100%);
  color: white;
  padding: 32px;
  border-radius: 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.earnings-card { text-align: center; margin-bottom: 24px; }

.earnings-label {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.85;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.earnings-amount {
  font-size: 56px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -1px;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.earnings-deltas {
  font-size: 16px;
  opacity: 0.9;
  margin-top: 8px;
}

.delta-today, .delta-week { font-weight: 500; }
.delta-sep { margin: 0 8px; opacity: 0.5; }

.earnings-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  background: rgba(255,255,255,0.1);
  padding: 16px;
  border-radius: 12px;
}

.meta-item { display: flex; flex-direction: column; gap: 4px; }
.meta-label { font-size: 12px; opacity: 0.8; }
.meta-value { font-size: 18px; font-weight: 600; }

.earnings-motivation {
  text-align: center;
  margin-top: 16px;
  font-style: italic;
  opacity: 0.85;
  min-height: 24px;
}

.earnings-by-vehicle { margin-top: 20px; }
.earnings-by-vehicle h3 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  opacity: 0.8;
  margin-bottom: 12px;
}

.earnings-by-vehicle ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.earnings-by-vehicle li {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 4px;
  font-size: 14px;
}

/* Mobile-first */
@media (max-width: 640px) {
  .earnings-amount { font-size: 40px; }
  .earnings-meta { grid-template-columns: 1fr; }
}
```

### JS (novo arquivo `js/earnings.js`)

```javascript
// js/earnings.js — Earnings counter pro dashboard do proprietário
// Requer: sb (supabase client global) + user (authenticated)

const MOTIVATION_PHRASES = [
  '+R$ {today} hoje · subiu como sempre 📈',
  'Seu carro vai render mais que poupança no semestre',
  'Faltam R$ {to_next} pro próximo saque liberar',
  '{progress_pct}% do contrato concluído ⭐⭐⭐⭐⭐',
  'Você está entre os top 20% de proprietários ativos',
  'Seu carro trabalhou enquanto você dormia 💤',
  'Próximo saque em {days_to_next} dias',
  'Sua frota tá rendendo R$ {today}/dia em média'
];

function formatBRL(n) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(n || 0);
}

function pickMotivation(summary) {
  const phrase = MOTIVATION_PHRASES[Math.floor(Math.random() * MOTIVATION_PHRASES.length)];
  const today = formatBRL(summary.today_increment).replace('R$', '').trim();
  const next = summary.next_milestone_date
    ? Math.max(0, Math.ceil((new Date(summary.next_milestone_date) - new Date()) / 86400000))
    : null;
  const progressPct = summary.total_projected
    ? Math.round((summary.total_accrued / summary.total_projected) * 100)
    : 0;
  const toNext = Math.max(0, (summary.total_available || 0));

  return phrase
    .replace('{today}', today)
    .replace('{days_to_next}', next ?? '—')
    .replace('{to_next}', formatBRL(toNext).replace('R$', '').trim())
    .replace('{progress_pct}', progressPct);
}

function animateCountUp(el, target, duration = 1200) {
  const start = parseFloat(el.dataset.current || 0);
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // easing: cubic-bezier easeOutQuart
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = start + (target - start) * eased;
    el.textContent = formatBRL(current);

    if (progress < 1) requestAnimationFrame(tick);
    else el.dataset.current = target;
  }

  requestAnimationFrame(tick);
}

async function loadEarningsCounter() {
  if (!window.sb || !window.currentUser) return;

  // 1. Fetch resumo
  const { data: summary, error: sErr } = await sb
    .from('owner_dashboard_summary')
    .select('*')
    .eq('owner_id', window.currentUser.id)
    .maybeSingle();

  if (sErr || !summary || (summary.active_bookings_count || 0) === 0) {
    document.getElementById('earnings-counter')?.setAttribute('hidden', '');
    return;
  }

  // 2. Mostrar seção
  const section = document.getElementById('earnings-counter');
  section.removeAttribute('hidden');

  // 3. Animar contador grande
  animateCountUp(
    document.getElementById('earnings-total'),
    summary.total_accrued
  );

  // 4. Deltas
  document.getElementById('delta-today').textContent =
    formatBRL(summary.today_increment).replace('R$', '').trim();
  document.getElementById('delta-week').textContent =
    formatBRL(summary.week_increment).replace('R$', '').trim();

  // 5. Meta
  document.getElementById('meta-available').textContent =
    formatBRL(summary.total_available);
  document.getElementById('meta-projected').textContent =
    formatBRL(summary.total_projected);
  document.getElementById('meta-next').textContent = summary.next_milestone_date
    ? new Date(summary.next_milestone_date).toLocaleDateString('pt-BR')
    : '—';

  // 6. Motivacional
  document.getElementById('earnings-motivation').textContent = pickMotivation(summary);

  // 7. Detalhe por veículo (se >1)
  if ((summary.active_vehicles_count || 0) > 1) {
    const { data: vehicles } = await sb
      .from('owner_earnings')
      .select('vehicle_id, make, model, year_model, accrued_amount, client_name')
      .eq('owner_id', window.currentUser.id)
      .eq('booking_status', 'em_uso')
      .order('accrued_amount', { ascending: false });

    if (vehicles?.length) {
      const ul = document.getElementById('earnings-vehicles-list');
      ul.innerHTML = vehicles.map(v => `
        <li>
          <span>🚗 ${v.make} ${v.model} ${v.year_model}</span>
          <span><strong>${formatBRL(v.accrued_amount)}</strong> · ${v.client_name}</span>
        </li>
      `).join('');
      document.getElementById('earnings-vehicles').removeAttribute('hidden');
    }
  }
}

// Refresh leve a cada 30s (simula "tempo real")
window.addEventListener('DOMContentLoaded', () => {
  loadEarningsCounter();
  setInterval(loadEarningsCounter, 30000);
});
```

### Como injetar no `dashboard-proprietario.html`

```html
<!-- No <head> -->
<link rel="stylesheet" href="css/earnings.css?v=20260524a">

<!-- No <body>, logo após o header de boas-vindas e antes das outras seções -->
<!-- Cola o HTML do "EARNINGS COUNTER" mostrado acima -->

<!-- Antes do </body>, junto com outros scripts -->
<script src="js/earnings.js?v=20260524a"></script>
```

---

## 🎨 Componente 2 — Timeline Visual (reserva-detalhe.html)

### HTML

```html
<!-- ============== TIMELINE DE MARCOS ============== -->
<section id="timeline-section" class="timeline-section" hidden>
  <h2>📅 Linha do tempo da locação</h2>
  <p class="timeline-subtitle" id="timeline-subtitle">
    60 dias · de 24/mai até 22/jul
  </p>

  <div class="timeline-track">
    <div class="timeline-fill" id="timeline-fill" style="width: 0%"></div>
    <div class="timeline-milestones" id="timeline-milestones">
      <!-- gerado dinamicamente -->
    </div>
  </div>

  <div class="timeline-legend">
    <span class="legend-item"><span class="dot dot-paid"></span>Pago</span>
    <span class="legend-item"><span class="dot dot-available"></span>Disponível</span>
    <span class="legend-item"><span class="dot dot-pending"></span>Futuro</span>
  </div>

  <!-- Card de saque disponível (só aparece se tem available) -->
  <div class="withdrawal-cta" id="withdrawal-cta" hidden>
    <div class="cta-content">
      <h3>💰 Saque disponível agora</h3>
      <p class="cta-amount" id="cta-amount">R$ 1.125,00</p>
      <p class="cta-meta">já descontada comissão Nomade Drive (10%)</p>
      <p class="cta-status">
        <span class="status-icon">✨</span>
        <span id="cta-client-status">Cliente em ótimo padrão · 0 avarias · 0 multas</span>
      </p>
    </div>
    <div class="cta-actions">
      <button class="btn btn-primary" id="btn-sacar">💸 Sacar agora</button>
      <button class="btn btn-ghost" id="btn-acumular">⏸ Acumular pro próximo</button>
    </div>
  </div>
</section>
```

### CSS (`css/timeline.css`)

```css
.timeline-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.timeline-section h2 { margin: 0 0 4px 0; font-size: 20px; }
.timeline-subtitle { color: #6c757d; font-size: 14px; margin-bottom: 24px; }

.timeline-track {
  position: relative;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  margin: 40px 0 32px 0;
}

.timeline-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, #0f5132, #198754);
  border-radius: 2px;
  transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.timeline-milestones {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.milestone {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 3px solid #adb5bd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s;
}

.milestone:hover { transform: scale(1.15); }
.milestone.paid { border-color: #198754; background: #198754; color: white; }
.milestone.available { border-color: #ffc107; background: #fff3cd; animation: pulse 2s infinite; }
.milestone.pending { border-color: #adb5bd; background: white; }

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,193,7,0.5); }
  50% { box-shadow: 0 0 0 8px rgba(255,193,7,0); }
}

.milestone-label {
  position: absolute;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  white-space: nowrap;
  font-size: 12px;
  color: #495057;
}

.milestone-label .ml-date { font-weight: 600; display: block; }
.milestone-label .ml-amount { color: #198754; font-weight: 500; display: block; }
.milestone-label .ml-status { font-size: 10px; opacity: 0.7; }

.timeline-legend {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 48px;
  font-size: 13px;
  color: #6c757d;
}

.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot-paid { background: #198754; }
.dot-available { background: #ffc107; }
.dot-pending { background: #adb5bd; }

.withdrawal-cta {
  margin-top: 32px;
  padding: 20px;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border-left: 4px solid #ffc107;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.cta-content h3 { margin: 0 0 4px 0; font-size: 16px; }
.cta-amount { font-size: 28px; font-weight: 700; margin: 4px 0; color: #0f5132; }
.cta-meta { font-size: 12px; color: #6c757d; margin: 0; }
.cta-status { font-size: 13px; margin: 8px 0 0 0; color: #198754; }

.cta-actions { display: flex; gap: 8px; }
```

### JS (acrescentar em `js/earnings.js` ou criar `js/timeline.js`)

```javascript
async function loadTimeline(bookingId) {
  if (!bookingId || !window.sb) return;

  const { data: booking } = await sb
    .from('bookings')
    .select('id, start_date, end_date, monthly_price, owner_id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) return;

  const { data: withdrawals } = await sb
    .from('withdrawals')
    .select('milestone_number, milestone_date, amount_net, status')
    .eq('booking_id', bookingId)
    .order('milestone_number', { ascending: true });

  if (!withdrawals?.length) return;

  // Mostrar seção
  const section = document.getElementById('timeline-section');
  section.removeAttribute('hidden');

  // Subtitle
  const startStr = new Date(booking.start_date).toLocaleDateString('pt-BR');
  const endStr = new Date(booking.end_date).toLocaleDateString('pt-BR');
  const totalDays = Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000);
  document.getElementById('timeline-subtitle').textContent =
    `${totalDays} dias · de ${startStr} até ${endStr}`;

  // Fill bar baseado em dias decorridos
  const today = new Date();
  const elapsed = Math.max(0, Math.min(totalDays,
    Math.ceil((today - new Date(booking.start_date)) / 86400000)
  ));
  const fillPct = (elapsed / totalDays) * 100;
  document.getElementById('timeline-fill').style.width = `${fillPct}%`;

  // Render marcos
  const container = document.getElementById('timeline-milestones');
  container.innerHTML = withdrawals.map(w => {
    const date = new Date(w.milestone_date);
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const amountStr = formatBRL(w.amount_net);
    const statusLabel = {
      paid: '✅ Pago',
      available: '💰 Disponível',
      pending: '⏳ Futuro',
      withheld: '⚠️ Segurado',
      cancelled: '❌ Cancelado'
    }[w.status];

    return `
      <div class="milestone ${w.status}" title="Marco #${w.milestone_number}">
        ${w.status === 'paid' ? '✓' : w.milestone_number}
        <div class="milestone-label">
          <span class="ml-date">${dateStr}</span>
          <span class="ml-amount">${amountStr}</span>
          <span class="ml-status">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');

  // CTA de saque (se tem available)
  const available = withdrawals.find(w => w.status === 'available');
  if (available) {
    document.getElementById('withdrawal-cta').removeAttribute('hidden');
    document.getElementById('cta-amount').textContent = formatBRL(available.amount_net);

    document.getElementById('btn-sacar').onclick = () => {
      // Sprint 2: chama Edge Function `liberar-saque-parcial`
      alert('Em breve! Sprint 2 conecta com Stripe Manual Payouts.');
    };
    document.getElementById('btn-acumular').onclick = () => {
      alert('OK! Vamos somar com o próximo marco.');
    };
  }
}

// Auto-load quando reserva-detalhe.html abrir
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const bookingId = params.get('id');
  if (bookingId) loadTimeline(bookingId);
});
```

### Injetar no `reserva-detalhe.html`

```html
<!-- No <head> -->
<link rel="stylesheet" href="css/timeline.css?v=20260524a">

<!-- No <body>, após a seção #pagamentos -->
<!-- Cola o HTML "TIMELINE DE MARCOS" mostrado acima -->

<!-- Antes do </body> -->
<script src="js/earnings.js?v=20260524a"></script>
<script src="js/timeline.js?v=20260524a"></script>
```

---

## 🧪 Como testar (depois de deploy)

1. **Rodar SQL** `supabase-fase32-timeline-saques.sql` no Supabase
2. **Verificar trigger**: rodar `update bookings set status = 'em_uso' where id = '53e86074...';` → conferir que apareceram 4 marcos em `withdrawals`
3. **Abrir** `dashboard-proprietario.html` logado como `qa-proprietario@` → contador deve aparecer animando até R$ X
4. **Abrir** `reserva-detalhe.html?id=53e86074...` → timeline visual deve renderizar 4 marcos
5. **Avançar relógio mentalmente**: marcos com `milestone_date <= hoje` ficam ⭐ amarelos pulsando, futuros ficam cinza

---

## ⚠️ Limitações da Sprint 1

- ❌ Botão "Sacar agora" **não move dinheiro de verdade** ainda — apenas placeholder. Sprint 2 conecta Stripe Manual Payouts
- ❌ NF parcial **não é emitida** ainda — Sprint 3 integra NotaZZ
- ❌ E-mails de marco (D-2, D0, D+3) **não disparam** — adicionar na Sprint 2 junto com Edge Functions
- ❌ Push notifications de marco **não existem** — Fase 33 (junto com painel de status)

---

## 📦 Entrega final dessa sprint

Quando tudo deployado, o proprietário ao logar vê:

1. 🔥 **Topo do dashboard:** contador grande animando "R$ 1.872,50 ▴"
2. 🔥 **Página da reserva:** timeline visual com 4 marcos e CTA pulsando quando saque libera
3. 🔥 **Múltiplos veículos:** breakdown por carro com nome do cliente

Cliente também ganha:
4. 🔥 **Página da reserva:** mesma timeline (versão "civil" sem valores em R$ pro proprietário)

---

## 🚀 Próximas sprints (lembrete)

- **Sprint 2:** Stripe Manual Payouts + Edge Functions + Cron diário pra ativar marcos
- **Sprint 3:** Integração NotaZZ pra NF parcial
- **Fase 33:** Painel de status verde + notificações configuráveis
- **Bônus:** renovação automática, marketplace de serviços, chat interno, programa fidelidade
