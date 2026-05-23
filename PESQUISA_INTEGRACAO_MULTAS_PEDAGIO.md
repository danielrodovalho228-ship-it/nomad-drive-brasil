# Pesquisa de Integração — Multas + Pedágio (C6 + C7)

**Data:** 2026-05-23
**Para:** Nomade Drive Brasil — Uberlândia/MG
**Objetivo:** levantar APIs disponíveis em 2026 para consulta automatizada de (1) multas de trânsito e (2) pedágios pagos durante locações.

---

## 📋 Resumo executivo

Para uma locadora pequena/média em Uberlândia operando ~10-50 veículos:

| Categoria | Recomendação | Custo estimado/mês | Por quê |
|---|---|---|---|
| **C6 — Multas** | **Infosimples (API SENATRAN/Infrações)** + sandbox da Celcoin como backup | R$ 100/mês mínimo + R$ 0,06–0,20/consulta | API pública, R$ 100 de crédito de teste, contrato direto, sem certificado digital, abrange Brasil todo via SENATRAN |
| **C7 — Pedágio** | **Veloe Go (Edenred)** ou **ConectCar Frotas** | R$ 5–10/tag/mês + uso real | APIs disponíveis pra parceiros via portal de developer. Tag física no veículo, consumo em tempo real, relatórios por placa |

**Estratégia recomendada para arrancada:**
1. **Multas:** abrir conta Infosimples hoje (gratuita, R$ 100 crédito), integrar consulta na rota `/admin#frota`. Volume baixo = sem custo nos primeiros meses.
2. **Pedágio:** contatar comercial Veloe Go ou ConectCar pra entender condições de parceiro pequena. Como exige tag física, é decisão de operação (toda frota Nomade Drive vai equipar tag?), não só técnica.

---

## C6 — APIs de Multas de Trânsito

### Comparativo

| Provedor | Tipo | Cobertura | Preço base | Doc pública | Recomendação |
|---|---|---|---|---|---|
| **Infosimples** | Wrapper SENATRAN | Nacional (via SENATRAN) | R$ 0,06–0,20/consulta + R$ 100/mês mínimo | ✅ Sim | ⭐⭐⭐⭐⭐ Melhor pra começar |
| **Celcoin (API Auto/Débito Veicular)** | Fintech B2B | 19 estados (~95% frota nacional) | Não público — contato comercial | ✅ Sim | ⭐⭐⭐⭐ Forte se já usar Celcoin |
| **SERPRO Senatran (Consulta Online)** | Oficial | Nacional | R$ 0,30–1,50/consulta | ⚠️ Parcial | ⭐⭐⭐ Burocrático |
| **WSDenatran (gov.br/conecta)** | Oficial (SOAP) | Nacional | Gratuito mas requer convênio | ⚠️ Parcial | ⭐⭐ Só para órgãos públicos |
| **Detran-MG/SP/PR direto** | Estadual | Estado único | Varia (alguns gratuitos) | ⚠️ Cada estado tem seu | ⭐⭐ Não escala |
| **Consultar Placa** | Wrapper de baixo custo | Variável | R$ 1–5/consulta com 12x | ⚠️ Limitada | ⭐⭐⭐ Alternativa básica |
| **Cobli/Linkx (fleet)** | Plataforma completa | Nacional via parceiros | Mensalidade pesada | ⚠️ Comercial | ⭐⭐ Overkill p/ Nomade Drive |

### Detalhamento das opções

#### 1. Infosimples — `senatran-infracoes` ⭐ RECOMENDADO
- **URL:** [infosimples.com/consultas/senatran-infracoes](https://infosimples.com/consultas/senatran-infracoes/)
- **Preço:** R$ 0,06/consulta + R$ 100/mês mínimo de débito (em 2026, segundo página pricing)
- **Trial:** R$ 100 de crédito ao criar conta, sem cartão
- **Auth:** API Key simples no header
- **Retorno:** JSON com infrações dos últimos 12 meses (até 3 anos retroativo), data, AIT, valor, pontuação
- **Cobertura:** nacional, via integração ao SISCSV/Senatran
- **Latência:** síncrono (resposta em segundos)
- **Casos de uso:** já usado por locadoras médias, despachantes digitais, seguradoras
- **Prós:** API moderna REST/JSON, doc clara em PT-BR, suporte humano, sem certificado digital
- **Contras:** R$ 100/mês mínimo (mesmo se usar pouco), limites por volume
- **Ação:** criar conta em `infosimples.com`, gerar API key, testar com placa real numa rota Edge Function

#### 2. Celcoin API Auto/Débito Veicular ⭐ ALTERNATIVA FORTE
- **URL:** [developers.celcoin.com.br/docs/sobre-a-api-de-auto](https://developers.celcoin.com.br/docs/sobre-a-api-de-auto)
- **Modelo:** assíncrono via webhook (envia consulta, recebe `transactionId`, resposta via webhook depois)
- **Auth:** OAuth 2.0
- **Cobertura:** 19 estados (cobre Minas Gerais? não confirmado — `Minas Gerais` não aparece na lista pública. Verificar com comercial)
- **Tipos cobertos:** multas + IPVA + licenciamento + DPVAT
- **Preço:** sob consulta comercial
- **Diferencial:** mesma API permite **pagamento** dos débitos depois (gera boleto/PIX). Mas isso não é nosso caso de uso (queremos só consultar pra repassar custo ao locatário).
- **Prós:** plataforma robusta, sandbox completo, doc aberta
- **Contras:** assíncrono (mais complexo), preço opaco, **MG não confirmado** (crítico pra Uberlândia)
- **Ação:** se Infosimples não atender, abrir conta sandbox em developers.celcoin.com.br

#### 3. SERPRO — Consulta Online Senatran
- **URL:** [loja.serpro.gov.br/consulta-online-senatran](https://loja.serpro.gov.br/consulta-online-senatran/product/consultasenatran)
- **Modelo:** oficial via WSDenatran (SOAP) ou portal web
- **Preço:** mais alto que Infosimples (que é wrapper)
- **Burocracia:** requer cadastro como pessoa jurídica + assinatura de termo
- **Prós:** fonte oficial, sem intermediário
- **Contras:** SOAP (legado), burocrático, mais caro
- **Quando faz sentido:** quando o volume é muito alto e o markup do Infosimples pesa

#### 4. Outras (rápido)
- **Sinatran / Doutor Multas:** mais voltado a despachantes/produto final, não API
- **Consultar Placa / Zul Digital:** APIs de placa retornando histórico amplo, custo baixo mas cobertura/qualidade variável
- **GitHub BrasilAPI:** issue aberta pedindo API de veículos por placa (não implementado em 2026)

### Casos de uso da concorrência
- **Movida, Localiza, Unidas (grandes locadoras):** integram diretamente com SERPRO/Senatran (volume justifica) + APIs de pagamento de débitos
- **Locadoras pequenas:** maioria usa Infosimples, Consultar Placa, ou consulta manual pelo despachante

### Recomendação para C6 — Plano de ação
1. **Hoje:** criar conta Infosimples, gerar API key, validar com uma placa real
2. **Próx. sprint:** criar Edge Function `consulta-multas` que:
   - Recebe `vehicle_id` + período (ex: data inicial/final da locação)
   - Chama Infosimples passando placa + Renavam
   - Salva infrações encontradas em tabela nova `vehicle_fines` ligada a `booking_id`
   - Notifica admin via e-mail
3. **Rota admin nova:** `/admin#multas` pra ver pendentes + marcar como cobradas
4. **Custo mensal projetado:** R$ 100 fixo + 1-5 consultas por check-out = praticamente só o mínimo

---

## C7 — APIs de Pedágio / Sem Parar

### Comparativo

| Provedor | Modelo | API/REST | Cobertura | Preço típico | Recomendação |
|---|---|---|---|---|---|
| **Veloe Go (Edenred)** | Tag + Fleet | ✅ Portal Developer público | Nacional + estacionamentos | R$ ~10/tag/mês + uso | ⭐⭐⭐⭐⭐ Recomendado |
| **ConectCar Frotas** | Tag + Hub API | ✅ Hub de APIs | Nacional | Sem mensalidade da tag | ⭐⭐⭐⭐⭐ Empate técnico |
| **Sem Parar Empresas** | Tag + Vale-Pedágio | ⚠️ API mas só após contrato | Nacional | Sob contrato | ⭐⭐⭐⭐ Bom mas comercial fechada |
| **Move Mais (Cielo)** | Tag | ⚠️ Limitada | Nacional | Sob contrato | ⭐⭐⭐ Menor adoção |
| **ContaPag** | Tag | ⚠️ Limitada | Regional | Sob contrato | ⭐⭐ Foco em SP |
| **Greenpass** | Tag | ⚠️ Limitada | Nacional | Sob contrato | ⭐⭐ Menor |
| **AILOG/Maplink** | Calculador de pedágio (não consulta uso real) | ✅ REST | Nacional | R$ 0,10–0,50/cálculo | ⭐⭐⭐ Estimativa, não realidade |

### Diferença chave: cálculo vs uso real

- **Calculadora de pedágio** (AILOG, TollGuru, Maplink): você passa rota, recebe estimativa do custo total. **Não diz quanto realmente foi pago.**
- **Tag física + API de extrato** (Veloe, ConectCar, Sem Parar): tag é fixada no veículo, cada passagem em pedágio gera transação registrada na conta da locadora. API permite extrair as transações por placa/tag/período.

**Para Nomade Drive, o caso de uso real exige tag física** — sem ela, não tem como saber se cliente passou em pedágio com cartão próprio, dinheiro, ou nem passou.

### Detalhamento das opções

#### 1. Veloe Go (Edenred) ⭐ RECOMENDADO
- **URL marketing:** [veloe.com.br/veloego/gestao-de-frota](https://veloe.com.br/veloego/gestao-de-frota)
- **URL API:** [portaldeveloper.veloe.com.br](https://portaldeveloper.veloe.com.br/)
- **Modelo:** tag fixada no veículo. Cada passagem gera transação automática. Plataforma online + API REST.
- **Cobertura:** todos pedágios nacionais + 30.000 postos de combustível + estacionamentos
- **Funcionalidades além de pedágio:** combustível, telemetria, manutenção, abastecimento controlado
- **Preço:** ~R$ 10/tag/mês + uso (tarifa do pedágio passa direto pra fatura)
- **White-label:** disponível (parceiros@veloe.com.br) — Nomade Drive poderia personalizar a tag com a marca
- **API:** disponível para parceiros via portal de developer
- **Diferencial:** R$ 5,4 bi de faturamento em 2023 — empresa grande, infra robusta
- **Casos de uso:** Movida, Localiza usam intensivamente

#### 2. ConectCar Frotas ⭐ EMPATE TÉCNICO
- **URL:** [lp.conectcar.com/frotas](https://lp.conectcar.com/frotas)
- **URL white-label:** [conectcar.com/white-label](https://www.conectcar.com/white-label/)
- **Modelo:** tag + Hub de APIs aberto pra ferramentas de gestão
- **Cobertura:** nacional
- **Preço:** sem mensalidade da tag (cobra só por uso) — diferencial vs Veloe
- **API:** hub disponível, doc parcial pública, integração via parceiro
- **Funcionalidades:** pedágio + estacionamento (sem combustível)
- **White-label:** disponível
- **Limitação:** menos completo que Veloe Go pra gestão de frota (só pedágio + estacionamento)

#### 3. Sem Parar Empresas
- **URL:** [sempararempresas.com.br/valepedagio](https://www.sempararempresas.com.br/valepedagio)
- **Modelo:** vale-pedágio para frota + tag
- **Foco:** transporte de cargas (não locação) — mas pode adaptar
- **API:** existe mas só após contrato comercial
- **Doc pública:** não — entrar em contato pra detalhes
- **Quando faz sentido:** se a operação envolver muitos veículos pesados (não é o caso da Nomade Drive)

#### 4. Calculadora apenas (AILOG/TollGuru/Maplink)
- **URL:** [ailog.com.br/solucoes/api-de-pedagio](https://ailog.com.br/solucoes/api-de-pedagio/)
- **Modelo:** estimativa de custo de pedágio dada uma rota
- **Caso de uso na Nomade Drive:** **mostrar no orçamento** quanto o cliente vai gastar em pedágio se fizer X viagem. Não substitui controle real (tag).
- **Preço:** baixo (R$ 0,10–0,50 por cálculo)

### Decisão estratégica antes de codar
Antes de qualquer integração, definir:

1. **Toda frota Nomade Drive vai ter tag instalada?**
   - **Sim** → vai pra Veloe Go ou ConectCar, integração API faz total sentido
   - **Não** → não vale a pena integrar, controle de pedágio fica manual (cliente assina termo, paga avulso)

2. **Modelo financeiro**
   - **Locadora absorve o pedágio e cobra do cliente** → precisa controle preciso (API)
   - **Cliente paga diretamente no pedágio** (cartão, dinheiro, tag própria) → não precisa integrar

3. **Volume mínimo de frota**
   - <10 carros: provavelmente sem ROI, controle manual via planilha
   - 10-30 carros: ROI marginal, vale a pena se tiver muitas viagens longas
   - 30+ carros: ROI claro, integração obrigatória

### Recomendação para C7 — Plano de ação
1. **Decidir antes:** modelo operacional (tag em toda frota? quem paga?)
2. **Se for tag em toda frota:**
   - **Veloe Go:** ligar pra parcerias@veloe.com.br → simular custo com volume estimado
   - **ConectCar:** abrir contato em lp.conectcar.com/frotas → comparar
3. **Integração técnica (após contrato):**
   - Criar Edge Function `consulta-pedagios` que recebe `vehicle_id` + período
   - Chamar API da Veloe/ConectCar buscando transações por tag/placa
   - Salvar em tabela nova `vehicle_tolls` ligada a booking
   - Mostrar no painel admin + no recibo
4. **Se não for tag:** acrescentar cláusula no contrato "cliente é responsável pelos pedágios; tag é opcional via Sem Parar/Veloe pessoal"

---

## 🎯 Recomendação consolidada

### Prioridade 1 — Multas (C6)
**AÇÃO:** abrir conta Infosimples hoje, integrar Edge Function em ~1 dia.
**INVESTIMENTO:** R$ 100/mês fixo. Ponto de entrada barato e reversível.

### Prioridade 2 — Pedágio (C7)
**DEPENDE DE DECISÃO DE NEGÓCIO:**
- Vai equipar toda frota com tag? → Veloe Go ou ConectCar, ligar pro comercial.
- Não vai? → não integrar, deixar cláusula contratual e modelo manual.

### Prazo realista de integração
- **Multas (Infosimples):** ~1 dia (criar Edge Function + UI no admin)
- **Pedágio (Veloe/ConectCar):** ~3-5 dias APÓS contrato comercial + documentação completa da API

---

## 🚨 Riscos e alternativas

### Risco 1 — Infosimples não cobre Minas Gerais bem
**Mitigação:** Validar com placa real do veículo teste. Se falhar, alternativa = Celcoin (mas confirma MG na cobertura primeiro).

### Risco 2 — Preço Infosimples sobe acima do esperado
**Mitigação:** Cache de 24h na consulta (multa não vira em 1 hora). Bate só uma vez por veículo por dia max.

### Risco 3 — Tag de pedágio gera fricção pra cliente
**Mitigação:** Tag transparente — cliente nem percebe. Ou tornar opcional + bonificar quem aceita.

### Risco 4 — Cliente passa em pedágio com tag de OUTRA conta (própria)
**Mitigação:** Termo contratual explícito: "passagens em pedágio são debitadas pela tag instalada no veículo. Cliente que use tag própria estará pagando duas vezes."

### Alternativa low-cost
**Não integrar nada por enquanto** e usar:
- Multa: consulta manual no site do Detran-MG quando suspeitar (uberlândia.detran.mg.gov.br ou app meu Detran)
- Pedágio: cláusula contratual + boletim de viagem manual

Vale enquanto frota for <10 veículos. Acima, automatizar paga rápido.

---

## 📚 Fontes consultadas
- [Infosimples — API Senatran Infrações](https://infosimples.com/consultas/senatran-infracoes/)
- [Infosimples — Preços](https://infosimples.com/consultas/precos/)
- [Celcoin Developers — API Auto](https://developers.celcoin.com.br/docs/sobre-a-api-de-auto)
- [SERPRO — Consulta Online Senatran](https://loja.serpro.gov.br/consulta-online-senatran/product/consultasenatran)
- [WSDenatran — Catálogo gov.br](https://www.gov.br/conecta/catalogo/apis/wsdenatran)
- [Veloe — Portal Developer](https://portaldeveloper.veloe.com.br/)
- [Veloe Go — Gestão de Frota](https://veloe.com.br/veloego/gestao-de-frota)
- [ConectCar Frotas](https://lp.conectcar.com/frotas)
- [ConectCar White Label](https://www.conectcar.com/white-label/)
- [Sem Parar Empresas — Vale-Pedágio](https://www.sempararempresas.com.br/valepedagio)
- [AILOG — API de Pedágio](https://ailog.com.br/solucoes/api-de-pedagio/)
- [Exame — Veloe fatura R$ 5,4 bi](https://exame.com/negocios/a-veloe-ja-fatura-mais-de-r-5-bilhoes-por-ano-e-a-boa-parte-nao-e-com-pedagio-nem-estacionamento/)

---

## 🛡️ Decisões pendentes (suas)

1. ☐ **Abre conta Infosimples hoje?** (R$ 100 crédito grátis, sem cartão)
2. ☐ **Toda frota Nomade Drive vai ter tag de pedágio?** (Sim → Veloe/ConectCar; Não → modelo manual)
3. ☐ **Cobertura MG é prioridade?** (Se sim, validar antes de fechar com Celcoin)
4. ☐ **Volume estimado de check-outs/mês?** (define modelo de cobrança da API de multas)

Quando você decidir esses 4 pontos, posso começar a integração técnica em ~1-2 dias. Sem decisão, não vale a pena escrever código que depende de API que pode não ser usada.

---

Última atualização: 2026-05-23 (commit após `2b4ee85`)
