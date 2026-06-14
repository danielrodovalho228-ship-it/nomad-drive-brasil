/* ============================================================
 * prices.js — TABELA CANÔNICA DE PREÇOS NomadeDrive
 * ============================================================
 *
 * ÚNICA FONTE DA VERDADE de preços do site inteiro.
 * Nenhuma página pode hardcodear preço — todas leem daqui.
 *
 * VEÍCULO DE LANÇAMENTO (10/06/2026): Volkswagen Polo automático
 *   (hatch automático, novo, garantia de fábrica). Substituiu o
 *   sedan (Fiat Cronos / Chevrolet Onix). O id interno do carro é
 *   'polo'. Aliases antigos (sedan/onix/cronos) redirecionam pra ele
 *   em reservar.html pra não quebrar links salvos.
 *
 * REGRAS (Política de KM v2 + preço de lançamento Polo):
 *   - Plano BASE 30 dias = R$ 3.790/mês = nível ESSENCIAL
 *   - Níveis (30 dias):
 *       ESSENCIAL  R$ 3.790 — 3.000 km/mês
 *       ESTENDIDO  R$ 3.990 — 4.500 km/mês (selo "Mais escolhido")
 *       KM LIVRE   R$ 4.290 — 6.000 km/mês (teto; nada de "ilimitado")
 *   - Excedente em TODOS os níveis: R$ 1,00/km, sem multa adicional.
 *     Rodagem registrada por odômetro fotografado nas vistorias.
 *   - Em 60/90/180 dias o limite é TOTAL do período (km/mês × meses).
 *   - Promo 90+ dias: desconto FIXO de R$ 500/mês sobre o nível
 *     escolhido (Essencial 90+ = R$ 3.290/mês). Sem percentual.
 *     Validação: Essencial 90 dias = 3 × 3.290 = R$ 9.870 total.
 *   - Caução padrão: pré-autorização de R$ 2.000 no cartão.
 *   - Isenção de franquia (R$ 200/mês) — EM BREVE (validação jurídica),
 *     sem botão de compra.
 *
 * Última atualização: 10/06/2026 (lançamento VW Polo)
 * ============================================================ */

window.NOMADE_PRICES = {
  // Carro de lançamento: Volkswagen Polo automático (hatch).
  // Fotos ainda não inseridas — usar placeholders no site (sem imagem real).
  cars: {
    polo: {
      id: 'polo',
      slug: 'polo',
      name: 'Volkswagen Polo',
      category: 'Hatch Automático',
      subtitle: 'Polo automático · novo, garantia de fábrica',
      photo: '',          // vazio → site mostra placeholder marcado
      photos: [],         // fotos reais entram aqui depois
      photoPlaceholders: [
        '[FOTO POLO — frente 3/4 externa]',
        '[FOTO POLO — interior / painel]',
        '[FOTO POLO — porta-malas]',
        '[FOTO POLO — lateral]'
      ],
      caucaoBRL: 2000,
      kmExceededBRL: 1.00,
      pageUrl: 'carros/sedan.html'
    }
  },

  // Desconto fixo por fidelização (>= 90 dias): R$ 500/mês sobre o nível.
  loyaltyDiscountMonthlyBRL: 500,
  loyaltyMinDays: 90,

  // 3 NÍVEIS × 4 períodos.
  // priceDays = nível × meses − (500 × meses quando período >= 90 dias).
  //   essencial 3.790: 30=3.790 | 60=7.580 | 90=3×3.290=9.870  | 180=6×3.290=19.740
  //   estendido 3.990: 30=3.990 | 60=7.980 | 90=3×3.490=10.470 | 180=6×3.490=20.940
  //   km livre  4.290: 30=4.290 | 60=8.580 | 90=3×3.790=11.370 | 180=6×3.790=22.740
  // kmDays = km/mês × meses (Essencial 3.000 · Estendido 4.500 · Km Livre teto 6.000).
  // Excedente em todos os níveis: R$ 1,00/km, sem multa adicional.
  plans: {
    polo: {
      essencial: { label: 'Essencial', monthlyBRL: 3790, kmMonthly: 3000, kmDays: { 30: 3000, 60: 6000, 90: 9000, 180: 18000 }, priceDays: { 30: 3790, 60: 7580, 90: 9870, 180: 19740 } },
      estendido: { label: 'Estendido', highlight: true, monthlyBRL: 3990, kmMonthly: 4500, kmDays: { 30: 4500, 60: 9000, 90: 13500, 180: 27000 }, priceDays: { 30: 3990, 60: 7980, 90: 10470, 180: 20940 } },
      semLimite: { label: 'Km Livre', monthlyBRL: 4290, kmMonthly: 6000, kmCapMonthly: 6000, kmDays: { 30: 6000, 60: 12000, 90: 18000, 180: 36000 }, priceDays: { 30: 4290, 60: 8580, 90: 11370, 180: 22740 } }
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
