# 🎨 UI/UX Guidelines — Nomade Drive Brasil

> **Sistema de design moderno aplicado a Vanilla JS + CSS puro**
> Inspirado em: Framer Motion (animação), shadcn/ui (componentes), Tailwind (tokens), Linear.app (motion design)

---

## 📦 Arquivos do sistema

| Arquivo | Conteúdo | Quando usar |
|---|---|---|
| `design-tokens.css` | Cores, spacing, tipografia, sombras, motion curves | **Sempre carregado** (base do sistema) |
| `style.css` | Estilos legados existentes | Mantém compatibilidade |
| `style-animations.css` | 30+ animações Framer-style | Animar entradas, hover, scroll |
| `style-components-modern.css` | Cards, botões, badges modernos | Quando criar novos componentes |
| `fm-reveal.js` | Scroll-triggered animations + counters | Animações que entram com scroll |

### Ordem de carregamento (no `<head>`)
```html
<link rel="stylesheet" href="design-tokens.css" />
<link rel="stylesheet" href="style.css" />
<link rel="stylesheet" href="style-animations.css" />
<link rel="stylesheet" href="style-components-modern.css" />
```

E o JS antes de `</body>`:
```html
<script src="fm-reveal.js" defer></script>
```

---

## 🎬 1. ANIMAÇÕES (Framer Motion-inspired)

### Entrada imediata (no load)
```html
<!-- Aparece com fade-in suave -->
<div class="fm-fade-in">Olá</div>

<!-- Com delay -->
<h1 class="fm-slide-up" style="--fm-delay: 200ms;">Título</h1>

<!-- Blur in (estiloso pra hero) -->
<h1 class="fm-blur-in">Título com blur</h1>

<!-- Pop in (bouncy — pra botões/badges) -->
<span class="badge fm-pop-in">NOVO</span>
```

### Stagger (cascata — pra listas)
```html
<!-- Filhos aparecem com delay incremental (80ms cada) -->
<ul class="fm-stagger">
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>

<!-- Versão mais lenta (150ms cada) pra seções principais -->
<div class="fm-stagger-slow">
  <h2>Título</h2>
  <p>Subtítulo</p>
  <button>CTA</button>
</div>
```

### Scroll-triggered (entra quando scrolla)
```html
<!-- Default: slide-up + fade -->
<div data-fm-reveal>Aparece ao rolar</div>

<!-- Variantes -->
<div data-fm-reveal="slide-left">Vem da direita</div>
<div data-fm-reveal="slide-right">Vem da esquerda</div>
<div data-fm-reveal="scale">Cresce de 90% pra 100%</div>
<div data-fm-reveal="blur">Desfoca pra focado</div>

<!-- Com delay -->
<div data-fm-reveal data-fm-delay="200">Espera 200ms</div>
```

### Hover interactions
```html
<!-- Card sobe 4px no hover + sombra maior -->
<div class="card fm-hover-lift">Card</div>

<!-- Cresce 3% (botões/imagens) -->
<img class="fm-hover-scale" src="..." />

<!-- Glow verde no hover (CTAs principais) -->
<button class="btn fm-hover-glow">Comprar</button>

<!-- Tilt 3D (premium feel) -->
<div class="card fm-hover-tilt">Card 3D</div>

<!-- Underline animado (links) -->
<a class="fm-hover-underline" href="#">Saiba mais</a>
```

### Loops contínuos
```html
<!-- Botão CTA que "pulsa" pra chamar atenção -->
<button class="btn fm-pulse">URGENTE</button>

<!-- Card "respirando" -->
<div class="card fm-float">Flutua</div>

<!-- Loading skeleton -->
<div class="fm-skeleton" style="height: 20px; width: 200px;"></div>

<!-- Loading spinner -->
<div class="fm-spin">⚙️</div>

<!-- Marquee infinito (banner promo) -->
<div class="fm-marquee">
  <span>PROMOÇÃO</span><span>PROMOÇÃO</span><span>PROMOÇÃO</span>
</div>
```

### One-off animations
```html
<!-- Treme quando erro de validação -->
<input class="fm-shake" />

<!-- Pula quando sucesso -->
<div class="fm-bounce">✅</div>

<!-- Wiggle quando emoji animado -->
<span class="fm-wiggle">👋</span>
```

### Counter animado (anima 0 → valor)
```html
<!-- Anima de 0 até 500 em 1.5s quando scrolla -->
<strong data-fm-counter="500">0</strong>

<!-- Duração custom -->
<strong data-fm-counter="1000" data-fm-counter-duration="2500">0</strong>
```

---

## 🎨 2. DESIGN TOKENS (variáveis CSS)

### Cores
```css
/* Brand verde */
color: var(--color-brand-500);     /* #145f3e (primary) */
background: var(--color-brand-100); /* claro */
border: var(--color-brand-700);    /* escuro */

/* Gold */
color: var(--color-accent-500);    /* #d4af37 */

/* Neutros */
color: var(--color-gray-700);

/* Status */
color: var(--color-success);  /* #10b981 */
color: var(--color-warning);  /* #f59e0b */
color: var(--color-error);    /* #ef4444 */
```

### Spacing (escala 4px)
```css
padding: var(--space-4);   /* 16px */
margin: var(--space-8);    /* 32px */
gap: var(--space-2);       /* 8px */
```

### Tipografia
```css
font-family: var(--font-display);  /* Sora */
font-family: var(--font-body);     /* Inter */
font-size: var(--text-lg);         /* 17px */
font-size: var(--text-3xl);        /* 30px */
line-height: var(--leading-tight); /* 1.2 */
letter-spacing: var(--tracking-tight); /* -0.02em */
```

### Sombras (elevação)
```css
box-shadow: var(--shadow-sm);   /* sutil */
box-shadow: var(--shadow-lg);   /* destaque */
box-shadow: var(--shadow-xl);   /* hover modal */
box-shadow: var(--shadow-brand); /* verde glow */
```

### Border radius
```css
border-radius: var(--radius-md);   /* 8px */
border-radius: var(--radius-2xl);  /* 20px */
border-radius: var(--radius-full); /* círculo */
```

### Motion curves
```css
transition: all var(--duration-normal) var(--ease-spring);
/* duration-fast = 150ms, normal = 250ms, slow = 400ms */
/* ease-spring é bouncy/natural (recomendado pra UI moderna) */
```

---

## 🧩 3. COMPONENTES MODERNOS (21st.dev-inspired)

### Glass card (efeito vidro)
```html
<div class="glass-card">
  <h3>Card com fundo translúcido + blur</h3>
</div>
```

### Bento grid (estilo iOS)
```html
<div class="bento-grid">
  <div class="bento-card">Item normal</div>
  <div class="bento-card bento-card--wide">Largo (2 cols)</div>
  <div class="bento-card bento-card--big">Big (2x2)</div>
  <div class="bento-card bento-card--accent">Verde destacado</div>
  <div class="bento-card bento-card--gold">Dourado</div>
</div>
```

### Stat cards
```html
<div class="stat-card">
  <div class="stat-card__value">R$ 12.450</div>
  <div class="stat-card__label">Receita do mês</div>
  <span class="stat-card__delta stat-card__delta--up">↑ 12%</span>
</div>
```

### Modern buttons
```html
<!-- Primary (gradient) -->
<button class="btn-modern btn-modern--primary">
  Começar agora <span class="btn-modern__arrow">→</span>
</button>

<!-- Outline com fill animation -->
<button class="btn-modern btn-modern--outline">Saber mais</button>

<!-- Ghost (sutil) -->
<button class="btn-modern btn-modern--ghost">Cancelar</button>

<!-- Tamanhos -->
<button class="btn-modern btn-modern--primary btn-modern--lg">Grande</button>
<button class="btn-modern btn-modern--outline btn-modern--sm">Pequeno</button>
```

### Testimonial cards
```html
<div class="testimonial-card">
  <p class="testimonial-card__quote">Atendimento excelente, sem burocracia.</p>
  <div class="testimonial-card__author">
    <div class="testimonial-card__avatar">JS</div>
    <div>
      <div class="testimonial-card__name">João Silva</div>
      <div class="testimonial-card__title">Cliente Gold</div>
      <div class="testimonial-card__rating">⭐⭐⭐⭐⭐</div>
    </div>
  </div>
</div>
```

### Pricing tiers
```html
<div class="grid-3">
  <div class="pricing-tier">
    <h3>Básico</h3>
    <p>R$ 1.400/mês</p>
  </div>
  <div class="pricing-tier pricing-tier--featured">
    <h3>Confort</h3>
    <p>R$ 2.500/mês</p>
  </div>
  <div class="pricing-tier">
    <h3>Premium</h3>
    <p>R$ 4.500/mês</p>
  </div>
</div>
```

### Badges modernos
```html
<span class="badge-modern badge-modern--brand">Verde</span>
<span class="badge-modern badge-modern--accent">Gold</span>
<span class="badge-modern badge-modern--success">Aprovado</span>
<span class="badge-modern badge-modern--warning">Pendente</span>
<span class="badge-modern badge-modern--error">Erro</span>

<!-- Com dot pulsante (status ao vivo) -->
<span class="badge-modern badge-modern--success">
  <span class="badge-modern__dot"></span>
  Online
</span>
```

### Section header moderno
```html
<div class="section-header-modern" data-fm-reveal>
  <span class="section-header-modern__eyebrow">SEÇÃO</span>
  <h2 class="section-header-modern__title">
    Título com palavra <em>destacada</em> em gradient
  </h2>
  <p class="section-header-modern__sub">Subtítulo descritivo aqui.</p>
</div>
```

### Logo marquee (prova social)
```html
<div class="logo-marquee">
  <div class="logo-marquee__track">
    <div class="logo-marquee__item">Logo 1</div>
    <div class="logo-marquee__item">Logo 2</div>
    <!-- duplicar pra loop contínuo -->
    <div class="logo-marquee__item">Logo 1</div>
    <div class="logo-marquee__item">Logo 2</div>
  </div>
</div>
```

### Gradient mesh background (estilo Vercel)
```html
<section class="gradient-mesh-bg">
  Conteúdo com fundo gradient sutil
</section>

<section class="gradient-mesh-bg--dark">
  Versão dark mode
</section>
```

---

## 🚀 4. PADRÕES DE COMPOSIÇÃO

### Hero moderno
```html
<section class="hero gradient-mesh-bg">
  <div class="container fm-stagger-slow">
    <span class="badge-modern badge-modern--brand fm-pop-in">PRÉ-LANÇAMENTO</span>
    <h1 class="fm-blur-in">Headline poderoso <em>destaque gradient</em></h1>
    <p class="fm-slide-up">Subtítulo claro</p>
    <div class="fm-slide-up">
      <button class="btn-modern btn-modern--primary btn-modern--lg fm-hover-glow">
        CTA principal <span class="btn-modern__arrow">→</span>
      </button>
      <button class="btn-modern btn-modern--outline btn-modern--lg">CTA secundário</button>
    </div>
  </div>
</section>
```

### Seção de features (bento grid)
```html
<section class="section">
  <div class="container">
    <div class="section-header-modern" data-fm-reveal>
      <span class="section-header-modern__eyebrow">FEATURES</span>
      <h2 class="section-header-modern__title">Tudo que <em>você precisa</em></h2>
    </div>
    <div class="bento-grid fm-stagger" data-fm-reveal>
      <div class="bento-card bento-card--big">Feature destaque</div>
      <div class="bento-card">Feature 2</div>
      <div class="bento-card">Feature 3</div>
      <div class="bento-card bento-card--wide">Feature longa</div>
      <div class="bento-card bento-card--accent">CTA</div>
    </div>
  </div>
</section>
```

### Seção de stats com counters
```html
<section class="section gradient-mesh-bg" data-fm-reveal>
  <div class="container grid-4">
    <div class="stat-card">
      <div class="stat-card__value counter-modern" data-fm-counter="500">0</div>
      <div class="stat-card__label">Locações</div>
    </div>
    <!-- 3 mais... -->
  </div>
</section>
```

---

## ⚡ 5. PERFORMANCE & ACESSIBILIDADE

### Performance
- ✅ Animações usam `transform` + `opacity` (GPU-accelerated)
- ✅ `IntersectionObserver` é leve (não polling)
- ✅ CSS variables ao invés de duplicação
- ✅ Sem dependências externas (Framer Motion não foi adicionado)

### Acessibilidade
- ✅ `prefers-reduced-motion` automaticamente desliga animações
- ✅ Cores têm contraste WCAG AA mínimo
- ✅ Focus states preservados
- ✅ Animações não causam epilepsia (sem flashes >3x/s)

---

## 🎯 6. ANTI-PATTERNS (evite)

❌ **NÃO faça:**
- `animation-duration: 5s` (muito lento, frustra)
- `transition: all 5s` (vaga e lenta)
- Animar `height`, `width`, `top`, `left` (causa reflow — use transform!)
- Animar tudo (poluição visual)
- Esquecer `prefers-reduced-motion`

✅ **FAÇA:**
- Use animações entre 150-600ms (sweet spot)
- `transition: var(--transition-spring)` (curva natural)
- Anime `transform` + `opacity` apenas
- Foque animação no que IMPORTA (CTAs, headers, novos elementos)
- Sempre teste com motion reduzido ligado

---

## 🌱 7. QUANDO MIGRAR PRA REACT + REAL FRAMER MOTION

Esse sistema cobre 90% dos casos. Considere migração pra React + Framer Motion real quando:
- Precisar de **drag interactions** complexas
- Precisar de **shared layout transitions** (entre páginas)
- Precisar de **spring physics dinâmica** (interativa)
- Time crescer e precisar de TypeScript + componentes reutilizáveis

Por enquanto, **vanilla está ótimo** pra MVP.

---

## 📚 Recursos pra aprender mais

- **Framer Motion (real):** https://www.framer.com/motion/
- **21st.dev (componentes React):** https://21st.dev/
- **shadcn/ui (referência de componentes):** https://ui.shadcn.com/
- **Linear.app design:** https://linear.app/ (inspiração de motion)
- **Easings.net:** https://easings.net/ (visualizador de curves)
