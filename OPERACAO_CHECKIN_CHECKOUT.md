# 🔑 Operação Check-in / Check-out — Nomade Drive

> **Versão**: 1.0 · **Data**: 02/06/2026 · **Autor**: Daniel + Claude
> Documento operacional. Atualizar sempre que mudar processo.

---

## 🎯 Decisões fundamentais

| Decisão | Recomendação |
|---|---|
| **Quem tira fotos antes da entrega** | Sócio operacional (na garagem, D-1) |
| **Quem tira fotos antes da devolução** | Cliente (no app PWA) ou Sócio (presencial) |
| **Onde fica a chave** | Mão (presencial) OU igloohome KeyBox 3 em ponto público |
| **Onde acontece a entrega** | Aeroporto, Shopping, Hospital ou ponto pré-acordado |
| **Quem leva o carro** | Sócio operacional (frota própria, mesmo carro de volta) |
| **Vistoria assinada digitalmente** | Autentique (integração já planejada na Fase 82-5) |
| **Acesso do cliente às fotos** | URL pública com token único: `nomadedrive.com.br/vistoria.html?b=ABC123` |

---

## 📅 Linha do tempo — CHECK-IN (entrega)

### D-2 (2 dias antes da entrega)
- **Cliente**: recebe email/WhatsApp com:
  - Confirmação da reserva
  - Link pra fazer upload de docs (CNH + selfie + comprovante endereço)
  - Pagamento da 1ª parcela (PIX/cartão)
- **Admin**: Daniel revisa documentos manualmente (até Caf estar ativo)
- **Sócio op**: separa o carro, verifica pendências (multas, manutenção, combustível)

### D-1 (véspera) — **VISTORIA PRÉ-ENTREGA**

**Local**: garagem/escritório do sócio operacional em Uberlândia

**Sócio operacional executa o protocolo de 13 fotos** (checklist no celular):

1. Frente completa do carro (placa visível)
2. Traseira completa (placa visível)
3. Lateral esquerda
4. Lateral direita
5. Pneu dianteiro esquerdo (close)
6. Pneu dianteiro direito (close)
7. Pneu traseiro esquerdo (close)
8. Pneu traseiro direito (close)
9. Painel/hodômetro (quilometragem inicial visível)
10. Banco do motorista
11. Bancos traseiros
12. Porta-malas vazio
13. Marcador de combustível (foto do painel novamente, fechando o ciclo)

**+ 1 vídeo de 30 segundos** caminhando ao redor do carro mostrando estado geral.

**Sistema captura**:
- Fotos enviadas pra Supabase Storage → bucket `vehicle-inspections/[booking_id]/checkin/`
- Cada foto com timestamp UTC + GPS automático do celular
- Vídeo MP4 H.264 720p (~10-20MB)
- Quilometragem inicial registrada em `bookings.km_initial`
- Combustível inicial registrado (Cheio/3/4/Meio/etc)

**Sócio**: envia link único pro cliente:
> *"Olá [Nome], o carro [Modelo placa XYZ-1234] está pronto pra você. Veja o estado atual em [link]. Amanhã às [hora] te encontro em [ponto]."*

### D-0 (dia da entrega)

**Sócio operacional**:
1. Leva o carro ao ponto combinado (sai 30min antes)
2. Confirma identidade do cliente (CNH original = mesma do cadastro)
3. Vistoria conjunta de 5 min (apontando avarias se existirem)
4. Cliente assina digitalmente o termo de entrega (Autentique) no celular
5. Entrega chave + manual + documento
6. Foto "selfie de entrega": sócio + cliente + carro (opcional, com consentimento)
7. Hand-off WhatsApp: salva contato direto do sócio pra emergências

**Tempo total**: 15-20 minutos

**Cliente recebe automaticamente por email**:
- PDF do laudo de entrega assinado
- Link permanente da galeria de 13 fotos + vídeo
- Manual de uso (combustível recomendado, abastecimento, etc)
- Contato 24h pra emergência

---

## 📅 Linha do tempo — CHECK-OUT (devolução)

### D-3 antes da devolução
- WhatsApp automático: *"Olá [Nome]! Seu contrato termina em 3 dias ([data]). Quer renovar? Pra devolver, escolha um dos pontos: [aeroporto/shopping/hospital] ou confirme onde quer deixar o carro."*
- Lead pra renovação 1-click

### D-1 véspera
- WhatsApp: *"Amanhã às [hora] te espero em [ponto]. Lembre de abastecer no nível original ([nível]) e tirar suas coisas pessoais."*

### D-0 (dia da devolução) — 2 opções

#### OPÇÃO A — Devolução presencial (recomendada, padrão)

**Cliente entrega ao sócio operacional no ponto combinado**:
1. Sócio chega 15 min antes
2. Cliente entrega chave + documento
3. **Vistoria conjunta de 10 min**: cliente acompanha enquanto sócio tira as MESMAS 13 fotos do check-in
4. Comparação visual antes/depois (no celular do sócio, lado a lado)
5. Se sem dano:
   - Cliente assina termo de devolução
   - Caução cartão liberada em até 7 dias úteis (depende do banco)
   - Email automático: "Devolução concluída sem ocorrências"
6. Se com dano leve (até R$ 200):
   - Foto da avaria + orçamento de reparo
   - Cliente concorda → cobrança no cartão de caução
7. Se com dano grande (>R$ 200):
   - Procedimento formal com seguro
   - Caução parcialmente capturada
   - Caso de divergência → mediação por email + WhatsApp

**Tempo**: 15-20 min · **Custo extra**: ZERO

#### OPÇÃO B — Devolução self-service (após 6+ meses operando, opcional)

Só ativar depois de 10+ entregas sem incidentes e com cofre igloohome instalado.

**Cliente devolve sozinho em ponto pré-acordado**:
1. Cliente chega no ponto (estacionamento Aeroporto/Shopping/etc)
2. Abre o **app PWA Nomade Drive** (URL: `vistoria.html?b=ABC123&type=checkout`)
3. App guia: "Tire foto 1/13 — Frente do carro"
4. Cliente tira as 13 fotos seguindo o guia visual (overlay com posição da câmera)
5. **App rejeita fotos ruins** automaticamente:
   - Borradas (giroscópio detecta tremor)
   - Muito escuras (lux sensor)
   - Foto da pessoa em vez do carro (detecção facial básica)
6. App valida → tudo OK → cliente coloca chave no **cofre igloohome KeyBox 3**:
   - PIN único enviado por SMS (válido 2h)
   - Cliente digita PIN, cofre abre, deposita chave, fecha
   - Cofre confirma fechamento bem-sucedido
7. Email automático: "Devolução recebida, sócio vai conferir em até 4h"
8. **Sócio operacional** vai ao ponto em até 4h:
   - Confere carro (vistoria sócio, sem cliente)
   - Pega chave do cofre (PIN admin)
   - Libera caução ou abre disputa (se houver dano não fotografado)

**Tempo cliente**: 10-15 min · **Custo extra**: R$ 50 taxa "devolução self-service" (cobrir tempo do sócio buscar depois)

---

## 🗝 Sobre a chave — onde fica

### Fase 1 (atual, 2 carros, mês 1-6): 100% presencial
- Chave fica com o sócio operacional
- Entrega e devolução em mãos
- **Zero risco operacional**

### Fase 2 (5 carros, mês 7-12): híbrido
- Manter presencial pra primeira entrega de cada cliente novo
- Cliente recorrente (já alugou 1x antes) pode usar self-service
- Instalar **2 cofres igloohome KeyBox 3** em pontos fixos:
  - **Cofre 1**: Aeroporto Bombonato (parceria com estacionamento longa permanência)
  - **Cofre 2**: Center Shopping (parceria valet ou bicicletário pago)

### Fase 3 (10+ carros, mês 13+): self-service expandido
- 4-5 cofres em pontos estratégicos:
  - Aeroporto
  - Center Shopping
  - Hospital de Clínicas UFU
  - Posto BR Rondon Pacheco
  - Praça Tubal Vilela (Centro)

### Custo dos cofres
- igloohome KeyBox 3: **R$ 1.700-2.200/unidade**
- Pesquisado em detalhe no documento `PESQUISA_COFRES_ELETRONICOS.md`
- AlgoPIN offline (não precisa internet/Wi-Fi)
- Bluetooth backup (para gerar PINs adicionais via app)
- Bateria 12.000 aberturas (2-3 anos)
- À prova d'água IPX5

---

## 📱 Sistema de fotos compartilhadas — implementação

### Estrutura proposta

**Tabela nova `vehicle_inspections`**:
```sql
CREATE TABLE vehicle_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('checkin', 'checkout')),
  performed_by text NOT NULL CHECK (performed_by IN ('owner', 'client')),  -- quem tirou as fotos
  photos jsonb NOT NULL DEFAULT '[]',     -- [{url, slot: 1-13, timestamp, gps_lat, gps_lng}]
  video_url text,                          -- vídeo 30s
  km_reading integer,                      -- hodômetro
  fuel_level text,                         -- 'cheio' | 'tres_quartos' | 'meio' | 'um_quarto' | 'reserva'
  condition_notes text,                    -- notas livres
  checklist jsonb,                         -- {pneus_ok: true, vidros_ok: true, ...}
  signed_at timestamptz,                   -- quando cliente assinou
  signature_provider text,                 -- 'autentique' (id externo)
  signature_external_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inspections_booking ON vehicle_inspections(booking_id, type);
```

**Acesso público via token (sem login)**:
- URL: `https://nomadedrive.com.br/vistoria.html?b=<booking_id>&t=<token>`
- `token` = HMAC-SHA256(booking_id, secret) primeiros 16 chars
- Cliente recebe URL no email/WhatsApp da reserva
- Página renderiza: galeria 13 fotos + vídeo + checklist + dados

**Página `vistoria.html`** (frontend público):
- Visualização: galeria swipeable, vídeo player, lista de checklist
- Modo "tirar foto" (só se `?type=checkout`): abre câmera HTML5 (`getUserMedia`)
- Upload direto pra Supabase Storage com signed URL temporária
- Funciona em qualquer celular sem instalar app

**Edge Function nova `upload-inspection`**:
- Recebe foto + slot + booking_id + token
- Valida token HMAC
- Faz upload no bucket `vehicle-inspections/`
- Atualiza array `photos` na tabela
- Retorna URL pública

### Custo de storage Supabase
- 13 fotos × 500KB = ~7MB/inspeção
- 2 inspeções por booking = 14MB
- 100 bookings/ano = 1.4GB
- Custo: **R$ 0,03/mês** (preço Supabase Storage atual)

---

## 🛡 Mitigação de riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Cliente danifica e nega | Média | Alto | 13 fotos timestamp+GPS + assinatura digital Autentique + caução pré-autorizada |
| Cliente foge com carro | Baixa | Crítico | Telemetria Cobli em tempo real (corte motor remoto opcional) + Caf KYC + caução |
| Chave perdida ou quebrada | Baixa | Médio | 2ª chave guardada no escritório + chaveiro 24h Uberlândia já mapeado |
| Cofre não abre (cliente travado) | Baixa | Alto | WhatsApp 24h do sócio + backup Bluetooth + chaveiro emergência |
| Cliente reclama de avaria antiga | Alta | Médio | Galeria pública pré-entrega + cliente já viu e aceitou |
| Devolução em horário não-comercial | Alta | Baixo | Self-service com cofre OU taxa "fora de horário" R$ 80 OU agendar pro dia útil |
| Cliente quer estender última hora | Média | Baixo | Renovação 1-click no WhatsApp + cobrança proporcional do excedente |

---

## 💰 Custo da operação check-in/check-out

### Fase 1 (presencial total) — primeiros 6 meses

**Por entrega + devolução**:
- Sócio operacional: 1h (30min entrega + 30min devolução)
- Combustível deslocamento: R$ 30 (ida + volta da garagem ao ponto)
- **Custo direto**: R$ 30 + (1h × R$ 50/h = R$ 50) = **R$ 80 por booking**

**Volume estimado mês 1-6**: 2-5 bookings/mês = R$ 160-400/mês

### Fase 2 (híbrido com cofres) — meses 7-12

**Investimento inicial**:
- 2 cofres igloohome KeyBox 3: R$ 4.000
- Parcerias (taxa pelo uso do espaço): R$ 100-300/mês
- Setup técnico (app PWA + edge functions): zero custo direto (já no escopo Claude)

**Por entrega/devolução**:
- 30% presencial (cliente novo, contratos longos): R$ 80/booking
- 70% self-service: R$ 30/booking (só sócio busca depois)
- **Média ponderada**: R$ 45/booking

**Volume estimado mês 7-12**: 10-20 bookings/mês = R$ 450-900/mês

### Fase 3 (otimizado) — mês 13+

- 4 cofres ativos: R$ 8.000 investimento
- 70%+ self-service: R$ 25/booking médio
- Volume 20-40 bookings/mês = R$ 500-1.000/mês

---

## 🛠 O que falta implementar (roadmap)

| Item | Prioridade | Esforço | Fase |
|---|---|---|---|
| Tabela `vehicle_inspections` no Supabase | P0 | 1h | Antes 1ª locação |
| Edge Function `upload-inspection` | P0 | 2h | Antes 1ª locação |
| Página `vistoria.html` (visualização) | P0 | 4h | Antes 1ª locação |
| Página `vistoria.html` (captura câmera PWA) | P1 | 6h | Antes Fase 2 (self-service) |
| Geração token HMAC nos emails | P0 | 1h | Antes 1ª locação |
| Integração Autentique (assinatura) | P1 | 4h | Fase 82-5 já planejada |
| Compra 2x igloohome KeyBox 3 | P2 | R$ 4.000 | Antes Fase 2 |
| Parceria estacionamento Aeroporto | P2 | reunião | Antes Fase 2 |
| Parceria Center Shopping | P2 | reunião | Antes Fase 2 |
| Telemetria Cobli (corte motor remoto) | P1 | já em Cobli plan | Continuo |

---

## 📞 Quando começar a implementação técnica

**Recomendação**: começa com versão mínima viável (MVP) hoje, sem app, sem cofre:

1. **D-1**: sócio tira 13 fotos no celular + envia pro cliente via WhatsApp como álbum
2. **D-0**: entrega presencial com vistoria conjunta (cliente assina termo em papel ou PDF Autentique pelo celular)
3. Tudo manual nos primeiros 5-10 bookings

**Depois de 10 bookings**: já tem dados pra justificar investir em:
- Página `vistoria.html` (URLs persistentes)
- App PWA (cliente tira foto)
- Cofre (self-service)

**Custo da versão manual**: ZERO (só WhatsApp + celular).
**Tempo até estar 100% digital**: 3-6 meses de operação.

---

## ✅ Próximos passos sugeridos

1. **Esta semana**: definir com sócio operacional o protocolo de 13 fotos (testem juntos com 1 carro real)
2. **Próximas 2 semanas**: criar checklist em papel ou PDF preenchível pro sócio usar nas 5 primeiras locações
3. **Mês 2**: pedir feedback dos primeiros 5 clientes (foi rápida? confortável? confiança?)
4. **Mês 3**: decidir se implementa app PWA ou continua manual
5. **Mês 6**: decidir se investe nos cofres igloohome
