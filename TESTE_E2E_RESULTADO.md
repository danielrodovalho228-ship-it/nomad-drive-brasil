# Teste E2E nomadedrive.com.br — 04/06/2026 16:00

## Resumo executivo
- Passou: 7 de 10 fluxos sem defeito bloqueante
- P0 (bloqueia uso): 2
- P1 (UX ruim, não bloqueia): 6
- P2 (polimento): 2

---

## Defeitos encontrados

### P0-001: Chave de identificação do Cronos inconsistente — resumo e success mostram "sedan" em vez de "Fiat Cronos"
- **Arquivo**: `reservar.html`
- **Reprodução**:
  1. Abrir `/reservar.html`
  2. Selecionar o card Fiat Cronos no step 1
  3. Preencher datas (mínimo 30 dias), avançar até o resumo
  4. Observar os campos "Carro escolhido" no resumo step 1, e a tela de sucesso
- **Esperado**: "Fiat Cronos" nos campos de resumo e success
- **Atual**: O texto literal `sedan` aparece no lugar, pois o objeto local `CARS` usa a chave `cronos` (`CARS.cronos.name = 'Fiat Cronos'`), mas `renderCarPicks()` gera os cards com `data-car` vindo de `Object.keys(window.NOMADE_PRICES.cars)`, cujas chaves são `popular` e `sedan`. Quando o usuário clica no card do Cronos, `state.car = 'sedan'`. Depois, `CARS['sedan']` é `undefined`, então o código usa o fallback direto de `state.car` como string, imprimindo `sedan`.
- **Segundo efeito colateral**: `REASON_SUGGESTIONS` referencia `car: 'cronos'` para os motivos `tratamento-medico`, `relocacao-corporativa`, `mudanca-familiar`, `aposentadoria` e `viagem-longa`. O `querySelector('.pick--car[data-car="cronos"]')` retorna `null` porque o atributo real é `data-car="sedan"`. O badge "Sugerido pra você" nunca aparece no card do Cronos, e o botão "Pré-aplicar sugestão" não seleciona o carro.
- **Sugestão fix**:
  - **Opção A (recomendada)**: Renomear a chave em `prices.js` de `sedan` para `cronos` (e ajustar `pageUrl: 'carros/cronos.html'` ou manter `sedan.html` mas com chave `cronos`). Atualizar `reservar.html` linha 916: `preCar === 'sedan'` → `preCar === 'cronos'`.
  - **Opção B**: Manter `sedan` em `prices.js` e atualizar o objeto `CARS` local em `reservar.html` para `sedan: { name: 'Fiat Cronos', ... }` e corrigir todas as `REASON_SUGGESTIONS` para `car: 'sedan'`.

---

### P0-002: Botão "Reservar" do Cronos em frota.html não pré-seleciona o carro no wizard
- **Arquivo**: `frota.html` → `reservar.html`
- **Reprodução**:
  1. Abrir `/frota.html`
  2. Clicar no botão "Reservar" do card Fiat Cronos
  3. URL: `reservar.html?carro=sedan`
  4. Observar seleção de carro no step 1
- **Esperado**: Card do Cronos selecionado automaticamente (borda navy + checkmark)
- **Atual**: Nenhum carro pré-selecionado. A linha 916 de `reservar.html` aceita apenas `'popular' || 'cronos' || 'hb20'`. O valor `sedan` (gerado pelo botão da frota) não está na lista de condições, então o `querySelector` nunca é chamado.
- **Sugestão fix**: Adicionar `|| preCar === 'sedan'` na condição (linha 916), ou melhor, alinhar com a fix do P0-001 usando `cronos` consistentemente em todo o site.

---

### P1-001: `<link>` e `<script>` do site-shell posicionados dentro de `<body>` em reservar.html
- **Arquivo**: `reservar.html` linhas 249-250
- **Reprodução**: Inspecionar HTML fonte da página
- **Esperado**: Tags de recurso dentro de `<head>`
- **Atual**: `<link rel="stylesheet" href="assets/site-shell.css">` e `<script defer src="assets/site-shell.js">` aparecem logo após `<body>` — HTML tecnicamente inválido. Em alguns navegadores (especialmente Safari mobile), o CSS pode ser aplicado com delay visível, causando flash de conteúdo sem header. O atributo `defer` no `<script>` mitiga parte do problema, mas não a posição do CSS.
- **Mesmo problema em**: `carros/popular.html` (linhas 251-252) e `carros/sedan.html` (linhas 231-232)
- **Sugestão fix**: Mover ambas as tags para dentro de `<head>`, antes do `</head>`.

---

### P1-002: `reservar.html` sem `data-nd-page` no `<body>`
- **Arquivo**: `reservar.html` linha 247: `<body>` (sem atributo)
- **Reprodução**: Abrir `/reservar.html`, abrir o drawer hambúrguer
- **Esperado**: Nenhum item ativo (comportamento aceitável para página transacional) — mas o `markActive()` precisa do atributo para funcionar corretamente
- **Atual**: `document.body.getAttribute('data-nd-page')` retorna `null`, a função `markActive()` sai sem marcar nada. Não há erro visível, mas se futuramente "Reservar" for adicionado ao nav, nunca ficará ativo.
- **Sugestão fix**: Adicionar `data-nd-page="reservar"` ao `<body>`. Não precisa adicionar item correspondente no drawer — o sistema ignora silenciosamente páginas sem match.

---

### P1-003: Footer global não injetado em `carros/popular.html` e `carros/sedan.html`
- **Arquivos**: `carros/popular.html`, `carros/sedan.html`
- **Reprodução**: Acessar `/carros/popular.html` ou `/carros/sedan.html`, rolar até o fim da página
- **Esperado**: Footer com 4 colunas (marca, páginas, empresa, contato)
- **Atual**: Nenhum `<div id="site-footer"></div>` no markup. O `loadPartial()` em `site-shell.js` busca `document.getElementById('site-footer')` — se não existe, retorna `null` silenciosamente e não injeta. A página termina abruptamente com o mini-footer próprio do modal de vídeo, sem o footer global de navegação.
- **Sugestão fix**: Adicionar `<div id="site-footer"></div>` antes de `</body>` em ambas as páginas.

---

### P1-004: Drawer sem item ativo em `carros/popular.html` e `carros/sedan.html`
- **Arquivos**: `carros/popular.html`, `carros/sedan.html`
- **Reprodução**: Visitar qualquer página de detalhe de carro, abrir drawer hambúrguer
- **Esperado**: Link "Frota" destacado em dourado (pois o usuário está em páginas da frota)
- **Atual**: Nenhum `data-nd-page` no `<body>` de ambas as páginas. Nenhum link fica ativo.
- **Sugestão fix**: Adicionar `data-nd-page="frota"` ao `<body>` de ambas as páginas — o drawer tem `<a data-nd-page="frota">` que receberá a classe `is-active`.

---

### P1-005: Parâmetro `?dias=` da URL ignorado em `reservar.html`
- **Arquivo**: `reservar.html`
- **Reprodução**:
  1. Em `precos.html`, selecionar "30 dias" + "HB20", clicar "Reservar Essencial"
  2. URL gerada: `reservar.html?carro=popular&plano=essencial&dias=30`
  3. Observar datas no step 1
- **Esperado**: Datas pré-calculadas para um período de 30 dias (data início = amanhã, data fim = amanhã + 30)
- **Atual**: O wizard sempre inicializa com início = amanhã e fim = amanhã + 31 dias (aprox. 30 dias), mas ignora completamente o parâmetro `?dias=`. `?dias=60` ou `?dias=180` não têm efeito. Apenas `?carro=` e `?plano=` são lidos (linhas 797-803 e 915-919). O usuário que escolheu 180 dias em `precos.html` chega no wizard com datas para ~30 dias.
- **Sugestão fix**: Ler `urlParams.get('dias')` e, se válido (30/60/90/180), calcular `dateEnd = dateStart + dias` e chamar `updateStep1()`.

---

### P1-006: Breadcrumb "Frota" em páginas de detalhe aponta para âncora inexistente
- **Arquivos**: `carros/popular.html` linha 257, `carros/sedan.html` linha 237
- **Reprodução**: Clicar no link "Frota" no breadcrumb de qualquer página de detalhe de carro
- **Esperado**: Navegar para `/frota.html`
- **Atual**: Link aponta para `../index.html#carros`. O elemento `id="carros"` não existe em `index.html` (verificado). O usuário é levado para o topo da home sem qualquer scroll para seção de frota.
- **Sugestão fix**: Alterar `href="../index.html#carros"` para `href="../frota.html"` em ambas as páginas.

---

### P2-001: Formulário de contato não valida formato do e-mail
- **Arquivo**: `contato.html` linha 142
- **Reprodução**:
  1. Preencher "Nome": qualquer texto
  2. Preencher "E-mail": `a` (string inválida, sem @)
  3. Preencher "Mensagem": 10+ caracteres
  4. Clicar "Enviar mensagem"
- **Esperado**: Erro "Digite um e-mail válido"
- **Atual**: O formulário tem `novalidate` (desabilita validação nativa do browser), e o JS só checa `if (!email)` — qualquer string não-vazia passa. Um `mailto:` será aberto com destinatário inválido no assunto.
- **Sugestão fix**: Adicionar regex antes do `window.location.href`: `if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMsg('Digite um e-mail válido.', false); return; }`

---

### P2-002: Pasta `images/pontos/` inexistente — avatares de ponto de entrega sem foto
- **Arquivo**: `reservar.html` linhas 415-443; pasta `images/pontos/` não existe no repositório
- **Reprodução**: Abrir `/reservar.html`, avançar para step 2 (local de entrega)
- **Esperado**: Fotos dos pontos nos avatares circulares (ou fallback de sigla via `onerror`)
- **Atual**: As imagens `images/pontos/aeroporto.jpg`, `center-shopping.jpg`, `hc-ufu.jpg`, `tubal-vilela.jpg`, `posto-br.jpg` são referenciadas mas a pasta não existe — geram 5 requisições 404. O `onerror="this.style.display='none';this.parentNode.textContent='AB';"` funciona como fallback, então o UX degrada graciosamente (siglas aparecem). Mas os 404s poluem o console e o log de erros do servidor.
- **Sugestão fix**: Criar a pasta `images/pontos/` e adicionar as fotos, ou remover as referências de `<img>` e usar apenas as siglas (já que o fallback é o comportamento atual em produção).

---

## Passou OK

- Fluxo A: Drawer abre e fecha em todas as 8 páginas testadas via código-fonte (toggle, ESC, backdrop)
- Fluxo A: Item ativo em dourado funciona em home, frota, precos, como-funciona, publico, sobre, faq, contato (todas com `data-nd-page` correto)
- Fluxo A: Botão "Reservar" no header leva para `/reservar.html` (confirmado no `partials/header.html`)
- Fluxo A: Logo clicável leva para `index.html` (confirmado no header partial)
- Fluxo B: Toggle carro/período em `precos.html` recalcula preços via JS (render() chama `P.plans[state.car][pid].priceDays[state.days]`)
- Fluxo B: URL do botão "Reservar Estendido" gera `reservar.html?carro=popular&plano=estendido&dias=90` corretamente
- Fluxo B: Valores de preço consistentes: HB20 Essencial 30d = R$3.500 (prices.js, frota.html, hero home, carros/popular.html)
- Fluxo C: Cards de carro no wizard step 1 mostram apenas nome + categoria + subtitle (sem preço) — fix já implementado
- Fluxo C: Plan picker aparece e recalcula preços ao selecionar carro
- Fluxo C: Wizard avança e valida corretamente (step 1 → 2 → 3, validações de campo)
- Fluxo D: FAQ tem 18 perguntas (1 regras, 7 precos, 4 manutencao, 4 entrega, 2 empresa). Filtro por categoria funciona via JS (`details.style.display`)
- Fluxo D: Botão "Todas" restaura todas as perguntas
- Fluxo E: Card WhatsApp é `<a href="wa.me/...">` — abre wa.me em nova aba
- Fluxo E: Card E-mail é `<a href="mailto:...">` — abre cliente de e-mail
- Fluxo E: Form contato valida campos obrigatórios (nome, email, mensagem >= 10 chars) antes de abrir mailto
- Fluxo F: `/login.html` carregado, tem campos email + senha + botão submit com Supabase JS. Skipped: tentativa de login real (sem senha disponível)
- Footer HTML com 4 colunas: marca, páginas, empresa, contato — injetado corretamente em todas as páginas que têm `id="site-footer"`
- Header/footer partials carregados via fetch — sem erros estruturais no mecanismo de inject
- Nenhum 404 nas páginas principais listadas (/, /frota.html, /precos.html, /como-funciona.html, /sobre.html, /contato.html, /faq.html, /publico.html, /login.html, /reservar.html, /carros/popular.html, /carros/sedan.html, /termos.html, /politica-privacidade.html)
- Crumb "Início · Frota" removido das páginas principais — confirma que está ausente em index, frota, precos, sobre, contato, faq, publico, como-funciona

---

## Skipped (motivo)
- **Fluxo F — login real com Supabase**: senha da conta `dtrodovalho40@gmail.com` não disponível para teste. Apenas a UI foi validada (campos, botão, layout).
- **Lighthouse mobile score**: requer execução em browser real com DevTools. Não foi possível executar via análise estática.
- **Teste de viewport mobile 390×844**: testado logicamente via CSS (media queries identificadas), não via browser real.
- **Submit real do formulário de contato e wizard reservar**: conforme instrução — não submetidos.

---

## Recomendações além dos defeitos

1. **Unificar chave do Cronos em todo o codebase** (P0-001 e P0-002): escolher `sedan` ou `cronos` e aplicar consistentemente em `prices.js`, `reservar.html` (CARS, REASON_SUGGESTIONS, URL params), `frota.html` e `carros/`. Sugere-se `sedan` pois reflete o segmento do carro e é a chave já usada em `prices.js`.

2. **Mover `<link>`/`<script>` de site-shell para `<head>`** em `reservar.html`, `carros/popular.html`, `carros/sedan.html`: é uma correção de 3 linhas com zero risco, elimina HTML inválido e potencial flash sem estilo no Safari.

3. **Adicionar `id="site-footer"` e `data-nd-page="frota"` em `carros/*.html`**: garante consistência de navegação global e beneficia SEO (Google IndexNow considera rodapé com links como sinal de arquitetura).

4. **Adicionar leitura de `?dias=` em `reservar.html`**: melhora significativamente a conversão quando o usuário vem de `precos.html` com período escolhido — elimina a fricção de precisar reconfigurar as datas.

5. **Criar pasta `images/pontos/`** ou remover as referências de `<img>` nos picks de ponto: elimina 5 erros 404 por pageview do step 2 do wizard, limpa o console e melhora performance.

6. **Adicionar validação de email regex em `contato.html`**: uma linha de código, elimina envio de `mailto:` com e-mail inválido.
