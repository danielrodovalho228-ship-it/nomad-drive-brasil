/* ============================================================
 * prices.js — Configuração central de preços NomadeDrive
 * ============================================================
 *
 * Atualize ESTE arquivo quando precisar mudar preços. Todas as
 * páginas (index, carros/popular, carros/sedan, reservar) lêem
 * daqui via window.NOMADE_PRICES.
 *
 * Última atualização: 2026-06-02
 * Próxima revisão: após simulação real Localiza Uberlândia
 * (valores podem variar ±R$ 300 pra manter 5-12% abaixo Localiza).
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
      photos: [
        'images/car-hb20-1.jpg',
        'images/car-hb20-2.jpg',
        'images/car-hb20-3.jpg'
      ],
      basePrice: 3500,           // R$/mês (preço cheio, 30 dias)
      caucaoBRL: 1500,           // pré-autorização cartão
      kmExceededBRL: 0.80,       // R$/km acima de 3.000 km/mês
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
      photos: [
        'images/car-cronos-1.jpg',
        'images/car-cronos-2.jpg',
        'images/car-cronos-3.jpg'
      ],
      basePrice: 4500,
      caucaoBRL: 2000,
      kmExceededBRL: 1.00,
      zeroCaucaoBRL: 370,
      pageUrl: 'carros/sedan.html'
    }
  },

  // Pacote incluído (mostrar em cada card)
  included: {
    kmPerMonth: 3000,            // km/mês inclusos
    items: [
      'Seguro completo',
      'Manutenção',
      'IPVA + licenciamento',
      'Assistência 24h',
      'Telemetria'
    ]
  },

  // Desconto progressivo por período
  discounts: {
    30: 0,    // preço cheio
    60: 5,    // -5%
    90: 10,   // -10%
    180: 15   // -15%
  },

  // Comparativo Localiza (atualizado conforme simulação real)
  localizaComparison: {
    base: { localiza: 'R$ 3.500-4.500/mês', nomade: 'R$ 3.500/mês' },
    protection: { localiza: 'R$ 35-90/dia extra', nomade: 'Incluído' },
    km: { localiza: '2.000-3.000 km', nomade: '3.000 km' },
    delivery: { localiza: 'Apenas loja', nomade: 'Onde você estiver' },
    flexible: { localiza: 'Multa por antecipação', nomade: 'Sem multa' },
    final: { localiza: 'R$ 4.500-6.500', nomade: 'R$ 3.500' }
  },

  // Funções helper
  monthlyRate: function(carId, days) {
    var car = this.cars[carId];
    if (!car) return 0;
    var pct = 0;
    if (days >= 180) pct = 15;
    else if (days >= 90) pct = 10;
    else if (days >= 60) pct = 5;
    return Math.round(car.basePrice * (1 - pct / 100));
  },

  totalCost: function(carId, days, includesZeroCaucao) {
    var months = days / 30;
    var rate = this.monthlyRate(carId, days);
    var total = Math.round(rate * months);
    if (includesZeroCaucao) {
      total += Math.round(this.cars[carId].zeroCaucaoBRL * months);
    }
    return total;
  },

  formatBRL: function(value) {
    return 'R$ ' + Math.round(value).toLocaleString('pt-BR');
  }
};
