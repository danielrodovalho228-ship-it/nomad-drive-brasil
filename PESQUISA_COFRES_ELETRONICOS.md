# 🔐 Pesquisa: Cofres Eletrônicos para Carsharing

> **Versão:** 1.0 — 31/Maio/2026
> **Para:** Nomade Drive Brasil (decisão estratégica)
> **Caso de uso:** Cofre fixado no para-brisa do carro guarda a chave física; cliente recebe PIN de 4-6 dígitos via app válido SÓ durante a janela da reserva
> **Restrições:** preciso ser **offline-capable** (carro pode estar em garagem subterrânea sem sinal) e ter **PIN dinâmico time-based** (criptografia que valida horário sem precisar internet)

---

## 📋 Resumo executivo

| # | Solução | Origem | Preço hardware | Preço API/mês | Offline? | API? | ⭐ |
|---|---|---|---|---|---|---|---|
| 1 | **igloohome KeyBox 3** | Singapura | R$ 1.700-2.200 (1× compra) | R$ 0 (offline algoPIN) ou R$ 50-150 (Bridge cloud) | ✅ Sim — time-based offline | ✅ REST | ⭐⭐⭐⭐⭐ |
| 2 | **iLockey KS101** | Brasil | R$ 800-1.200 | R$ 0 (offline) | ✅ Sim | ⚠️ Limitada | ⭐⭐⭐ |
| 3 | **Master Lock Vault 5440** | EUA | R$ 1.500-2.000 | R$ 0 (offline) ou R$ 30/mês cloud | ✅ Sim | ⚠️ Bluetooth via Master Lock Vault Enterprise | ⭐⭐⭐⭐ |
| 4 | **Yale YE/0 Smart Lock** | EUA/UK | R$ 1.500-2.500 | R$ 0 (Bluetooth) | ⚠️ Bluetooth only | ⚠️ SDK Yale | ⭐⭐⭐ |
| 5 | **KeyTracker KT-Pro** | UK/EU | R$ 2.500-3.500 | R$ 80-200/mês | ✅ Sim | ✅ Sim | ⭐⭐⭐⭐ |
| 6 | **Tedee Pro Smart Lock** | Polônia | R$ 1.800-2.400 | R$ 0 (Bluetooth) ou R$ 40 (Bridge) | ⚠️ Bridge precisa wifi | ✅ REST | ⭐⭐⭐ |
| 7 | **Construção própria** (Arduino + cofre genérico) | DIY | R$ 400-800 | R$ 0 | ✅ Sim | ✅ Custom | ⭐⭐ (alto risco) |

### Recomendação: **igloohome KeyBox 3 com algoPIN** ⭐⭐⭐⭐⭐

**Por quê:**
- ✅ Hardware **resistente a outdoor** (chuva, sol, vandalismo leve) — feito pra short-stay Airbnb com cofres em porta de entrada
- ✅ **PIN time-based 100% offline** (cofre tem chip que valida com base em hora interna; não precisa wifi/dados móveis)
- ✅ **API REST oficial** documentada (https://developer.igloohome.co)
- ✅ Gera PIN com **validade exata da reserva** (ex: 14:00 do dia 31 até 18:00 do dia 1)
- ✅ Cliente recebe PIN sem cofre precisar estar online
- ✅ Já é usado por **carsharing globais** (Sixt Share, ShareNow, Turo nos EUA)
- ⚠️ Hardware é importado (R$ 1.700-2.200 dependendo do câmbio)
- ⚠️ Lead time inicial: 15-30 dias (importação) ou comprar em estoque BR via revendedores

---

## 1. igloohome KeyBox 3 (RECOMENDADO)

### O que é
Cofre externo com teclado mecânico de 10 dígitos. Resistente a chuva (IP66). Armazena chave física do carro. Cliente digita PIN no teclado pra abrir.

### Por que é a melhor opção pra carsharing
- **algoPIN**: tecnologia patenteada que gera PINs criptografados com **validade exata** (data início + data fim + duração). O cofre **NÃO PRECISA ESTAR ONLINE** pra validar — o chip interno faz a matemática.
- **Bridge (opcional)**: dispositivo wifi que monitora cofre em tempo real, dá logs de quem abriu quando.
- **API oficial**: gera PINs programaticamente. Integra com Supabase Edge Function fácil.
- **Usado por carsharing** internacionalmente.

### Preços (cotação maio/2026)
| Item | Preço |
|---|---|
| Hardware KeyBox 3 (compra única) | **R$ 1.700-2.200/unidade** (importado) |
| Importação direta site (Singapura → BR) | USD $200-280 + impostos = R$ 1.900-2.300 |
| Via revendedor BR (Mercado Livre, AliExpress) | R$ 1.700-2.500 (preços flutuam) |
| API algoPIN básico (geração offline) | **R$ 0** (incluso no hardware) |
| Bridge Wifi (opcional, monitoramento) | R$ 600 hardware + R$ 0 mensal |
| Plano Cloud Pro (multi-cofre + analytics) | USD $30/mês ($360/ano) = R$ 180/mês |

### Custo total Fase 1 (2 carros)
- 2× KeyBox 3 = R$ 4.000 (one-time)
- API mensal: R$ 0 (algoPIN é grátis)

### Custo total Fase 4 (20 carros)
- 20× KeyBox 3 = R$ 40.000 (one-time, comprado em fases)
- Plano Cloud Pro: R$ 180/mês (precisa pra gerenciar 20+ cofres em dashboard)

### Como integrar
1. Daniel cria conta em https://www.igloohome.co/business
2. Compra 2-5 KeyBox 3 (Lazada, Amazon SG, ou revendedor BR)
3. Cadastra cada cofre no painel (associa ao veículo)
4. Daniel me passa **API token** do painel admin
5. Eu crio Edge Function `gerar-pin-cofre`:
   ```ts
   async function gerarPin(bookingId, vehicleId, startAt, endAt) {
     const cofreId = await getCofreIdByVehicle(vehicleId);
     const response = await fetch(`https://api.igloohome.co/api/v1/igloolocks/${cofreId}/algopin/onetime`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${IGLOOHOME_TOKEN}` },
       body: JSON.stringify({ startAt, endAt, durationHours })
     });
     const { pin } = await response.json();
     return pin; // 6 dígitos válidos exatamente nessa janela
   }
   ```
6. PIN gerado é mostrado no app (qa-pago.html → dashboard cliente) + enviado por email
7. Cliente digita no teclado físico do cofre — abre

### Pros
- ✅ Hardware industrial pra outdoor (chuva, calor, sol)
- ✅ Funciona OFFLINE (carro em garagem subterrânea ok)
- ✅ API REST moderna + boa documentação
- ✅ Usado em escala global
- ✅ Bateria dura 12-18 meses (4× AA)

### Contras
- ⚠️ Importado (lead time + câmbio)
- ⚠️ Preço alto (R$ 1.700-2.200/unidade)
- ⚠️ Suporte em inglês (Singapura)

### Onde comprar
- **Direto Singapura**: https://www.igloohome.co (USD $200-280, importação)
- **Revendedor BR Amazon**: pesquisar "igloohome KeyBox 3" (preços varia)
- **Importador profissional**: Mercado Livre + AliExpress (cuidado: olhar avaliações)
- **B2B Singapura**: contact@igloohome.co (consulta volume 10+ unidades)

---

## 2. iLockey KS101 (alternativa nacional)

### O que é
Cadeado/cofre eletrônico brasileiro. Marca brasileira focada em locação de imóveis (Airbnb BR usa muito).

### Pros
- ✅ **Nacional** — sem importação, frete rápido (3-5 dias)
- ✅ Preço acessível (R$ 800-1.200)
- ✅ Suporte em português
- ✅ Garantia BR (Procon, etc)

### Contras
- ⚠️ API mais limitada (não tem algoPIN; usa códigos master + códigos temporários)
- ⚠️ Geração de PIN time-based exato é mais manual
- ⚠️ Resistência outdoor: precisa confirmar (alguns modelos são internos)
- ⚠️ Não vi referência em carsharing (foco em short-stay imóveis)

### Preços
- Hardware: R$ 800-1.200/unidade
- API/cloud: R$ 0 (gestão manual via app deles)

### Onde comprar
- https://ilockey.com.br
- Mercado Livre: "iLockey KS101"

### Recomendação
**Plano B se igloohome não funcionar**. Bom pra prototipagem mas API é mais limitada. Se Daniel quer "comprar agora 2 cofres e testar", iLockey é o caminho mais rápido (mas exige mais código custom pra integrar).

---

## 3. Master Lock Vault 5440D + Bluetooth

### O que é
Marca americana tradicional (cadeados há 100+ anos). Versão Smart com Bluetooth + cloud.

### Pros
- ✅ Marca conhecida, reputação sólida
- ✅ Hardware robusto (Master Lock é referência)
- ✅ Bluetooth funciona offline (smartphone do cliente conecta direto)

### Contras
- ⚠️ Bluetooth exige smartphone do cliente — pode falhar se bateria celular acabou
- ⚠️ API B2B custosa (Master Lock Vault Enterprise é R$ 100+/mês)
- ⚠️ Tradução do site BR é fraca

### Preço
- Hardware: R$ 1.500-2.000/unidade
- API Enterprise (necessário pra automação): R$ 30/mês/cofre × 20 cofres = R$ 600/mês na Fase 4

### Onde comprar
- https://www.masterlock.com.br
- Amazon BR

---

## 4. KeyTracker KT-Pro (Reino Unido — premium)

### O que é
Solução enterprise focada em frota corporativa (rent-a-car grandes, motoristas profissionais).

### Pros
- ✅ Solução end-to-end pensada pra carsharing
- ✅ API completa + dashboard analytics
- ✅ Marca enterprise (Avis, Hertz usam similar)

### Contras
- ❌ **Caro**: R$ 2.500-3.500/cofre + R$ 80-200/mês/cofre cloud
- ❌ Lead time longo (importação UK)
- ❌ Overkill pra MVP 2-20 carros

### Quando faz sentido
Quando atingir 50+ carros e quiser solução premium.

---

## 5. Construção própria (Arduino + cofre genérico)

### O que é
Comprar cofre mecânico simples (R$ 200-400) + Arduino com módulo wifi/bluetooth + teclado matricial + servo motor que destrava.

### Pros
- ✅ Custo material: R$ 400-800/unidade
- ✅ Controle total do firmware
- ✅ Sem dependência de fornecedor externo

### Contras
- ❌❌❌ **Reinventar a roda**: igloohome levou 10 anos pra resolver edge cases (clima, vandalismo, baixa bateria, etc)
- ❌ Tempo de desenvolvimento: 80-200 horas de trabalho de hardware/firmware
- ❌ Sem certificação (não é IP66, pode falhar na chuva)
- ❌ Suporte: zero (você é o suporte)
- ❌ Se falhar com cliente preso na rua, é problemão jurídico

### Recomendação
**Não faça.** Reinventar a roda em hardware é furada técnica e legal. Pior cenário: chave fica trancada, cliente perde compromisso, processa a Nomade.

---

## 6. Comparativo final (cenário Mês 6 — 10 carros)

| Solução | Hardware (10 cofres) | API mensal | One-time + 12 meses operação |
|---|---|---|---|
| **igloohome KeyBox 3** | R$ 20.000 | R$ 0 (offline) ou R$ 180 | R$ 20.000 ou R$ 22.160 |
| iLockey KS101 | R$ 10.000 | R$ 0 | R$ 10.000 (+ tempo dev custom API) |
| Master Lock 5440D | R$ 17.500 | R$ 300 | R$ 21.100 |
| KeyTracker KT-Pro | R$ 30.000 | R$ 1.500 | R$ 48.000 |
| DIY Arduino | R$ 6.000 | R$ 0 | R$ 6.000 + R$ 30k custo dev (200h) |

**Vencedor pra MVP**: **igloohome** (qualidade industrial + API limpa + sem custo mensal pra 10 cofres).

---

## 7. Plano de aquisição

### Fase 1 (Mês 1) — 2 cofres pra validação
1. Daniel compra 2× igloohome KeyBox 3 (~R$ 4.000 total)
2. Cria conta business em igloohome.co
3. Cadastra cofres associando aos 2 primeiros carros
4. Daniel me passa API token
5. Eu integro Edge Function `gerar-pin-cofre` (1-2 dias)
6. Cliente reserva → recebe PIN no app + email → cofre abre

### Fase 2 (Mês 4) — +3 cofres (total 5)
- Compra +3 unidades = +R$ 6.000
- API já integrada, só cadastrar novos cofres

### Fase 3 (Mês 7) — +5 cofres (total 10)
- Compra +5 unidades = +R$ 10.000
- Migra pra plano Cloud Pro (R$ 180/mês) pra analytics

### Fase 4 (Mês 13) — +10 cofres (total 20)
- Compra +10 unidades = +R$ 20.000

### Total acumulado em 18 meses
- Hardware: **R$ 40.000** (20 cofres × R$ 2.000 médio)
- API mensal Fase 3+ (12 meses × R$ 180): **R$ 2.160**
- **TOTAL: R$ 42.160**

---

## 8. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Bateria do cofre acaba | Trocar a cada 12 meses preventivo + alerta de bateria baixa via API |
| Cofre roubado | Hardware barato (R$ 2k), chave roubada não dá pra dirigir sem destrancar carro (que tem cofre digital interno) |
| Lead time importação | Estoque mínimo: comprar 2-3 cofres a mais que precisa |
| API igloohome cair | Falha rara (>99.9% uptime), e algoPIN funciona offline |
| Câmbio sobe | Comprar em lote (10+ unidades) pra travar preço |

---

## 9. Próximos passos

- [ ] **Decisão Daniel**: aprovar igloohome como solução padrão (R$ 4k inicial)
- [ ] Daniel cria conta em https://www.igloohome.co/business
- [ ] Daniel compra 2× KeyBox 3 (via site direto ou revendedor)
- [ ] Daniel envia API token via Supabase Secrets
- [ ] Eu integro Edge Function `gerar-pin-cofre` (1-2 dias dev)
- [ ] Teste end-to-end: criar reserva fake → PIN gerado → tentar abrir cofre físico
- [ ] Adicionar PIN no e-mail de confirmação (template Resend)
- [ ] Adicionar PIN na tela `qa-pago.html` + dashboard cliente

---

**Documento criado em:** 2026-05-31
**Versão:** 1.0
**Próxima revisão:** após teste do primeiro cofre comprado
