# 🛣️ Roadmap — Migração MEI → ME (Microempresa)

> **Estratégia Daniel (24/05/2026):** Abrir MEI no nome do Danilo Tomaz
> Rodovalho como teste do modelo de negócio. Quando der certo, migrar
> pra ME pra aceitar sócios formais (Daniel) e equipe expandida.

## 📊 Estrutura atual (MEI — fase de teste)

```
┌────────────────────────────────────────┐
│  NOMADE DRIVE BRASIL — MEI              │
│  Titular: DANILO TOMAZ RODOVALHO        │
│  CNPJ: (a abrir)                        │
│  Regime: Simples Nacional MEI           │
│  Limite faturamento: R$ 81.000/ano      │
│  DAS mensal: ~R$ 75,90                  │
│                                         │
│  Operação informal:                     │
│  • Daniel — sócio operacional           │
│    (sem vínculo formal MEI)             │
│    Recebe distribuição mensal           │
│                                         │
│  Equipe permitida (MEI):                │
│  • 1 funcionário CLT máximo             │
│  • 0 sócios (MEI é unipessoal)          │
└────────────────────────────────────────┘
```

## 🎯 Sinais que indicam HORA DE MIGRAR

Migre quando ao menos 2 dos critérios baterem:

| Critério | Limite MEI | Quando acontece |
|---|---|---|
| 💰 Faturamento anual | R$ 81.000 | Em ~6-12 meses se MVP vingar |
| 👥 Equipe formal | 1 CLT max | Precisa de + 1 funcionário CLT |
| 🤝 Sócio | 0 (proibido) | Daniel quiser virar sócio formal |
| 🏢 Atividade complexa | restrita CNAE MEI | Quiser atividades secundárias |
| 💼 Pró-labore com INSS | não tem MEI | Quiser começar contribuir INSS |

**Alerta automático no Cockpit:**
- Faturamento >= 60k/ano → começa a alertar
- Faturamento >= 75% (~60.750) → alerta amarelo
- Faturamento >= 100% → bloqueio MEI (precisa migrar urgente)

## 🚀 Como migrar (passo a passo)

### Fase 1 — Decidir o tipo (ME ou EPP)
- **ME (Microempresa):** faturamento R$ 81k a R$ 360k/ano
- **EPP (Empresa Pequeno Porte):** R$ 360k a R$ 4,8M/ano
- Para Nomade Drive, ME serve até crescer pra ~3-5 carros locados
- EPP só quando virar tipo 20+ veículos ativos

### Fase 2 — Decidir formato societário
- **EI (Empresário Individual):** unipessoal — Danilo ou Daniel sozinhos
- **SLU (Sociedade Limitada Unipessoal):** unipessoal mas com responsabilidade limitada (recomendado se for 1 só)
- **LTDA (Sociedade Limitada):** Danilo + Daniel + outros sócios — **provavelmente o caminho**

### Fase 3 — Contratar um contador (~R$ 200-300/mês)
- Vão te ajudar a:
  - Escolher CNAE principal (5621-2/01 — Serviços de alimentação? Não. Tente 7711-0/00 — Locação de automóveis sem condutor)
  - Decidir regime: **Simples Nacional Anexo III** (4-15.5% sobre faturamento) ou **Lucro Presumido** (mais simples mas pode ser caro)
  - Abrir CNPJ novo (pode levar 7-30 dias)
  - Migrar contratos: Stripe, Hostinger, fornecedores
  - Fechar MEI corretamente (não pode ter 2 simultâneos)

### Fase 4 — Mudanças operacionais
- **Stripe Connect:** abrir nova Connected Account com CNPJ ME (Standard, não mais Express obrigatório)
- **Resend / Hostinger / Infosimples / Cobli:** atualizar dados pra CNPJ novo
- **Contas bancárias:** abrir conta PJ no novo CNPJ
- **Cliente já cadastrados:** comunicar que mudou — emite NF do CNPJ novo
- **Contratos com proprietários:** aditivo simples informando mudança societária

### Fase 5 — Estrutura societária sugerida (LTDA com 2 sócios)
```
DANIEL TOMAZ RODOVALHO ━┓
  Quotas: 50%             ┃
  Função: CTO/CEO Tech    ┃
                          ┣━━━━► NOMADE DRIVE BRASIL LTDA
DANILO TOMAZ RODOVALHO ━┛       CNPJ: novo
  Quotas: 50%                    Capital social: a definir
  Função: CEO Operacional        Regime: Simples Nacional Anexo III
```

Pro-labore mínimo: 1 salário mínimo cada (~R$ 1.412 em 2025, deve subir).

## 💰 Comparativo financeiro

### Cenário hipotético: faturamento R$ 5k/mês (R$ 60k/ano)

| Item | MEI atual | ME Simples Nacional Anexo III |
|---|---|---|
| DAS / Imposto | R$ 75,90/mês (fixo) | ~6-8% sobre faturamento = ~R$ 350/mês |
| INSS pró-labore | (DAS já inclui) | ~R$ 155/mês (11% sobre salário mínimo) |
| Contador | R$ 0 | ~R$ 250/mês |
| Custo total | ~R$ 76/mês | ~R$ 755/mês |
| Diferença | — | **+R$ 679/mês** |

> ⚠️ **Migrar custa caro no início.** Só vale quando faturamento justifica
> (acima de R$ 7.000-8.000/mês começa a fazer sentido pelos benefícios).

### Cenário com faturamento R$ 15k/mês (R$ 180k/ano)
- MEI: impossível (>= R$ 81k limite)
- ME: ~R$ 1.700/mês de impostos + R$ 250 contador = **R$ 1.950/mês total**
- Margem bruta: R$ 15k - R$ 1.950 = ~R$ 13k pra operação + lucros

## 📅 Cronograma sugerido

```
HOJE (mai/2026)        MEI ativado
   ↓
3-6 meses              Validar produto-mercado
   ↓
~ago/2026 (estimado)   Faturamento estabilizado R$ 5-8k/mês
   ↓
out-dez/2026          Contratar contador + começar processo ME
   ↓
jan-fev/2027          ME ativada, MEI fechado
   ↓
2027+                  Crescer pra 5-10 veículos, equipe formal
```

## ⚠️ Riscos a evitar

1. **Não ultrapassar R$ 81k MEI sem migrar** → multas pesadas, IR retroativo
2. **Não emitir NF como MEI quando deveria como ME** → fraude fiscal
3. **Não pagar Daniel como CLT informal** → reclamação trabalhista futura
4. **Distribuição de lucros > R$ 28.560/ano pessoa física** → IRPF de 15-27.5%
5. **Misturar conta PF e PJ** → Receita pode reclassificar

## 🎯 Quando o Cockpit avisar você

O painel `admin.html#cockpit` mostra automaticamente:
- 🟢 Verde (< 50% limite) — tudo bem
- 🟡 Amarelo (50-75%) — começar a pensar
- 🔴 Vermelho (> 75%) — alerta + sugestão migração

E a aba `#fiscal` mostra:
- Card "⚠️ Próximo do limite MEI" quando >= 75%
- Margem em R$ até virar ME
- Lembrete dos próximos passos

## 📞 Quando estiver pronto pra migrar, me chama

Eu posso:
- Detalhar o processo de migração no Stripe (Connect Account novo)
- Atualizar `business_settings.tax_regime` pra `simples_nacional`
- Criar tabelas adicionais (cnpj, sócios cotistas, etc.)
- Atualizar templates de NF com novos dados
- Migrar contratos automaticamente onde possível

**Quer que eu já deixe um Edge Function `migrate-mei-to-me` pronto pra um clique?** Posso fazer agora ou esperar o momento certo.
