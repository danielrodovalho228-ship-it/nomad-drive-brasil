# Viva Nomads — Prompts de Campanha (Claude Code + Arcads)

> Como usar: abra o Claude Code dentro da pasta `arcads-claude-code` (com `.env` configurado) e cole um prompt por sessão. O agente vai estimar os créditos e pedir sua confirmação antes de gerar — sempre confirme o custo no painel da Arcads.

> Antes do primeiro prompt, preencha o `MASTER_CONTEXT.md` com o bloco da seção 0 abaixo, para que todas as gerações herdem a voz da marca automaticamente.

---

## 0. Bloco para o MASTER_CONTEXT.md (colar uma vez)

```
## Minha marca — Viva Nomads
- Produto: Viva Nomads (vivanomads.com.br) — marketplace brasileiro de aluguel mobiliado de média temporada (30 a 180 dias, art. 48 da Lei 8.245/91).
- Cidade piloto: Uberlândia (MG).
- Públicos: (1) inquilinos — nômades digitais, profissionais em transição, médicos residentes, concurseiros, pessoas em mudança de cidade; (2) proprietários de imóveis mobiliados.
- Diferenciais: contrato digital assinado (ZapSign), verificação de identidade (CAF), vistoria documentada, sem taxa de hospedagem diária — preço mensal justo, mais barato que Airbnb para estadias longas.
- Regra de ouro: a plataforma conecta, verifica, documenta e registra — nunca segura dinheiro de aluguel ou caução. NUNCA sugerir em nenhum criativo que pagamos ou retemos valores.
- Tom de voz: acolhedor, direto, confiável, brasileiro; sem juridiquês nos anúncios; português do Brasil em todo texto on-screen e falas.
- Formato padrão: 9:16 (Reels/TikTok/Stories), legendas queimadas em PT-BR.
- Compliance: não usar marcas de terceiros de forma depreciativa; comparações apenas factuais (preço por mês vs. diária).
```

---

## Prompt 1 — Vídeo UGC (Seedance 2.0): depoimento de inquilina nômade digital

**Objetivo:** anúncio Reels/TikTok para captar inquilinos. Formato selfie autêntico.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 UGC (seedance-2-ugc.md, fórmula de 9 camadas).

Crie 1 vídeo de 12 a 15 segundos, formato 9:16, com áudio nativo em português do Brasil, estilo selfie autêntico gravado com celular.

Personagem: mulher brasileira de ~28 anos, designer que trabalha remoto, aparência natural (sem visual de modelo), dentro de um apartamento mobiliado claro e aconchegante em Uberlândia — sofá, plantas, notebook aberto na mesa, luz natural de fim de tarde.

Roteiro da fala (tom espontâneo, como quem conta pra uma amiga):
"Gente, eu precisava de um apê mobiliado por 3 meses em Uberlândia e o Airbnb tava saindo uma fortuna. Achei o Viva Nomads: preço mensal de verdade, contrato digital assinado, tudo verificado. Em dois dias eu já tava com a chave na mão. Sério, se você vai ficar mais de um mês numa cidade, procura lá."

Texto on-screen no final: "vivanomads.com.br — more de 1 a 6 meses sem dor de cabeça".

Restrições: nada de logotipos de terceiros visíveis; não mostrar dinheiro ou pagamento; legendas em PT-BR queimadas depois com a skill caption-video.

Antes de gerar, me mostre a estimativa de créditos e o prompt final em inglês que você vai enviar à API para eu aprovar.
```

---

## Prompt 2 — Vídeo UGC (Seedance 2.0): proprietário (lado da oferta)

**Objetivo:** captar proprietários como a Márcia — o gargalo real do marketplace no início.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 UGC (seedance-2-ugc.md).

Crie 1 vídeo de 12 a 15 segundos, 9:16, áudio nativo em PT-BR, estilo selfie.

Personagem: homem brasileiro de ~50 anos, dono de imóveis, camisa polo, falando direto para a câmera na varanda de um apartamento mobiliado em Uberlândia.

Roteiro da fala:
"Eu tenho três apartamentos mobiliados e cansei da rotatividade do aluguel por diária. No Viva Nomads eu alugo por 1 a 6 meses: inquilino verificado, contrato digital, vistoria documentada. Renda previsível, sem vacância toda semana. Anuncia o seu lá, é rápido."

Texto on-screen no final: "vivanomads.com.br/proprietarios — anuncie grátis".

Mesmas restrições do MASTER_CONTEXT.md. Mostre estimativa de créditos e o prompt final antes de gerar.
```

---

## Prompt 3 — Product hero (Seedance 2.0): institucional premium

**Objetivo:** vídeo de marca sem pessoas, para topo de funil e site.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 premium reveal (seedance-2-premium-reveal.md).

Crie 1 vídeo de 10 segundos, 9:16, sem pessoas, estética premium: fundo escuro, uma chave de apartamento girando lentamente no ar com partículas de luz, transição para a fachada iluminada de um prédio residencial moderno ao entardecer.

Narrativa em texto on-screen (PT-BR), uma frase por cena:
1. "Ficar 1 mês? 3? 6?"
2. "Diária de hotel não faz sentido."
3. "Viva Nomads. Aluguel mobiliado de média temporada."
4. "Verificado. Documentado. Sem surpresa."
5. "vivanomads.com.br"

Trilha: ambiente eletrônico suave, sem voz. Mostre estimativa de créditos e o prompt final antes de gerar.
```

---

## Prompt 4 — Anúncio estático Meta (imagem): comparação de preço

**Objetivo:** criativo estático de conversão para Meta Ads, formato de nota comparativa.

```
Leia primeiro shared/skills/image-ad-prompting/OVERVIEW.md e use a skill nano-banana-image-ad com o template de lista estilo Apple Notes da prompt library.

Crie 1 imagem 4:5 (feed) simulando uma anotação de celular com o título "Ficar 3 meses em Uberlândia:" e a lista:
- Hotel: R$ 9.000+ ❌
- Airbnb (diária): R$ 7.500+ ❌
- Viva Nomads (mensal): a partir de R$ 2.200/mês ✅
Rodapé pequeno: "Apartamentos mobiliados · contrato digital · vivanomads.com.br"

Valores são ilustrativos — deixe-os facilmente editáveis no prompt para eu ajustar com preços reais da Márcia antes de publicar. Tipografia limpa, PT-BR sem erros. Mostre estimativa de créditos antes de gerar.
```

---

## Ordem sugerida de execução

1. **Prompt 4** primeiro (imagem é barata — valida a mensagem antes de gastar créditos de vídeo).
2. **Prompt 1** (inquilino) — é o criativo com maior potencial de escala.
3. **Prompt 2** (proprietário) — rode como campanha separada com objetivo de cadastro.
4. **Prompt 3** por último (institucional, menor prioridade de mídia paga).

Depois de cada vídeo aprovado, rode a skill `caption-video` para queimar as legendas em PT-BR antes de subir para o Meta.

---

## Como isso se integra com o PROMPT_FLOW_VIDEO.md

Os dois documentos são complementares e cobrem etapas diferentes do funil:

| | Flow video (PROMPT_FLOW_VIDEO.md) | Campanha Arcads (este arquivo) |
|---|---|---|
| **O que mostra** | O produto real (telas do site navegadas) | Pessoas/cenas geradas por IA (UGC, institucional) |
| **Onde rodar** | Sessão do Claude Code no repo do produto | Sessão na pasta `arcads-claude-code` |
| **Custo** | Zero (renderizado localmente) | Créditos Arcads (confirmar antes) |
| **Melhor uso** | Demonstração/explicação (bio, site, WhatsApp, retarget) | Anúncios de aquisição (Meta/TikTok topo de funil) |
| **Narração** | ElevenLabs (voz sua) | Áudio nativo do Seedance |

Sugestão de mídia: UGC (Prompts 1-2) para atrair → flow video como retarget/prova de produto → estático (Prompt 4) para conversão.
