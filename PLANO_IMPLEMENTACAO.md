# Plano de Implementação — Nomade Drive Brasil

> Gerado em **2026-05-21** a partir dos 6 documentos da pasta `Novas atualizacoes 6 arquivos/`
> e do arquivo-mestre `Novas atualizacoes.docx`.
>
> **Objetivo geral:** evoluir o site institucional (GitHub Pages + Supabase) para uma
> **plataforma operacional sincronizada** de locação mensal de veículos — sem recriar
> nada do zero, preservando identidade visual, páginas públicas e estrutura atual.

---

## Como usar este plano

1. Abra o Claude Code **nesta pasta** (`App NomadesDrive Brasil`) — não em outro projeto.
2. Peça para executar **uma fase por vez**, na ordem (`Fase 2c` primeiro).
3. Ao fim de cada fase, o fechamento é sempre: **testar → commitar → publicar**.
4. Este arquivo é o índice. O detalhe fino de cada item está nos 6 PDFs citados em
   "Documentos-fonte" de cada fase.

---

## Estado atual (já pronto e no ar)

- Site institucional publicado — GitHub Pages, domínio `nomadedrive.com.br`.
- Autenticação completa: `login.html`, `cadastro.html`, 5 onboardings, 5 dashboards,
  `admin.html` protegido por *role*.
- Supabase: **13 tabelas + RLS**; e-mails transacionais via **Resend**.
- Marca/logo "Nomade Drive" aplicada.
- **Fase 1** — protocolo de cadastro + `status-cadastro.html`.
- **Fase 2a** — admin com 12 KPIs reais + central de notificações.
- **Fase 2b** — fila de cadastros e aprovações no admin (seção "Cadastros e aprovações").
- Testes: `_test_full.js` (jsdom) — **323/323 passando**.
- Git: branch `main`, sincronizada com `origin/main` (último commit `7cf1e25`).

---

## Regras gerais (valem para TODAS as fases)

- **Não recriar do zero.** Evolução incremental; preservar paleta verde, tom profissional
  e todas as páginas públicas existentes.
- **A plataforma é a fonte única da verdade.** WhatsApp e e-mail são canais de apoio,
  nunca substitutos do registro no sistema. Todo formulário formal gera um status.
- **Segurança:** o front-end usa **apenas a `anonKey`** + RLS. A `service_role key`
  **nunca** entra em HTML/JS do navegador, GitHub ou qualquer arquivo público.
- **UI honesta:** não afirmar que um e-mail ou WhatsApp "foi enviado" se a integração
  real não existir. Mostrar o que de fato aconteceu.
- **Botões sem função** devem ficar desabilitados ou abrir fluxo informativo —
  nunca simular uma ação falsa. Nunca exibir `Invalid Date`.
- **Linguagem clara e consistente:** solicitar, em análise, aprovado, pendente,
  bloqueado, encerrado.
- **Cada ação relevante vira evento rastreável** com status (solicitação, aprovação,
  recusa, foto, documento, km, pagamento, caução, multa, sinistro, manutenção, repasse).
- **Responsividade:** mobile objetivo com botões proporcionais; desktop aproveita a tela.
- **Testes:** `node _test_full.js` deve continuar passando ao fim de cada fase;
  adicionar casos novos para cada fluxo entregue.
- **Publicar = `git push`** (GitHub Pages atualiza sozinho). **Confirmar com o usuário
  antes de cada push.**

---

## ⚠️ Ações que dependem do usuário (não são código)

- [ ] **Rotacionar a `service_role key`** no painel do Supabase
      (Project Settings → API). O próprio `supabase-config.js` registra que ela já foi
      exposta — trocar antes de produção.
- [ ] **OneDrive:** este repositório está dentro da pasta do OneDrive. Sincronização
      em segundo plano + Git pode gerar conflito/corromper o `.git`. Recomendado:
      pausar o OneDrive durante o trabalho, ou mover o repositório para fora do OneDrive.
- [ ] Confirmar qual pasta é a publicada: a raiz do repositório ou `publicar/`.
      A `publicar/` parece uma cópia antiga (Netlify Drop) e pode estar desatualizada.
- [ ] Definir o número de WhatsApp e e-mail oficiais (usados nas Fases 3 e 4).

---

# FASES

A ordem segue o `Novas atualizacoes.docx`: **2c → 3**, depois o escopo dos 6 PDFs (4 a 8).

> Sugestão opcional: o **bug de data do `car.html`** (Fase 4, item 1) é rápido e de alto
> impacto ("Invalid Date" quebra reservas). Pode ser antecipado logo após a Fase 2c se
> o usuário preferir.

---

## FASE 2c — Admin: ligar os módulos restantes ao Supabase

**Objetivo:** completar o `admin.html` conectando os módulos que ainda não usam dados
reais, no mesmo padrão já entregue na seção "Cadastros e aprovações" (Fase 2b).

**Documentos-fonte:** `Novas atualizacoes.docx`; `Prompt_Completo_…_Admin_Dashboard…pdf`
(módulos 1–14).

**Tarefas:**

- [ ] Conectar ao Supabase, cada um no padrão "tabela com filtros/busca + badges de
      status + ações rápidas + tela de detalhe":
  - [ ] **Leads / WhatsApp** — tabela `whatsapp_leads`.
  - [ ] **Reservas / Locações** — tabela `rentals`.
  - [ ] **Frota** — tabela `vehicles` (placa mascarada, marca, modelo, ano, FIPE, km,
        status, semáforo de proteção/checklist).
  - [ ] **Oficinas** — `workshops` + `vehicle_checklists`.
  - [ ] **Proprietários** — `owners`.
  - [ ] **Proteção** — `protection_policies`.
  - [ ] **Parceiros** — `partners` + `referrals`.
  - [ ] **Log de atividades** — `admin_activity_log`.
- [ ] Tela de **detalhe da solicitação** com timeline de aprovação (8 etapas):
      recebido → análise inicial → documentos solicitados → entrevista/validação →
      checklist (se veículo/oficina) → proteção/seguro (se aplicável) →
      aprovação/reprovação → liberação do painel.
- [ ] Permitir ao admin no detalhe: registrar observações internas e observações
      visíveis ao usuário; mudar status; pedir documentos.
- [ ] **Exportar CSV** nas tabelas onde fizer sentido.
- [ ] Conceito de **`super_admin`**: ações do super admin são aprovadas
      automaticamente; admins comuns seguem regras normais.
- [ ] Reconciliar o schema: confirmar que as 13 tabelas existentes cobrem o que cada
      módulo precisa; criar via migration o que faltar (ver lista-alvo no fim do plano).

**Critérios de aceite:**

- Todos os módulos do admin mostram dados reais do Supabase (zero mock).
- Cada item tem status, badge e tela de detalhe com timeline.
- `_test_full.js` continua passando + novos testes para os módulos ligados.

**Fechamento:** rodar testes → commit `feat: Fase 2c — módulos do admin ligados ao Supabase` → publicar.

---

## FASE 3 — WhatsApp (Fase 1: imediata e segura)

**Objetivo:** WhatsApp como canal de apoio padronizado e contextual — sem prometer
automação que não existe.

**Documentos-fonte:** `Prompt_Completo_…_Admin_Dashboard…pdf` (seção WhatsApp).

**Tarefas:**

- [ ] Botões `wa.me` com **mensagem pré-preenchida e contextual** em: página inicial,
      pós-cadastro, `status-cadastro.html` e nas 5 áreas (cliente, proprietário,
      parceiro, oficina, proteção).
- [ ] Mensagens por contexto: cliente querendo alugar; proprietário cadastrando carro;
      parceiro indicador; oficina; pós-cadastro (incluindo `{{PROTOCOLO}}`).
- [ ] Página/módulo de **atendimento + FAQ** (`whatsapp.html` ou seção): menu de
      6 opções e respostas-base (alugar, cadastrar carro, ser parceiro, credenciar
      oficina, acompanhar cadastro, falar com humano).
- [ ] Usar a tabela `message_templates` para os textos padrão.
- [ ] **Fase 2 do WhatsApp** (WhatsApp Business API / Z-API / Twilio): deixar apenas
      a estrutura/placeholders comentados — não prometer bot completo sem provedor.

**Critérios de aceite:**

- Botão WhatsApp contextual presente em todas as telas listadas.
- Nenhuma promessa de automação inexistente; textos honestos.
- FAQ navegável com as 6 opções.

**Fechamento:** testes → commit `feat: Fase 3 — WhatsApp contextual + FAQ` → publicar.

---

## FASE 4 — Correção do fluxo público: `car.html`, datas, CTA e credenciamento

**Objetivo:** corrigir os bugs críticos da página de veículo e padronizar
credenciamento/formulários.

**Documentos-fonte:** `Prompt_incremental…pdf` (§1); `Prompt_adicional…credenciamento…pdf`
(completo); `Sinergias…pdf`; `Relatório_final_de_auditoria…pdf` (§3).

**Tarefas — `car.html`:**

- [ ] Campo de retirada aceita só data válida `YYYY-MM-DD`; bloquear datas no passado.
- [ ] Recalcular **devolução estimada** e **total estimado** sempre que a duração mudar.
- [ ] **Nunca** exibir `Invalid Date`. Em data inválida: mensagem visível + CTA
      desabilitado ("Corrija a data para pedir orçamento").
- [ ] CTA principal abre **WhatsApp** (não `mailto:`), com veículo + data + duração +
      devolução + total — só quando tudo for válido.
- [ ] Botão proporcional/responsivo no mobile (não gigante).

**Tarefas — credenciamento e formulários:**

- [ ] Revisar a seção "Status possíveis da avaliação": novo texto, CTA principal
      "Preencher formulário de credenciamento PJ" + CTA secundário
      "Tenho dúvida antes de preencher".
- [ ] Parâmetro de perfil na URL: `cadastro.html?perfil=oficina|proprietario_pj|parceiro|protecao`.
- [ ] CTA contextual por página: `oficinas.html`→oficina, `proprietarios.html`→proprietário,
      `parceiros.html`→parceiro.
- [ ] `mailto:` com **assunto pré-preenchido** por contexto (ver tabela no PDF).
- [ ] CTA de dúvida abre escolha: WhatsApp **ou** e-mail.
- [ ] Campos mínimos por cadastro PJ (oficina, proprietário PJ, parceiro — ver PDF).
- [ ] Status de envio: `rascunho`, `enviado_para_analise`, `pendente_documentos`,
      `aprovado`, `aprovado_com_ressalva`, `reprovado`, `bloqueado`.
- [ ] Corrigir responsividade mobile da área de credenciamento (texto não sobrepõe cards).

**Critérios de aceite:** sem `Invalid Date`; CTA usa WhatsApp; usuário entende onde começar;
WhatsApp aparece só como apoio; `mailto:` com assunto contextual; área legível no mobile.

**Fechamento:** testes → commit `fix: Fase 4 — car.html, datas, CTA e credenciamento` → publicar.

---

## FASE 5 — Modelo de reserva + fluxo de check-in

**Objetivo:** criar o ciclo de vida da reserva e o check-in solicitado pelo cliente.

**Documentos-fonte:** `Prompt_incremental…pdf` (§2–3); `Fluxo_operacional…pdf`;
`Relatório_final_de_auditoria…pdf` (§4–5).

**Tarefas:**

- [ ] **Modelo de status da reserva** (na tabela `rentals`): `orcamento_solicitado`,
      `documentos_pendentes`, `em_analise_plataforma`, `aguardando_proprietario`,
      `reserva_confirmada`, `checkin_solicitado`, `checkin_aprovado`,
      `checkout_solicitado`, `checkout_em_analise`, `locacao_encerrada`,
      `pendencia_financeira`, `sinistro_aberto`, `cancelada`.
- [ ] No painel do cliente, botão **"Solicitar check-in"** — só aparece quando a
      reserva está `reserva_confirmada` com contrato aceito, caução confirmada,
      proteção ativa, documentos aprovados e veículo liberado.
- [ ] Formulário de check-in: data/hora, local de retirada, km inicial, combustível/carga,
      fotos externas (frente/traseira/laterais/rodas/pneus), fotos internas
      (painel/bancos/porta-malas), observações, aceite.
- [ ] Ao solicitar → status `checkin_solicitado`; **notificar proprietário e admin**.
- [ ] Proprietário/admin validam → `checkin_aprovado` (locação ativa).

**Critérios de aceite:** cliente solicita check-in; status muda; proprietário/admin
recebem alerta; dados salvos no histórico da reserva e do veículo.

**Fechamento:** testes → commit `feat: Fase 5 — modelo de reserva + check-in` → publicar.

---

## FASE 6 — Check-out + automação do veículo

**Objetivo:** fechar o ciclo da locação e fazer a plataforma reagir automaticamente.

**Documentos-fonte:** `Prompt_incremental…pdf` (§4–6); `Fluxo_operacional…pdf`;
`Relatório_final_de_auditoria…pdf` (§6–8).

**Tarefas:**

- [ ] No painel do cliente, botão **"Solicitar check-out"** quando `checkin_aprovado`.
- [ ] Formulário de check-out: data/hora e local de devolução, km final
      (≥ km inicial), combustível/carga final, fotos finais externas/internas,
      observações, aceite. → status `checkout_solicitado`.
- [ ] Validação do proprietário/admin → `locacao_encerrada`, `checkout_em_analise`,
      `pendencia_financeira` ou `sinistro_aberto`.
- [ ] **Automação por km:** `km_rodado = km_final − km_inicial`;
      `km_atual_veiculo = km_final`.
- [ ] Recalcular indicadores do veículo: próxima revisão, óleo/filtros, pneus
      (campo `pneusVidaPercentual`, vida útil configurável por veículo), rodízio, freios.
- [ ] **Semáforo operacional do veículo** — verde / amarelo / vermelho:
  - Vermelho (bloqueia nova reserva): proteção/seguro vencido, CRLV irregular,
    sinistro aberto, checklist reprovado, manutenção crítica, pneus abaixo do limite,
    pendência administrativa.
  - Amarelo (atenção): proteção/CRLV vencendo, revisão próxima, óleo/pneus no limite,
    multa em análise.
- [ ] Veículo vermelho não aparece como reservável.

**Critérios de aceite:** check-out muda status e alerta proprietário/admin; km/revisão/pneus
recalculam; veículo com documento/proteção vencidos não aceita nova reserva.

**Fechamento:** testes → commit `feat: Fase 6 — check-out + automação do veículo` → publicar.

---

## FASE 7 — Painéis operacionais completos por perfil

**Objetivo:** transformar os 5 dashboards em painéis de operação contínua.

**Documentos-fonte:** `Prompt_incremental…pdf` (§7–11); `Fluxo_operacional…pdf`
("Visão por perfil"); `Sinergias…pdf`.

**Tarefas:**

- [ ] **Cliente:** minhas solicitações, documentos, reserva atual, check-in, check-out,
      pendências (multas/pedágios/danos/limpeza/atraso), caução, suporte.
- [ ] **Proprietário:** meus veículos (status/km/bloqueios), solicitações
      (aprovar/recusar), check-in pendente, check-out pendente, manutenção,
      proteção/documentos, multas/sinistros, repasses.
- [ ] **Oficina:** fila de tarefas — checklist inicial, revisão pós-check-out,
      orçamento, troca/rodízio de pneus, manutenção preventiva, laudo técnico.
- [ ] **Parceiro:** link/código rastreável, leads, status da indicação, conversões,
      créditos a liberar/liberados (sem expor dados sensíveis do cliente).
- [ ] **Super admin:** visão completa por reserva/cliente/proprietário/veículo/oficina/
      parceiro/proteção/documento/multa/caução/sinistro/manutenção/repasse/alerta.

**Critérios de aceite:** proprietário tem visão operacional; admin bloqueia/aprova/corrige/
audita; oficina emite laudo e atualiza histórico; parceiro acompanha leads e créditos.

**Fechamento:** testes → commit `feat: Fase 7 — painéis operacionais por perfil` → publicar.

---

## FASE 8 — Sinergia final, UX e responsividade

**Objetivo:** garantir que todas as partes trabalham sobre o mesmo registro e fazer
o polimento final.

**Documentos-fonte:** `Sinergias…pdf`; `Prompt_incremental…pdf` (§12–13);
`Prompt_adicional…credenciamento…pdf` (regras de UX).

**Tarefas:**

- [ ] Garantir que toda decisão relevante (em qualquer painel) gera evento rastreável
      compartilhado entre cliente, proprietário, oficina, parceiro e admin.
- [ ] Passada de UX: linguagem clara, botões sem função desabilitados/informativos,
      botão "Como funciona" sempre visível.
- [ ] Passada de responsividade mobile/desktop em todas as páginas tocadas.
- [ ] Validar os **critérios de aceite finais** dos dois prompts (13 itens do
      `Prompt_incremental` + 15 itens do `Prompt_Completo`).

**Fechamento:** testes → commit `feat: Fase 8 — sinergia final, UX e responsividade` → publicar.

---

## Anexo — Tabelas-alvo do Supabase

O `Prompt_Completo` recomenda este conjunto. As 13 tabelas atuais provavelmente cobrem
a maior parte; **conferir o schema real** (ver `supabase-config.js` e `_qa_supabase_test.js`)
e criar via migration apenas o que faltar:

`profiles`, `user_roles`, `applications`, `customers`, `owners`, `vehicles`,
`vehicle_checklists`, `workshops`, `partners`, `referrals`, `rentals`,
`protection_policies`, `incidents`, `notifications`, `admin_activity_log`,
`whatsapp_leads`, `message_templates`, `documents`, `payouts`.

Campos mínimos de `applications`, `vehicles`, `notifications` e `admin_activity_log`
estão detalhados no `Prompt_Completo_…_Admin_Dashboard…pdf` (páginas 6–7).

Ativar **RLS** em todas: usuário comum só vê os próprios dados; admin/super_admin veem tudo.
