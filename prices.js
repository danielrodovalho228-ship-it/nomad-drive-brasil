/* ============================================================
 * prices.js — Configuração central de preços NomadeDrive v3
 * ============================================================
 *
 * MODELO NOVO (Prompt v3): Limite Total do Período
 * 3 planos por carro: Essencial, Estendido (mais escolhido), Sem Limite
 * Km é TOTAL do período inteiro, não mensal — cliente distribui livre.
 *
 * Última atualização: 03/06/2026
 * ============================================================ */

window.NOMADE_PRICES = {
  // Carros disponíveis (Fase 1: 2 carros)
  cars: {
    popular: {
      id: 'popular',
      slug: 'popular',
      name: 'Hyundai HB20',
      category: 'Popular Econômico',
      subtitle: 'Sense 1.0 Flex · 2023',
      photo: 'images/car-hb20-1.jpg',
      photos: ['images/car-hb20-1.jpg', 'images/car-hb20-2.jpg', 'images/car-hb20-3.jpg'],
      caucaoBRL: 1500,           // pré-autorização cartão
      kmExceededBRL: 0.80,       // R$/km acima do Limite Total
      zeroCaucaoBRL: 290,        // upsell mensal
      pageUrl: 'carros/popular.html'
    },
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
      zeroCaucaoBRL: 370,
      pageUrl: 'carros/sedan.html'
    }
  },

  // 3 PLANOS por carro × 4 períodos (Limite Total do Período)
  plans: {
    popular: {
      essencial: { label: 'Essencial', kmDays: { 30: 3000, 60: 6000, 90: 9000, 180: 18000 }, priceDays: { 30: 3500, 60: 6650, 90: 9450, 180: 17850 } },
      estendido: { label: 'Estendido', highlight: true, kmDays: { 30: 4000, 60: 8000, 90: 12000, 180: 24000 }, priceDays: { 30: 3700, 60: 7030, 90: 9990, 180: 18870 } },
      semLimite: { label: 'Sem Limite', kmDays: { 30: 5000, 60: 10000, 90: 15000, 180: 30000 }, priceDays: { 30: 3900, 60: 7410, 90: 10530, 180: 19890 } }
    },
    sedan: {
      essencial: { label: 'Essencial', kmDays: { 30: 3000, 60: 6000, 90: 9000, 180: 18000 }, priceDays: { 30: 4500, 60: 8550, 90: 12150, 180: 22950 } },
      estendido: { label: 'Estendido', highlight: true, kmDays: { 30: 4000, 60: 8000, 90: 12000, 180: 24000 }, priceDays: { 30: 4700, 60: 8930, 90: 12690, 180: 23970 } },
      semLimite: { label: 'Sem Limite', kmDays: { 30: 5000, 60: 10000, 90: 15000, 180: 30000 }, priceDays: { 30: 4900, 60: 9310, 90: 13230, 180: 24990 } }
    }
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
