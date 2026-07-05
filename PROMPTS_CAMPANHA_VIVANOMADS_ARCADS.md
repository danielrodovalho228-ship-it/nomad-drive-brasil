# Viva Nomads — Prompts de Campanha (Claude Code + Arcads)

> Como usar: abra o Claude Code dentro da pasta `arcads-claude-code` (com `.env` configurado) e cole um prompt por sessão. O agente vai estimar os créditos e pedir sua confirmação antes de gerar — sempre confirme o custo no painel da Arcads.

> Antes do primeiro prompt, preencha o `MASTER_CONTEXT.md` com o bloco da seção 0 abaixo, para que todas as gerações herdem a voz da marca automaticamente.

> ⚠️ **Regra desta versão:** nenhum criativo compara preço com Airbnb, hotel ou qualquer marca de terceiro. Vendemos o nosso modelo (preço mensal, média temporada, verificação e documentação) pelos méritos dele.

---

## 0. Bloco para o MASTER_CONTEXT.md (colar uma vez)

```
## Minha marca — Viva Nomads
- Produto: Viva Nomads (vivanomads.com.br) — marketplace brasileiro de aluguel mobiliado de média temporada (30 a 180 dias, art. 48 da Lei 8.245/91).
- Cidade piloto: Uberlândia (MG).
- Públicos: (1) inquilinos — nômades digitais, profissionais em transição, médicos residentes, concurseiros, pessoas em mudança de cidade; (2) proprietários de imóveis mobiliados.
- Diferenciais: preço mensal transparente (sem diária, sem taxa por noite), contrato digital assinado (ZapSign), verificação de identidade (CAF), vistoria documentada, imóveis mobiliados prontos para morar e trabalhar.
- Regra de ouro 1: a plataforma conecta, verifica, documenta e registra — nunca segura dinheiro de aluguel ou caução. NUNCA sugerir em nenhum criativo que pagamos ou retemos valores.
- Regra de ouro 2: NUNCA citar, mostrar ou comparar preços com Airbnb, Booking, hotéis ou qualquer marca de terceiro. Nada de "mais barato que X". Falamos apenas do nosso modelo.
- Tom de voz: acolhedor, direto, confiável, brasileiro; sem juridiquês nos anúncios; português do Brasil em todo texto on-screen e falas.
- Formato padrão: 9:16 (Reels/TikTok/Stories), legendas queimadas em PT-BR.
```

---

## Prompt 1 — Vídeo UGC (Seedance 2.0): inquilina nômade digital

**Objetivo:** anúncio Reels/TikTok para captar inquilinos. Formato selfie autêntico.
**Ângulo:** chegar numa cidade nova com tudo resolvido — mobiliado, verificado, pronto pra trabalhar.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 UGC (seedance-2-ugc.md, fórmula de 9 camadas).

Crie 1 vídeo de 12 a 15 segundos, formato 9:16, com áudio nativo em português do Brasil, estilo selfie autêntico gravado com celular.

Personagem: mulher brasileira de ~28 anos, designer que trabalha remoto, aparência natural (sem visual de modelo), dentro de um apartamento mobiliado claro e aconchegante em Uberlândia — sofá, plantas, notebook aberto na mesa, luz natural de fim de tarde.

Roteiro da fala (tom espontâneo, como quem conta pra uma amiga):
"Vim passar 3 meses em Uberlândia e a maior preocupação era onde morar. No Viva Nomads eu achei um apê mobiliado, com preço mensal fechado, contrato digital e imóvel verificado. Cheguei com a mala e o notebook — internet boa, mesa pra trabalhar, tudo pronto. Se você vai ficar um mês ou mais numa cidade, procura lá."

Texto on-screen no final: "vivanomads.com.br — more de 1 a 6 meses sem dor de cabeça".

Restrições: nada de logotipos de terceiros visíveis; não mostrar dinheiro ou pagamento; não citar concorrentes; legendas em PT-BR queimadas depois com a skill caption-video.

Antes de gerar, me mostre a estimativa de créditos e o prompt final em inglês que você vai enviar à API para eu aprovar.
```

---

## Prompt 2 — Vídeo UGC (Seedance 2.0): médica residente

**Objetivo:** variação de público para o lado da demanda — residência médica é estadia longa por natureza.
**Ângulo:** mudança por tempo determinado, sem burocracia de aluguel anual.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 UGC (seedance-2-ugc.md).

Crie 1 vídeo de 12 a 15 segundos, 9:16, áudio nativo em PT-BR, estilo selfie.

Personagem: mulher brasileira de ~26 anos, com scrub/jaleco azul de plantão dobrado sobre a cadeira, num quarto-sala mobiliado e organizado, fim de noite, luz de abajur, tom cansado mas satisfeito.

Roteiro da fala:
"Passei na residência em Uberlândia e tinha três semanas pra me mudar. Aluguel normal ia pedir fiador, contrato de ano... eu precisava de 6 meses. No Viva Nomads achei um apê mobiliado, assinei o contrato digital no celular e o imóvel tinha vistoria documentada. Mudança resolvida numa semana. Fica a dica pra quem vai fazer residência ou concurso fora."

Texto on-screen no final: "vivanomads.com.br — estadias de 1 a 6 meses".

Mesmas restrições do MASTER_CONTEXT.md (sem citar concorrentes, sem mostrar pagamento). Mostre estimativa de créditos e o prompt final antes de gerar.
```

---

## Prompt 3 — Vídeo UGC (Seedance 2.0): proprietário (lado da oferta)

**Objetivo:** captar proprietários — o gargalo real do marketplace no início.
**Ângulo:** renda previsível e inquilino verificado, sem rotatividade semanal.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 UGC (seedance-2-ugc.md).

Crie 1 vídeo de 12 a 15 segundos, 9:16, áudio nativo em PT-BR, estilo selfie.

Personagem: homem brasileiro de ~50 anos, dono de imóveis, camisa polo, falando direto para a câmera na varanda de um apartamento mobiliado em Uberlândia.

Roteiro da fala:
"Eu tenho três apartamentos mobiliados e cansei de trocar de hóspede toda semana. No Viva Nomads eu alugo por 1 a 6 meses: inquilino com identidade verificada, contrato digital assinado e vistoria documentada de entrada e saída. Um contrato só, renda previsível o semestre inteiro. Anuncia o seu lá, é rápido e não paga nada pra anunciar."

Texto on-screen no final: "vivanomads.com.br/para-proprietarios — anuncie grátis".

Mesmas restrições do MASTER_CONTEXT.md. Mostre estimativa de créditos e o prompt final antes de gerar.
```

---

## Prompt 4 — Vídeo UGC (Seedance 2.0): casal em mudança de cidade

**Objetivo:** público "transição de vida" — entre a chegada na cidade e o imóvel definitivo.
**Ângulo:** a ponte entre a mudança e a casa própria/aluguel definitivo.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 UGC (seedance-2-ugc.md).

Crie 1 vídeo de 12 a 15 segundos, 9:16, áudio nativo em PT-BR, estilo selfie a dois (um segura o celular).

Personagens: casal brasileiro de ~35 anos, roupas casuais, caixas de mudança fechadas ao fundo numa sala mobiliada e iluminada.

Roteiro da fala (ele começa, ela completa):
Ele: "A gente se mudou pra Uberlândia pelo trabalho dela e ainda não sabia em que bairro ia querer morar."
Ela: "Então alugamos 3 meses pelo Viva Nomads: apartamento mobiliado, contrato digital, tudo verificado. Deu tempo de conhecer a cidade com calma antes de escolher a casa definitiva."

Texto on-screen no final: "vivanomads.com.br — chegue primeiro, decida depois".

Mesmas restrições do MASTER_CONTEXT.md. Mostre estimativa de créditos e o prompt final antes de gerar.
```

---

## Prompt 5 — Product hero (Seedance 2.0): institucional premium

**Objetivo:** vídeo de marca sem pessoas, para topo de funil e site.

```
Use a skill arcads-external-api com o fluxo Seedance 2.0 premium reveal (seedance-2-premium-reveal.md).

Crie 1 vídeo de 10 segundos, 9:16, sem pessoas, estética premium: fundo escuro, uma chave de apartamento girando lentamente no ar com partículas de luz, transição para a fachada iluminada de um prédio residencial moderno ao entardecer.

Narrativa em texto on-screen (PT-BR), uma frase por cena:
1. "Vai ficar 1 mês? 3? 6?"
2. "Existe um jeito certo de morar por temporada."
3. "Viva Nomads. Aluguel mobiliado de média temporada."
4. "Verificado. Documentado. Preço mensal fechado."
5. "vivanomads.com.br"

Trilha: ambiente eletrônico suave, sem voz. Sem citar ou insinuar concorrentes. Mostre estimativa de créditos e o prompt final antes de gerar.
```

---

## Prompt 6 — Anúncio estático Meta (imagem): checklist da mudança

**Objetivo:** criativo estático de conversão para Meta Ads — sem comparação com terceiros.
**Formato:** checklist estilo anotação de celular (o que você resolve de uma vez).

```
Leia primeiro shared/skills/image-ad-prompting/OVERVIEW.md e use a skill nano-banana-image-ad com o template de lista estilo Apple Notes da prompt library.

Crie 1 imagem 4:5 (feed) simulando uma anotação de celular com o título "Mudança pra Uberlândia — resolvido:" e a lista:
- Apartamento mobiliado ✅
- Contrato digital assinado ✅
- Imóvel e inquilino verificados ✅
- Vistoria documentada ✅
- Preço mensal fechado, sem surpresa ✅
Rodapé pequeno: "Estadias de 1 a 6 meses · vivanomads.com.br"

Tipografia limpa, PT-BR sem erros, sem marcas de terceiros. Mostre estimativa de créditos antes de gerar.
```

---

## Prompt 7 — Anúncio estático Meta (imagem): proprietário

**Objetivo:** estático de captação de imóveis (campanha de cadastro).

```
Use a skill nano-banana-image-ad com o template de lista estilo Apple Notes.

Crie 1 imagem 4:5 (feed) simulando uma anotação de celular com o título "Seu imóvel mobiliado parado?" e a lista:
- Alugue por 1 a 6 meses ✅
- Inquilino com identidade verificada ✅
- Contrato digital + vistoria documentada ✅
- Um contrato só, renda previsível ✅
Rodapé: "Anuncie grátis · vivanomads.com.br/para-proprietarios"

Tipografia limpa, PT-BR sem erros. Mostre estimativa de créditos antes de gerar.
```

---

## Ordem sugerida de execução

1. **Prompt 6** primeiro (imagem é barata — valida a mensagem antes de gastar créditos de vídeo).
2. **Prompt 1** (nômade) e **Prompt 2** (residente) — criativos de demanda com maior potencial de escala; rode como variações A/B na mesma campanha.
3. **Prompt 3** (proprietário) + **Prompt 7** — campanha separada com objetivo de cadastro de imóvel.
4. **Prompt 4** (casal) — segunda onda de demanda, público lookalike de conversões.
5. **Prompt 5** por último (institucional, menor prioridade de mídia paga).

Depois de cada vídeo aprovado, rode a skill `caption-video` para queimar as legendas em PT-BR antes de subir para o Meta.

---

## Claims aprovados (usar) vs. proibidos (nunca usar)

| ✅ Pode falar | ❌ Não pode falar |
|---|---|
| "Preço mensal fechado/transparente" | "Mais barato que Airbnb/hotel" |
| "Sem diária, sem taxa por noite" | Qualquer comparação de preço com marca |
| "Contrato digital assinado (ZapSign)" | "Sem risco" / "garantido" |
| "Identidade verificada (CAF)" | "Pagamos você" / "seguramos o aluguel" |
| "Vistoria documentada de entrada e saída" | Nomes/logos de concorrentes |
| "Estadias de 1 a 6 meses (média temporada)" | Promessa de rentabilidade específica (%/R$) |
| "Mobiliado, pronto pra morar e trabalhar" | "O maior/melhor do Brasil" |

---

## Como isso se integra com o PROMPT_FLOW_VIDEO.md

| | Flow video (PROMPT_FLOW_VIDEO.md) | Campanha Arcads (este arquivo) |
|---|---|---|
| **O que mostra** | O produto real (telas do site navegadas) | Pessoas/cenas geradas por IA (UGC, institucional) |
| **Onde rodar** | Sessão do Claude Code no repo do produto | Sessão na pasta `arcads-claude-code` |
| **Custo** | Zero (renderizado localmente) | Créditos Arcads (confirmar antes) |
| **Melhor uso** | Demonstração/explicação (bio, site, WhatsApp, retarget) | Anúncios de aquisição (Meta/TikTok topo de funil) |
| **Narração** | ElevenLabs (voz sua) | Áudio nativo do Seedance |

Sugestão de mídia: UGC (Prompts 1-4) para atrair → flow video como retarget/prova de produto → estático (Prompts 6-7) para conversão.
