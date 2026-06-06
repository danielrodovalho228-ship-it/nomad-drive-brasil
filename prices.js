/* ============================================================
 * prices.js — Configuração central de preços NomadeDrive v3
 * ============================================================
 *
 * MODELO: Limite Total do Período
 * 3 planos por carro: Essencial, Estendido (mais escolhido), Sem Limite
 * Km é TOTAL do período inteiro, não mensal — cliente distribui livre.
 *
 * PIVOT 05/06/2026 — LANÇAMENTO ENXUTO 1 CARRO:
 *   - Operação começa com 1 sedan automático (Fiat Cronos 2024)
 *   - HB20 popular removido do site (margem fina + sem diferencial
 *     contra locadoras tradicionais no segmento popular)
 *   - Preço Cronos rebaixado pra ancorar levemente abaixo das
 *     locadoras tradicionais (sedan compacto ref. R$ 3.820 a
 *     3.000 km/mês — consulta interna 05/06/2026)
 *
 * Última atualização: 05/06/2026
 * ============================================================ */

window.NOMADE_PRICES = {
  // Carros disponíveis (Lançamento: 1 carro)
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
      zeroCaucaoBRL: 370,
      pageUrl: 'carros/sedan.html'
    }
  },

  // 3 PLANOS × 4 períodos (Limite Total do Período)
  // Preço ancorado levemente abaixo de locadoras tradicionais (sedan
  // compacto ref. R$ 3.820 a 3.000 km/mês — consulta interna 05/06/2026).
  // Descontos por período: -5% (60d), -10% (90d), -15% (180d) sobre o pro-rata.
  plans: {
    sedan: {
      essencial: { label: 'Essencial', kmDays: { 30: 3000, 60: 6000, 90: 9000, 180: 18000 }, priceDays: { 30: 3690, 60: 7011, 90: 9963, 180: 18819 } },
      estendido: { label: 'Estendido', highlight: true, kmDays: { 30: 4000, 60: 8000, 90: 12000, 180: 24000 }, priceDays: { 30: 3740, 60: 7106, 90: 10098, 180: 19074 } },
      semLimite: { label: 'Sem Limite', kmDays: { 30: 5000, 60: 10000, 90: 15000, 180: 30000 }, priceDays: { 30: 3790, 60: 7201, 90: 10233, 180: 19329 } }
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
