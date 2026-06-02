# Páginas de Auth — Arquivadas em 02/06/2026

## Por que foram arquivadas

O novo modelo **locação mensal frota própria** (30-180 dias) opera com **leads → reserva → contato comercial**, não com login de cliente público. Não há necessidade de portal do cliente nesta fase.

A regra "máximo 5 páginas públicas" (anti-AI ruleset, item 13 do adendo de 02/06) levou ao arquivamento das páginas de auth.

## Páginas mantidas no domínio público (5)

1. `index.html` — Home
2. `carros/popular.html` — HB20
3. `carros/sedan.html` — Cronos
4. `reservar.html` — Wizard de reserva (lead → comercial)
5. `politica-privacidade.html` — LGPD

## Páginas movidas para esta pasta (5)

- `login.html` — Login email + senha
- `dashboard.html` — Painel do cliente (KYC + reservas)
- `perfil.html` — Dados pessoais + pet
- `recuperar-senha.html` — Esqueci minha senha
- `nova-senha.html` — Definir nova senha após reset

## Quando reativar

Quando o produto evoluir para **gestão self-service** (cliente vê próprio contrato, faz renovação, troca método de pagamento sem contato comercial). Estimativa: pós-Fase 90-5 (backend pronto) ou pós-20 carros (escala manual fica inviável).

## Como reativar

```bash
# Mover de volta
git mv _arquivo_carsharing/auth/*.html ./

# Restaurar botão "Entrar" no header:
#   - index.html linha ~237
#   - politica-privacidade.html linha ~91
#   - carros/popular.html linha ~210
#   - carros/sedan.html linha ~197

# Reverter link admin.html linha ~1339:
#   _arquivo_carsharing/auth/login.html?redirect=../../admin.html
#   → login.html?redirect=admin.html
```

## Edge Function `nova-lead` (v7)

Continua **criando usuário no Supabase Auth** com `admin.createUser({ email, password, email_confirm: true })`. O lead vira conta no banco mesmo sem login disponível — quando reativarmos as páginas de auth, todos os leads convertidos viram clientes em potencial sem precisar refazer cadastro.

## Refs internas que continuam apontando aqui

- `admin.html:1339` → `_arquivo_carsharing/auth/login.html?redirect=../../admin.html` (ferramenta interna do admin, mantida)
