# Nomade Drive Brasil — MVP

Landing page bilíngue (EN/PT) para aluguel mensal de carro voltado a **viajantes do exterior** (de qualquer país) que vêm passar férias/um tempo no Brasil. Carro-piloto: **Chevrolet Cobalt Elite 2018, automático, branco** — em Uberlândia-MG.

Site estático (HTML/CSS/JS), sem backend. O formulário de orçamento abre o WhatsApp com os dados prontos para enviar.

---

## 1. Como rodar / ver

Abra o `index.html` no navegador, ou rode um servidor local:
```bash
python -m http.server 8000      # depois acesse http://localhost:8000
```

## 2. O que VOCÊ precisa editar antes de publicar

### a) Dados de contato — `script.js`, topo (`CONFIG`)
```js
const CONFIG = {
  whatsapp:  "5534999999999",            // número real, só dígitos (país+DDD+número)
  email:     "hello@nomadedrive.com.br",  // e-mail real
  instagram: "https://instagram.com/...",// link real do Instagram
  siteUrl:   "https://seusite.netlify.app", // depois de publicar, troque pela URL real do site
};
```

### b) Fotos — pasta `images/`
Coloque suas fotos reais com **estes nomes exatos**. Enquanto o arquivo não existir, aparece um placeholder.

**Carro (já adicionadas):** `hero.jpg`, `car-exterior.jpg`, `car-interior.jpg`, `car-trunk.jpg`, `travel.jpg`

**Sua foto (seção "Quem somos"):** `founder.jpg`

**Destinos / turismo em Uberlândia:**
`dest-parque-sabia.jpg` · `dest-centro.jpg` · `dest-mercado.jpg` · `dest-gastronomia.jpg` · `dest-vitoria-regia.jpg` · `dest-passeios.jpg`

### c) Depoimentos — `script.js`
Procure as chaves `testi.q1/n1/o1`, `testi.q2/...`, `testi.q3/...` (nas duas línguas, `en` e `pt`) e troque pelos comentários reais dos seus primeiros clientes.

### d) Preços
1 mês R$3.000 · 2 meses R$5.800 · 3+ meses sob medida. **Revise depois de rodar o simulador** (seção 4).

## 3. Publicar (grátis)
- **Mais fácil:** arraste a pasta `publicar/` no **app.netlify.com/drop**.
- **GitHub + Vercel:** o repositório git já está configurado — `git push` para o seu repo e importe no Vercel.
- Depois de publicar, atualize `CONFIG.siteUrl` e o `og:image` no `index.html` (troque o caminho relativo pela URL completa).

## 4. Simulador de Viabilidade Financeira
`Simulador_Viabilidade_Nomade Drive.xlsx` — planilha interativa: cada custo tem menu de opções (baixo/médio/alto), soma total, impostos, lucro e ponto de equilíbrio. Você preenche só as células amarelas. Valores são estimativas — valide com contador e corretor.

## 5. Imagens e arquivos gerados automaticamente
- `images/favicon.svg` — ícone do site (logo em formato de carro)
- `images/og-share.jpg` — imagem que aparece ao compartilhar o link no WhatsApp/redes
- `_build_simulador.py`, `_optimize_images.py`, `_blur_plates.py`, `_make_og_image.py` — scripts geradores. **Pode apagar todos** — não fazem falta pro site.

## 6. Estrutura
```
App NomadesDrive Brasil/
├── index.html      ├── style.css      ├── script.js
├── images/         (fotos do carro, destinos, favicon, og-share)
├── Imagens/        (suas fotos originais — não vão pro site)
├── publicar/       (cópia limpa só com os arquivos do site, p/ Netlify Drop)
├── Simulador_Viabilidade_Nomade Drive.xlsx
└── README.md
```

> Site informativo — não é oferta vinculante. Seguro para locação, CNPJ, contrato e impostos devem ser validados com profissionais antes de operar.
