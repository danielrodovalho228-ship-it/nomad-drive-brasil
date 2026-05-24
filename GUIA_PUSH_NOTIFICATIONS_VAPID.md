# 🔔 Guia — Ativar Push Notifications (Fase 33b)

> Esse guia explica como você (Daniel) ativa **Web Push real** na Nomade Drive.
> Sem isso, o checkbox "📲 Push no navegador" fica disabled com aviso "em breve".

## 📦 O que já está implementado

✅ **Service Worker** (`/sw.js`) — recebe push e mostra notificação
✅ **Tabela SQL** `push_subscriptions` — armazena subscriptions dos usuários
✅ **UI no painel verde** — checkbox "Push no navegador" no modal de notificações
✅ **JS** — registra SW, pede permissão, subscribe, salva no DB
✅ **Edge Function** `send-push` — busca subscriptions e prepara envio

## 🟡 O que falta (você faz uma vez, 5 min)

### 1. Gerar VAPID keys

Abre terminal (no Mac/Linux/WSL):
```bash
npx web-push generate-vapid-keys
```

Vai imprimir:
```
=======================================
Public Key:
BMxxx...xxx (87 chars, base64 url-safe)

Private Key:
zXxxx...xxx (43 chars, base64 url-safe)
=======================================
```

**Guarda esses 2 valores** — vai usar no próximo passo.

### 2. Configurar no Supabase Dashboard

1. Supabase Dashboard → **Project Settings → Edge Functions → Secrets**
2. Adiciona 3 secrets:

| Nome | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | (cola a Public Key) |
| `VAPID_PRIVATE_KEY` | (cola a Private Key) |
| `VAPID_SUBJECT` | `mailto:contato@nomadedrive.com.br` |

3. Save.

### 3. Configurar a Public Key no site

No `<head>` de qualquer página que precisa de Push (pelo menos `dashboard-proprietario.html`), adicionar:

```html
<script>
  window.VAPID_PUBLIC_KEY = 'BMxxx...xxx';  // cola sua public key aqui
</script>
```

⚠️ **A public key É pública** (vai pro navegador). A **private key NUNCA** vai pro navegador — só no Supabase.

### 4. Deploy as Edge Functions

- Supabase Dashboard → Edge Functions → **`send-push`** → Edit → cola conteúdo de `supabase/functions/send-push/index.ts` → Deploy

### 5. Rodar o SQL

📁 `supabase-fase33b-push-subscriptions.sql`

## 🧪 Testar (Daniel + Cowork)

1. Login como `qa-proprietario@` em produção (Chrome/Firefox, não Safari)
2. Vai em `dashboard-proprietario.html#rastreamento`
3. Clica "⚙ Configurar notificações"
4. Marca o checkbox "📲 Push no navegador"
5. Browser pede permissão → Permitir
6. Badge muda pra "✅ ativo"
7. **Pra testar envio**, no Console:
   ```javascript
   const sb = window.ndAuth.client();
   const u = (await sb.auth.getUser()).data.user;
   await sb.functions.invoke('send-push', {
     body: {
       user_id: u.id,
       title: '🚨 Alerta de teste',
       body: 'Push notification funcionando!',
       url: '/dashboard-proprietario.html#rastreamento'
     }
   });
   ```
8. Notification deve aparecer no canto da tela ✅

## ⚠️ Limitação atual

A função `send-push` está com **implementação placeholder de VAPID JWT** — porque assinar JWT P-256 ECDSA do zero em Deno é ~200 linhas de cripto. Pra ativar push REAL em produção, atualizar a função usando uma das opções:

**Opção A: lib externa via esm.sh**
```typescript
import webpush from "https://esm.sh/web-push@3";

webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payload);
```

**Opção B: lib Deno-native**
```typescript
import { sendNotification } from "https://deno.land/x/webpush@latest/mod.ts";
```

Cowork (ou eu numa próxima sessão) pode trocar o placeholder por uma dessas libs em ~15 min de código.

## 🎯 Onde push pode ser usado (futuro)

Quando estiver 100% ativo, dá pra disparar push em:

| Evento | Pra quem |
|---|---|
| Status do veículo vira 🔴 RED (Fase 33) | Proprietário |
| Avaria nova reportada | Proprietário (em tempo real, mesmo offline) |
| Saque parcial disponível | Proprietário |
| Cliente: caução autorizada | Cliente |
| Cliente: triagem concluída | Cliente |
| Proteção: nova ocorrência crítica | Time Proteção (broadcast) |

## 📋 Checklist completo

- [ ] Rodar SQL `supabase-fase33b-push-subscriptions.sql`
- [ ] Gerar VAPID keys com `npx web-push generate-vapid-keys`
- [ ] Adicionar 3 secrets no Supabase Edge Functions
- [ ] Adicionar `<script>window.VAPID_PUBLIC_KEY='...'</script>` no `dashboard-proprietario.html`
- [ ] Deploy Edge Function `send-push`
- [ ] (Futuro) Trocar placeholder VAPID JWT por lib `web-push`
- [ ] Testar com snippet do Console
- [ ] Wirar gatilhos automáticos (status red → push, etc.)

## 🔗 Referências

- [Web Push Protocol (RFC 8030)](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID (RFC 8292)](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push npm lib](https://github.com/web-push-libs/web-push)
- [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
