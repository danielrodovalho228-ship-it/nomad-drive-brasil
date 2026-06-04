# 🎬 Fotos "Como Funciona" — 5 etapas

> Pasta: `images/como-funciona/`
> Cards: home (index.html) seção "Como funciona"

## ✅ 5 fotos que você precisa salvar

| Arquivo | Etapa | Sugestão visual (foto que CONDIZ) |
|---|---|---|
| `1-escolha.jpg` | Escolha pelo site | **Screenshot do nosso catálogo** (carros/popular.html) OU mockup celular mostrando o site |
| `2-whatsapp.jpg` | Solicite pelo WhatsApp | **Print de tela de conversa WhatsApp** (mockup), OU pessoa segurando celular com WhatsApp aberto |
| `3-contrato.jpg` | Contrato + pagamento | **Tela do Autentique mobile** (pesquisar print), OU mão segurando celular com contrato |
| `4-entrega.jpg` | Entrega onde estiver | **Sócio entregando chave de carro** (Bombonato/hotel), OU foto de entrega de chave genérica |
| `5-uso.jpg` | Use sem stress | **Pessoa dirigindo (vista de costas)** OU interior do carro em movimento OU paisagem pela janela |

## 📐 Specs

| Propriedade | Valor |
|---|---|
| **Aspect ratio** | **16:10** (mais largo que alto) |
| **Dimensão** | **800×500 pixels** ideal |
| **Formato** | `.jpg` (preferido) ou `.png` |
| **Tamanho** | até 150 KB cada (comprima em https://tinypng.com) |

## 🌐 Onde achar (gratuito)

### Etapa 1 — Catálogo / site no celular
- **Solução pessoal**: tira print do nosso próprio site (`nomadedrive.com.br/carros/popular.html`) em modo mobile (DevTools F12 → ícone do celular)
- **Pexels**: [pexels.com/search/website%20mockup%20phone](https://www.pexels.com/search/website%20mockup%20phone/)

### Etapa 2 — WhatsApp business / atendimento
- **Pexels**: [pexels.com/search/whatsapp](https://www.pexels.com/search/whatsapp/) ou "person texting phone"
- **Solução pessoal**: print de uma conversa real seu com cliente (com permissão)

### Etapa 3 — Assinatura digital
- **Pexels**: [pexels.com/search/digital%20signature](https://www.pexels.com/search/digital%20signature/) ou "phone contract"
- **Mockup**: tela do Autentique no celular (próprio site do Autentique tem)

### Etapa 4 — Entrega de carro
- **Pexels**: [pexels.com/search/car%20key%20delivery](https://www.pexels.com/search/car%20key%20delivery/)
- **Solução pessoal**: você ou Danilo entregando chave de carro real (foto encenada)

### Etapa 5 — Pessoa dirigindo
- **Pexels**: [pexels.com/search/driving%20car](https://www.pexels.com/search/driving%20car/) ou "road trip Brazil"

## 🚀 Como publicar

1. Baixa as 5 fotos
2. Renomeia pros nomes EXATOS: `1-escolha.jpg`, `2-whatsapp.jpg`, `3-contrato.jpg`, `4-entrega.jpg`, `5-uso.jpg`
3. Comprime em https://tinypng.com (deixa abaixo de 150 KB cada)
4. Salva em `images/como-funciona/`
5. Commit:
   ```bash
   git add images/como-funciona/
   git commit -m "fotos das 5 etapas Como Funciona"
   git push
   ```
6. ~3 min depois aparecem no site automaticamente

## 🎨 Como fica no site (visual COMPACTO)

5 cards lado a lado (1 linha desktop, 2 colunas mobile):

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ [📷] │ │ [📷] │ │ [📷] │ │ [📷] │ │ [📷] │  ← thumb 16:10
├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤
│ Esc. │ │ Whts │ │ Cont.│ │ Entr.│ │ Uso  │  ← título curto
│ pelo │ │ App  │ │ +pag │ │ 24h  │ │ 24/7 │  ← desc 1 linha
│ site │ │      │ │      │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

Cada card tem ~200px de altura total. Bem mais compacto que o anterior.

## 💡 Sem foto = placeholder honesto

Enquanto não tem foto, mostra fundo gradient navy com número grande + "foto em breve".
