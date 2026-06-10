/* ============================================================
 * prices.js — TABELA CANÔNICA DE PREÇOS NomadeDrive
 * ============================================================
 *
 * ÚNICA FONTE DA VERDADE de preços do site inteiro.
 * Nenhuma página pode hardcodear preço — todas leem daqui.
 *
 * REGRAS (Prioridade Zero — 10/06/2026):
 *   - Plano Sedan BASE 30 dias = R$ 3.790/mês = nível ESSENCIAL
 *   - Níveis: Essencial 3.790 · Estendido 3.990 (+200) ·
 *             Máximo 4.290 (+500, teto 6.000 km/mês, excedente R$ 1/km)
 *     ("Máximo" substituiu "Sem Limite" — não existe km ilimitado real;
 *      o id interno continua 'semLimite' por compat de URLs antigas)
 *   - Promo 90+ dias: desconto FIXO de R$ 200/mês sobre o nível
 *     escolhido. PROIBIDO desconto percentual.
 *     Validação: Essencial 90 dias = 3 × 3.590 = R$ 10.770 total.
 *   - Caução padrão: pré-autorização de R$ 2.000 no cartão
 *     (escala por perfil só nos termos).
 *   - "Zero Caução R$ 370" foi REMOVIDO da venda: era o mesmo produto
 *     que "Isenção de franquia R$ 200" com nome/preço conflitantes.
 *     Produto único: Isenção de franquia — EM BREVE (validação jurídica).
 *
 * Última atualização: 10/06/2026
 * ============================================================ */

window.NOMADE_PRICES = {
  // Carros do Plano Sedan (mesma categoria, mesma tabela)
  cars: {
    sedan: {
      id: 'sedan',
      slug: 'sedan',
      name: 'Fiat Cronos',
      category: 'Sedan Médio Automático',
      subtitle: 'Drive 1.3 Flex CVT · 2024',
      photo: 'images/car-cronos-1.jpg',
      photos: ['images/car-cronos-1.jpg', 'images/car-cronos-2.jpg', 'images/car-cronos-3.jpg'],
      caucaoBRL: 2000,
      kmExceededBRL: 1.00,
      pageUrl: 'carros/sedan.html'
    },
    onix: {
      id: 'onix',
      slug: 'onix',
      name: 'Chevrolet Onix Sedan',
      category: 'Sedan Médio Automático',
      subtitle: 'LTZ Turbo 1.0 Auto · 2024',
      photo: 'images/car-onix-1.jpg',
      photos: ['images/car-onix-1.jpg'],
      caucaoBRL: 2000,
      kmExceededBRL: 1.00,
      pageUrl: 'carros/sedan.html'
    }
  },

  // Desconto fixo por fidelização (>= 90 dias): R$ 200/mês sobre o nível.
  loyaltyDiscountMonthlyBRL: 200,
  loyaltyMinDays: 90,

  // 3 NÍVEIS × 4 períodos.
  // priceDays = nível × meses − (200 × meses quando período >= 90 dias).
  //   essencial 3.790: 30=3.790 | 60=7.580 | 90=3×3.590=10.770 | 180=6×3.590=21.540
  //   estendido 3.990: 30=3.990 | 60=7.980 | 90=3×3.790=11.370 | 180=6×3.790=22.740
  //   máximo    4.290: 30=4.290 | 60=8.580 | 90=3×4.090=12.270 | 180=6×4.090=24.540
  // kmDays = km/mês × meses (Máximo tem TETO de 6.000 km/mês).
  plans: {
    sedan: {
      essencial: { label: 'Essencial', monthlyBRL: 3790, kmDays: { 30: 3000, 60: 6000, 90: 9000, 180: 18000 }, priceDays: { 30: 3790, 60: 7580, 90: 10770, 180: 21540 } },
      estendido: { label: 'Estendido', highlight: true, monthlyBRL: 3990, kmDays: { 30: 4000, 60: 8000, 90: 12000, 180: 24000 }, priceDays: { 30: 3990, 60: 7980, 90: 11370, 180: 22740 } },
      semLimite: { label: 'Máximo', monthlyBRL: 4290, kmCapMonthly: 6000, kmDays: { 30: 6000, 60: 12000, 90: 18000, 180: 36000 }, priceDays: { 30: 4290, 60: 8580, 90: 12270, 180: 24540 } }
    },
    onix: {
      essencial: { label: 'Essencial', monthlyBRL: 3790, kmDays: { 30: 3000, 60: 6000, 90: 9000, 180: 18000 }, priceDays: { 30: 3790, 60: 7580, 90: 10770, 180: 21540 } },
      estendido: { label: 'Estendido', highlight: true, monthlyBRL: 3990, kmDays: { 30: 4000, 60: 8000, 90: 12000, 180: 24000 }, priceDays: { 30: 3990, 60: 7980, 90: 11370, 180: 22740 } },
      semLimite: { label: 'Máximo', monthlyBRL: 4290, kmCapMonthly: 6000, kmDays: { 30: 6000, 60: 12000, 90: 18000, 180: 36000 }, priceDays: { 30: 4290, 60: 8580, 90: 12270, 180: 24540 } }
    }
  },

  // Adicionais opcionais (opt-in, NUNCA pré-marcados).
  // Isenção de franquia: EM BREVE (validação jurídica) — sem botão de compra.
  addons: {
    franquia: { label: 'Isenção de franquia', monthlyBRL: 200, locked: true, soon: true },
    vidros:   { label: 'Proteção vidros e pneus', monthlyBRL: 60 },
    condutor: { label: 'Segundo condutor', monthlyBRL: 70 },
    entrega:  { label: 'Entrega premium', monthlyBRL: 80 },
    pet:      { label: 'Higienização reforçada/pet', monthlyBRL: 50 }
  },

  // Pacote incluído (mostrar em cada card)
  included: {
    items: [
      'Seguro completo',
      'Manutenção programada (busca/devolve)',
      'IPVA + licenciamento',
      'Assistência 24h',
      'Telemetria embarcada'
    ]
  },

  // ===== Helpers =====
  planTotal: function(carId, planId, days) {
    var plan = this.plans[carId] && this.plans[carId][planId];
    if (!plan || !plan.priceDays[days]) return 0;
    return plan.priceDays[days];
  },
  planKm: function(carId, planId, days) {
    var plan = this.plans[carId] && this.plans[carId][planId];
    if (!plan || !plan.kmDays[days]) return 0;
    return plan.kmDays[days];
  },
  planMonthly: function(carId, planId, days) {
    var total = this.planTotal(carId, planId, days);
    if (!total) return 0;
    return Math.round(total / (days / 30));
  },
  // Limite proporcional em caso de devolução antecipada
  // Exemplo: 12.000 km / 90 dias, devolveu em 60 dias → limite = 12.000 × (60/90) = 8.000
  proportionalLimit: function(contractedKm, contractedDays, effectiveDays) {
    return Math.round(contractedKm * (effectiveDays / contractedDays));
  },
  formatBRL: function(value) {
    return 'R$ ' + Math.round(value).toLocaleString('pt-BR');
  },
  formatKm: function(value) {
    return Math.round(value).toLocaleString('pt-BR') + ' km';
  }
};
