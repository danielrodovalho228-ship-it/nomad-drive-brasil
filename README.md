# NomadDrive Brasil — MVP

Landing page bilíngue (EN/PT) para aluguel mensal de carro voltado a americanos/expats que vêm ao Brasil. Carro-piloto: **Chevrolet Cobalt Elite 2018, automático, branco** — em Uberlândia-MG.

Site estático (HTML/CSS/JS), sem backend. O formulário de orçamento abre o WhatsApp com os dados prontos para enviar.

---

## 1. Como rodar / ver

Não precisa de build. Abra o `index.html` no navegador, ou rode um servidor local:

```bash
python -m http.server 8000      # depois acesse http://localhost:8000
```

## 2. O que VOCÊ precisa editar antes de publicar

### a) Dados de contato — `script.js`, topo (`CONFIG`)
```js
const CONFIG = {
  whatsapp:  "5534999999999",            // número real, só dígitos (país+DDD+número)
  email:     "hello@nomaddrive.com.br",  // e-mail real
  instagram: "https://instagram.com/...",// link real do Instagram que você já criou
};
```

### b) Fotos do carro — pasta `images/`
O site tem 5 espaços de foto já ligados a arquivos. Coloque suas fotos reais do **Cobalt branco** na pasta `images/` com estes nomes exatos:
- `images/hero.jpg` — melhor foto externa (aparece no topo)
- `images/car-exterior.jpg` — foto externa (seção "O carro")
- `images/car-interior.jpg` — interior
- `images/car-trunk.jpg` — porta-malas / espaço
- `images/travel.jpg` — foto de estilo de vida / estrada

Enquanto o arquivo não existir, aparece um placeholder com o nome do arquivo. Assim que você adicionar a foto com o nome certo, ela aparece sozinha. Fotos reais do carro convertem muito mais que banco de imagens.

### c) Preços
Valores atuais no site: 1 mês R$3.000 · 2 meses R$5.800 · 3+ meses sob medida.
**Revise depois de rodar o `Simulador_Viabilidade_NomadDrive.xlsx`** (veja a seção 4) — o preço final tem que cobrir todos os custos com margem.

## 3. Publicar (grátis)
Arraste a pasta para o **Netlify Drop** (app.netlify.com/drop) ou conecte ao **Vercel**. Depois aponte o domínio.

---

## 4. Simulador de Viabilidade Financeira

`Simulador_Viabilidade_NomadDrive.xlsx` — planilha interativa para testar se o negócio cobre os custos.

- Cada item de custo tem um **menu de opções** (baixo / médio / alto) — você escolhe o que bate com a sua realidade.
- Você só preenche as **células amarelas** (suas premissas).
- A planilha soma tudo automaticamente: receita, impostos, custos fixos e variáveis, lucro, margem e ponto de equilíbrio.
- Todos os números são **estimativas de mercado para você validar** com contador e corretor — não são valores oficiais.

---

## 5. Resumo estratégico

**Fase 1 — Piloto:** validar com 1 carro, só por indicação. Resolver antes da 1ª locação: seguro que cobre locação, contrato, caução, rastreador, conferência de CNH/passaporte, vistoria com fotos.
**Fase 2 — Operação enxuta:** CNPJ adequado (locação **não cabe no MEI**), contador, processos padronizados.
**Fase 3 — Rede por indicação:** com 1 carro o teto é baixo; o modelo escalável é virar a ponte de confiança entre donos de carro e locatários verificados, cobrando comissão.

> Site informativo — não é oferta vinculante. As partes jurídica, fiscal e de seguro devem ser validadas com profissionais antes de operar.

## 6. Arquivos
```
App NomadesDrive Brasil/
├── index.html                              # estrutura e conteúdo
├── style.css                               # design (tema escuro, verde/âmbar)
├── script.js                               # idioma EN/PT, formulário→WhatsApp, CONFIG
├── images/                                 # suas fotos reais do Cobalt branco
├── Simulador_Viabilidade_NomadDrive.xlsx   # simulador de custos e viabilidade
└── README.md                               # este arquivo
```
