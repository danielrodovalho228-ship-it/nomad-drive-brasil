# 🎬 Prompt Mestre — Flow Video de Produto (reutilizável)

> **Como usar:** abra uma sessão do Claude Code no repositório do projeto desejado,
> copie o bloco "PROMPT" abaixo, preencha os campos `[ENTRE COLCHETES]` e cole no chat.
> Funciona para qualquer app/site (HTML estático, Next.js, Vite etc.).
> Criado a partir do processo validado no vídeo da Nomade Drive (jun/2026).

---

## PROMPT (copie daqui para baixo)

Quero que você crie um **flow video** profissional do meu produto, seguindo exatamente esta receita já validada:

### O produto
- **Nome:** [NOME DO PRODUTO — ex.: Viva Nomads]
- **O que é:** [1 frase — ex.: plataforma de aluguel de imóveis por temporada para nômades digitais e profissionais em mudança]
- **Domínio:** [ex.: vivanomads.com.br]
- **Cores da marca:** [primária, secundária/acento, fundo — ex.: use as do design system do repo; se não achar, extraia do CSS/tailwind.config]
- **Público/tom:** [ex.: profissional e acolhedor, PT-BR]

### Formato do vídeo
- **Vertical 9:16, 1080×1920 exato, 30fps, H.264 yuv420p** (Instagram Reels/Stories/WhatsApp)
- Estrutura: **card de abertura da marca → 4 a 7 telas do site real → card final com CTA** e domínio
- Telas do site aparecem **dentro de uma moldura de celular** (cantos arredondados + notch), com **scroll suave** (ease-in-out) percorrendo a página
- Cada cena tem: número do passo, título curto e subtítulo (legenda), + chip fixo com [REGRA/CLAIM PRINCIPAL — ex.: "reserva mínima 30 dias"]
- Barra de progresso dourada/da marca no rodapé
- Fades de 0,3s entre cenas

### Páginas a mostrar (nesta ordem)
1. [ex.: Home — headline principal]
2. [ex.: Busca de imóveis]
3. [ex.: Página de um imóvel]
4. [ex.: Como funciona]
5. [ex.: Preços/planos]
6. [ex.: Cadastro/reserva]

### Roteiro de narração
- Escreva um **roteiro de narração PT-BR** (~35–60s), 1 fala por cena (intro + cenas + outro), tom [TOM], e salve como `ROTEIRO_NARRACAO_VIDEO.md` no repo com: falas por cena, texto corrido para TTS e legenda sugerida para o post
- Eu vou gerar o áudio no ElevenLabs e te enviar o MP3 no chat

### Receita técnica (siga à risca — já validada)
1. **Dependências:** `pip install cairosvg pillow imageio imageio-ffmpeg numpy playwright`. NÃO rode `playwright install` — use o Chromium pré-instalado em `/opt/pw-browsers` (launch com `executable_path`, args `--no-sandbox --disable-dev-shm-usage`). O ffmpeg vem do `imageio_ffmpeg.get_ffmpeg_exe()`.
2. **Suba o app localmente** (estático: `python3 -m http.server`; Next/Vite: `npm install && npm run dev` ou `build && start`; aguarde o server responder 200).
3. **Capture screenshots mobile** com Playwright: viewport 412×900, `device_scale_factor=2`, `is_mobile=True`, `full_page=True`. **Bloqueie requests externos** (route: só `localhost` e `data:` passam) para não travar em fontes/APIs; aumente `wait_for_timeout` (~2s) para renderizar. Confira 1–2 screenshots visualmente (Read no PNG) antes de seguir.
4. **Monte o vídeo em Python** (cairosvg para overlays SVG→PNG + PIL para compor + imageio para encodar):
   - `imageio.get_writer(..., fps=30, codec="libx264", quality=8, macro_block_size=1, ffmpeg_params=["-pix_fmt","yuv420p"])` — `macro_block_size=1` é obrigatório para manter 1080×1920 exato
   - Moldura do celular: desenhe como **anel SVG com fill-rule evenodd** (interior transparente), screenshot colado por baixo com máscara PIL de cantos arredondados
   - Pan: `y = ease_io(t) * pan_max`, com `pan_max = min(altura-janela, duração*330px/s)`
   - Nos SVGs: **nunca use `&` cru** (escape ou reescreva), fontes `sans-serif`/`Georgia` (fallback do sistema; sem acentos se a fonte falhar — teste primeiro)
   - Cards de abertura/fechamento: gradiente radial escuro da marca, wordmark, fade-in com scale
5. **Sincronia com narração:** quando eu enviar o MP3, meça a duração via ffmpeg e **distribua a duração total entre as cenas proporcionalmente ao nº de caracteres da fala de cada cena** (deixe isso parametrizado no script). Mux: `-c:v copy -c:a aac -b:a 160k -shortest`. O vídeo deve ter EXATAMENTE a duração do áudio.
6. **Thumbnail:** crie uma capa 1080×1920 (foto forte do produto + botão play + headline + preço/claim + domínio) e **prefixe 1s dela como primeiros frames do vídeo**, atrasando o áudio 1s (`adelay=1000|1000`) — assim o vídeo parado mostra a capa. Entregue também a capa como PNG separado (Instagram pede capa manual).
7. **Iterações cirúrgicas:** se depois eu mudar 1 página do site, NÃO refaça o vídeo: recapture só a tela mudada, re-renderize só os frames daquela cena (mesma duração) e substitua-os no vídeo existente, remuxando o mesmo áudio.
8. **Entregas:** envie sempre via arquivo no chat (SendUserFile): o MP4 final, a capa PNG e o roteiro. Commite no repo apenas roteiro e (se eu pedir) os scripts de geração. Salve os scripts em local persistente se o ambiente permitir.

### Critérios de aceite
- 1080×1920 exato, 30fps, faixa de áudio AAC presente e em sincronia (verifique extraindo frames em 2–3 timestamps e conferindo com a fala esperada)
- Primeiro frame = thumbnail
- Telas legíveis (nada de texto cortado na moldura), acentos corretos nas telas capturadas
- Me mostre 2–3 frames extraídos para eu aprovar antes de finalizar

<!-- fim do prompt mestre -->

---

## 📋 Versão já preenchida — VIVA NOMADS

Quero que você crie um **flow video** profissional do meu produto, seguindo exatamente a receita do "Prompt Mestre — Flow Video" (arquivo `PROMPT_FLOW_VIDEO.md` do repo nomad-drive-brasil; se não tiver acesso, me peça que eu colo).

**O produto**
- **Nome:** Viva Nomads
- **O que é:** plataforma de aluguel de imóveis mobiliados por temporada (30+ dias) para nômades digitais, executivos em transferência e profissionais em mudança — com busca por cidade, imóveis verificados e fechamento 100% online
- **Domínio:** vivanomads.com.br
- **Repo:** danielrodovalho228-ship-it/Viva-Nomads-Oficial (Next.js + TypeScript; rode com `npm install && npm run dev`; use `.env.example` como guia — me peça as envs se o app não subir sem elas)
- **Cores da marca:** extraia do design system do repo (tailwind/globals.css e `public/brand/symbol.svg`)
- **Público/tom:** acolhedor e confiável, PT-BR

**Páginas a mostrar (nesta ordem)**
1. `/home` — headline + busca
2. `/buscar` — resultados com mapa
3. `/imoveis/[id]` — página de um imóvel (galeria, comodidades, workspace)
4. `/como-funciona` — passo a passo
5. `/precos` — planos/comissão
6. `/para-proprietarios` — CTA de cadastro de imóvel

**Chip fixo:** "Estadias de 30+ dias · imóveis verificados"

**Roteiro:** ~50s, 8 falas (intro + 6 cenas + outro). Ganchos: "seu lar temporário em qualquer cidade", "mobiliado, verificado e pronto pra trabalhar", "sem burocracia de imobiliária", fechamento "vivanomads.com.br — viva como local".

**Observações**
- Se alguma página exigir dados/seed, use a que renderizar melhor e me avise
- Dashboard NÃO entra no vídeo (só páginas públicas)
- Depois do vídeo mudo aprovado, eu envio o MP3 do ElevenLabs para a sincronização

---

## ⚠️ Notas de ambiente (aprendidas na prática)
- O container é efêmero: scripts em `/tmp` somem em reinício — o que importa persiste no repo
- `pgrep -f nome_do_script` dentro de um monitor encontra a si mesmo (loop infinito) — monitore pela existência do arquivo de saída
- Rede da sessão é restrita ao repo da sessão: para outro projeto, abra a sessão NO repositório dele
- WebFetch/ffprobe: o poster mjpeg embutido pode falhar com yuv444 — se a capa já é o 1º frame, o poster embutido é dispensável
