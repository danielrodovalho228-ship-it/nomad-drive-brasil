# 📸 Fotos dos perfis "Para Quem É" — Instruções

> Pasta: `images/perfis/`
> Cards no site: home (index.html) seção "Feito para profissionais em transição"

## ✅ O que você precisa salvar aqui

**4 fotos** com os nomes EXATOS abaixo (case-sensitive):

| Arquivo | Cliente | Sugestão visual |
|---|---|---|
| `executivo.jpg` | Executivos em transferência | Profissional de terno/blazer, pasta, ambiente corporativo ou aeroporto |
| `medico.jpg` | Médicos e profissionais de saúde | Jaleco branco, estetoscópio, hospital ou clínica, idade 30-45 |
| `familia.jpg` | Famílias em mudança | Família com bagagens, caixas de mudança, criança, carro de fundo |
| `nomade.jpg` | Nômades digitais e estudantes | Jovem 22-35 com laptop em café/coworking, ar moderno |

## 📐 Especificações técnicas

| Propriedade | Valor recomendado |
|---|---|
| **Aspect ratio** | **16:9** (paisagem) |
| **Dimensão** | **800×450 pixels** (mínimo) — até 1600×900 (máximo) |
| **Formato** | `.jpg` (preferido, mais leve) ou `.png` |
| **Tamanho do arquivo** | **80-200 KB** cada (otimize antes!) |
| **Cor predominante** | Tons neutros/terrosos combinam com a paleta verde floresta |

### ⚠ Se a foto for vertical (3:4 ou 9:16), use uma das ferramentas abaixo pra cortar pra 16:9:
- Online: https://www.iloveimg.com/crop-image
- Photoshop / Canva (export 800×450)

## 🌐 Onde achar fotos gratuitas

**Pexels** (recomendado — sem cadastro, royalty-free):

| Categoria | Busca sugerida no Pexels | Link direto |
|---|---|---|
| Executivo | `businessman office` ou `executive corporate` | [pexels.com/search/businessman](https://www.pexels.com/search/businessman/) |
| Médico | `doctor hospital` ou `medical professional` | [pexels.com/search/doctor](https://www.pexels.com/search/doctor/) |
| Família | `family moving boxes` ou `family travel car` | [pexels.com/search/family%20moving](https://www.pexels.com/search/family%20moving/) |
| Nômade | `young professional laptop cafe` | [pexels.com/search/digital%20nomad](https://www.pexels.com/search/digital%20nomad/) |

**Outros bancos gratuitos**:
- Pixabay: https://pixabay.com
- Unsplash: https://unsplash.com (cuidado, alguns têm restrição)
- Burst by Shopify: https://burst.shopify.com

## 🎯 Critérios de seleção (importante)

✅ **Diversidade racial** (não 4 fotos de pessoas brancas — Daniel pediu)
✅ **Idades variadas** (executivo 35-50, médico 30-45, família 30-40, nômade 22-35)
✅ **Sem rostos de modelos famosos** ou que sejam reconhecíveis no Brasil
✅ **Cenário brasileiro ou neutro** (não claramente americano/europeu)
✅ **Tons de cor similares** entre as 4 fotos (mesma temperatura/saturação)
❌ Sem texto/logo de outras marcas
❌ Sem watermark
❌ Sem AI-generated óbvio

## 🚀 Passo a passo pra publicar

1. **Baixe** as 4 fotos seguindo as buscas acima
2. **Renomeie** pra `executivo.jpg`, `medico.jpg`, `familia.jpg`, `nomade.jpg`
3. **(Opcional) Comprima** as imagens em https://tinypng.com pra ficar abaixo de 200KB cada
4. **Salve** todas em `images/perfis/` (essa pasta aqui)
5. **Commit + push**:
   ```bash
   git add images/perfis/
   git commit -m "fotos dos 4 perfis Para Quem E"
   git push
   ```
6. Em **~3 min** as fotos aparecem no site automaticamente (substituem o placeholder gradient)

## 📱 Como aparece no site

```
┌──────────────────────────────┐
│                              │
│      [FOTO 16:9]             │   ← seu banner aqui (450px altura)
│                              │
├──────────────────────────────┤
│ 30-90 DIAS · EXECUTIVO       │
│                              │
│ Executivos em transferência  │   ← Playfair grande
│                              │
│ Mudança de cidade, treina-   │
│ mento corporativo, projeto   │   ← descrição Inter
│ temporário em Uberlândia.    │
│                              │
│ Solicitar carro →            │   ← CTA
└──────────────────────────────┘
```

## 🔄 Atualização futura

Quando você tirar fotos profissionais reais (sócio operacional fotografando clientes com permissão), basta **substituir** os arquivos JPG com mesmo nome. Site atualiza automaticamente.

## 💡 Dica de placeholder

Enquanto você não tem as fotos, o card mostra um **fallback elegante** com:
- Fundo gradient (navy / sage / navy-light / gold conforme perfil)
- Título Playfair grande
- Aviso pra você do path correto

Não é o ideal, mas é honesto e profissional. **Adicione as fotos quando puder.**
