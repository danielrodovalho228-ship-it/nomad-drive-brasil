// ====================================================================
// Nomade Drive Brasil — Catálogo Deno dos 24 templates v3
// --------------------------------------------------------------------
// Espelho TS dos templates v3 (mensal_* + team_*) registrados em
// emails/email-templates.js. O JS continua sendo a fonte humana
// (preview no browser) — este TS é a cópia que a Edge Function
// `send-template` consome.
//
// AO ADICIONAR/EDITAR TEMPLATE v3: atualize OS DOIS arquivos.
// (Catálogo do JS é grande demais pra portar todos os legados —
//  só os v3 estão aqui; os legados continuam disparados pelas
//  Edge Functions específicas: send-rating-request, send-tier-promotion,
//  send-renewal-reminders, stripe-webhook, etc.)
// ====================================================================

export interface TemplateDef {
  key: string;
  profile: "cliente" | "admin";
  priority: "media" | "alta" | "critica";
  subject: string;
  preheader: string;
  title: string;
  body: string[];
  data_blocks?: Array<[string, string]>;
  cta?: string;
  cta_url?: string;
  cta2?: string;
  cta2_url?: string;
  security?: string;
}

const PANEL_CLIENT = "https://nomadedrive.com.br/dashboard-cliente.html";
const PANEL_ADMIN = "https://nomadedrive.com.br/admin.html";
const WHATSAPP = "https://wa.me/5534999999999";

const SEC_DEFAULT = "A Nomade Drive nunca pede senha, código ou dados de cartão por e-mail. Na dúvida, acesse o painel digitando nomadedrive.com.br você mesmo.";
const SEC_PAYMENT = "Nunca informe número de cartão, CVV ou senha por e-mail. Pague somente dentro do painel oficial da Nomade Drive.";
const SEC_ADMIN = "E-mail interno da operação. Confirme a ação no painel administrativo antes de agir e nunca encaminhe este alerta para fora da equipe.";

export const TEMPLATES_V3: Record<string, TemplateDef> = {
  // -------- 11 CLIENTE --------
  mensal_lead_recebido: {
    key: "mensal_lead_recebido", profile: "cliente", priority: "alta",
    subject: "Recebemos sua solicitação — Nomade Drive",
    preheader: "Em até 2h responderemos com a proposta e disponibilidade.",
    title: "Recebemos sua solicitação",
    body: [
      "Olá, {{first_name}}! Recebemos seu pedido de carro mensal. Em até 2h úteis o Danilo vai responder por aqui e por WhatsApp com a proposta e a confirmação de disponibilidade.",
      "Enquanto isso, separe sua CNH, comprovante de endereço e selfie — vamos pedir esses documentos no próximo passo."
    ],
    data_blocks: [["Carro", "{{car_name}}"], ["Plano", "{{plan_name}}"], ["Período", "{{period_days}} dias"], ["Início estimado", "{{start_date}}"]],
    cta: "Acompanhar solicitação", cta_url: PANEL_CLIENT,
    cta2: "Falar pelo WhatsApp", cta2_url: WHATSAPP
  },
  mensal_orcamento_enviado: {
    key: "mensal_orcamento_enviado", profile: "cliente", priority: "alta",
    subject: "Sua proposta personalizada — Nomade Drive",
    preheader: "Plano, valor total do período e limite de km confirmados.",
    title: "Sua proposta está pronta",
    body: [
      "Oi, {{first_name}}. Conferi disponibilidade e preparei sua proposta com base no que você pediu.",
      "Valor já considera Limite Total de km do período — sem cobrança extra surpresa, sem caução, sem fidelidade.",
      "Se estiver de acordo, vamos pro próximo passo: envio de documentos."
    ],
    data_blocks: [
      ["Carro", "{{car_name}}"], ["Plano", "{{plan_name}}"], ["Período", "{{period_days}} dias"],
      ["Limite total km", "{{km_total}}"], ["Total do período", "{{price_total_brl}}"], ["Equivalente mensal", "{{price_monthly_brl}}"]
    ],
    cta: "Aceitar e enviar documentos", cta_url: PANEL_CLIENT + "#documentos",
    cta2: "Tirar dúvida no WhatsApp", cta2_url: WHATSAPP
  },
  mensal_documentos_solicitados: {
    key: "mensal_documentos_solicitados", profile: "cliente", priority: "alta",
    subject: "Envie seus documentos pra finalizar — Nomade Drive",
    preheader: "CNH, selfie e comprovante de endereço. Análise em até 24h.",
    title: "Falta só o envio dos documentos",
    body: [
      "Oi, {{first_name}}. Pra liberar o contrato e o pagamento, precisamos validar três documentos:",
      "<strong>1.</strong> CNH (frente e verso, válida e categoria B)<br><strong>2.</strong> Selfie segurando a CNH<br><strong>3.</strong> Comprovante de endereço dos últimos 3 meses",
      "O envio é seguro pelo painel. A análise costuma sair em até 24h úteis."
    ],
    data_blocks: [["Status", "Aguardando documentos"], ["Prazo de análise", "{{deadline}}"]],
    cta: "Enviar documentos agora", cta_url: PANEL_CLIENT + "#documentos",
    security: "Não envie documentos por WhatsApp ou e-mail. Use apenas a área Documentos do painel — é criptografada e auditada (LGPD)."
  },
  mensal_documentos_aprovados: {
    key: "mensal_documentos_aprovados", profile: "cliente", priority: "alta",
    subject: "Documentos aprovados ✓ — vamos para o contrato",
    preheader: "Próximo passo: assinatura digital do contrato pelo Autentique.",
    title: "Documentos aprovados",
    body: [
      "{{first_name}}, seus documentos foram aprovados. Em alguns minutos você vai receber um e-mail do <strong>Autentique</strong> com o contrato digital pra assinar.",
      "É 100% online, leva menos de 3 minutos. Após sua assinatura, liberamos o link de pagamento."
    ],
    data_blocks: [["Status KYC", "Aprovado"], ["Carro reservado", "{{car_name}}"], ["Plano", "{{plan_name}}"]],
    cta: "Ver detalhes no painel", cta_url: PANEL_CLIENT
  },
  mensal_documentos_reprovados: {
    key: "mensal_documentos_reprovados", profile: "cliente", priority: "alta",
    subject: "Não conseguimos aprovar seu cadastro",
    preheader: "Identificamos um ponto que impede a aprovação. Veja o motivo.",
    title: "Cadastro não aprovado",
    body: [
      "Oi, {{first_name}}. Infelizmente não foi possível aprovar seu cadastro nesta solicitação.",
      "Motivo: <strong>{{rejection_reason}}</strong>",
      "Se você acredita que houve um engano, fale com a gente pelo WhatsApp — podemos reanalisar com documentos adicionais."
    ],
    data_blocks: [["Status", "Reprovado"], ["Motivo", "{{rejection_reason}}"]],
    cta: "Falar com a gente", cta_url: WHATSAPP,
    security: "Esta análise não afeta seu CPF nem é comunicada a bureaus externos. Os documentos enviados serão excluídos em 30 dias conforme LGPD."
  },
  mensal_contrato_pronto: {
    key: "mensal_contrato_pronto", profile: "cliente", priority: "critica",
    subject: "Seu contrato chegou — assine para liberar o pagamento",
    preheader: "Link Autentique abaixo. Leitura e assinatura em 3 minutos.",
    title: "Contrato pronto para assinatura",
    body: [
      "{{first_name}}, seu contrato de locação mensal está pronto. A assinatura é digital, pelo Autentique, e tem validade legal (ICP-Brasil).",
      "Após sua assinatura, liberamos o link de pagamento (PIX ou cartão de crédito)."
    ],
    data_blocks: [["Carro", "{{car_name}}"], ["Período", "{{period_days}} dias"], ["Total", "{{price_total_brl}}"], ["Validade do link", "{{contract_expires_at}}"]],
    cta: "Assinar contrato no Autentique", cta_url: "{{autentique_url}}",
    security: "O Autentique é a empresa que valida a assinatura digital. O link é único pra você — não compartilhe."
  },
  mensal_pagamento_aguardando: {
    key: "mensal_pagamento_aguardando", profile: "cliente", priority: "critica",
    subject: "Falta o pagamento — escolha PIX ou cartão",
    preheader: "Contrato assinado ✓. Após o pagamento confirmamos a entrega.",
    title: "Falta só o pagamento",
    body: [
      "{{first_name}}, contrato assinado com sucesso. Agora é só pagar pra confirmarmos a entrega.",
      "Você escolhe: <strong>PIX</strong> (confirmação instantânea) ou <strong>cartão de crédito</strong> (até 3x sem juros)."
    ],
    data_blocks: [["Total", "{{price_total_brl}}"], ["Vencimento do link", "{{payment_expires_at}}"]],
    cta: "Pagar agora", cta_url: "{{payment_url}}",
    security: SEC_PAYMENT
  },
  mensal_pagamento_confirmado: {
    key: "mensal_pagamento_confirmado", profile: "cliente", priority: "critica",
    subject: "Pagamento confirmado — agora vamos agendar a entrega",
    preheader: "Em até 24h respondemos com as opções de horário e local.",
    title: "Pagamento confirmado",
    body: [
      "{{first_name}}, recebemos seu pagamento. Agora é só agendar a entrega.",
      "Em até 24h úteis o Danilo entra em contato no WhatsApp com 3 opções de horário e ponto de entrega (hotel, endereço seu, ou um dos nossos pontos em Uberlândia)."
    ],
    data_blocks: [["Valor pago", "{{price_total_brl}}"], ["Forma", "{{payment_method}}"], ["Recibo", "{{receipt_url}}"]],
    cta: "Ver recibo / NF", cta_url: "{{receipt_url}}"
  },
  mensal_entrega_agendada: {
    key: "mensal_entrega_agendada", profile: "cliente", priority: "alta",
    subject: "Entrega agendada — {{delivery_date}} às {{delivery_time}}",
    preheader: "Local + checklist da entrega + o que levar.",
    title: "Sua entrega foi agendada",
    body: [
      "{{first_name}}, sua entrega está confirmada. Veja os detalhes abaixo.",
      "<strong>Importante levar:</strong> CNH original (vamos conferir), o e-mail de confirmação do pagamento e celular pra receber o e-mail de check-out com fotos."
    ],
    data_blocks: [
      ["Data", "{{delivery_date}}"], ["Horário", "{{delivery_time}}"], ["Local", "{{delivery_location}}"],
      ["Carro", "{{car_name}}"], ["Placa", "{{vehicle_plate}}"]
    ],
    cta: "Ver no mapa", cta_url: "{{delivery_map_url}}",
    cta2: "Reagendar (até 12h antes)", cta2_url: WHATSAPP
  },
  mensal_lembrete_devolucao: {
    key: "mensal_lembrete_devolucao", profile: "cliente", priority: "media",
    subject: "Sua devolução é em 3 dias — vamos combinar?",
    preheader: "Renovar o plano ou agendar devolução? Responda por aqui.",
    title: "Sua devolução é em 3 dias",
    body: [
      "{{first_name}}, faltam <strong>3 dias</strong> pro fim do seu plano. Vamos combinar?",
      "Opções:<br><strong>A.</strong> Renovar o mesmo plano (1 clique) — mantém o carro<br><strong>B.</strong> Trocar de plano ou carro<br><strong>C.</strong> Devolver na data combinada"
    ],
    data_blocks: [["Devolução prevista", "{{return_date}}"], ["Local de devolução", "{{return_location}}"], ["Km percorrido até agora", "{{current_km}}"], ["Limite do período", "{{km_total}}"]],
    cta: "Renovar 1-clique", cta_url: PANEL_CLIENT + "#renovar",
    cta2: "Combinar devolução", cta2_url: WHATSAPP
  },
  mensal_devolucao_confirmada: {
    key: "mensal_devolucao_confirmada", profile: "cliente", priority: "alta",
    subject: "Devolução confirmada — obrigado por dirigir com a gente",
    preheader: "Recibo final + pesquisa rápida de 30 segundos.",
    title: "Devolução confirmada ✓",
    body: [
      "{{first_name}}, recebemos o carro de volta. Tudo conferido nas fotos de check-out, sem pendências.",
      "Foi um prazer ter você como cliente. Se topar, responda nossa pesquisa rápida (3 perguntas, 30 segundos) — sua opinião nos ajuda a melhorar."
    ],
    data_blocks: [["Carro devolvido", "{{car_name}}"], ["Data devolução", "{{return_date}}"], ["Km final", "{{final_km}}"], ["Cobranças extras", "{{extra_charges}}"]],
    cta: "Responder pesquisa (30s)", cta_url: "{{nps_url}}",
    cta2: "Reservar de novo", cta2_url: "https://nomadedrive.com.br/reservar.html"
  },

  // -------- 13 EQUIPE --------
  team_novo_lead: {
    key: "team_novo_lead", profile: "admin", priority: "alta",
    subject: "[Equipe] Novo lead — responder em até 2h",
    preheader: "{{first_name}} pediu {{car_name}} por {{period_days}} dias.",
    title: "Novo lead recebido",
    body: [
      "Lead criado pelo site. <strong>SLA: 2h úteis.</strong> Cliente já recebeu confirmação automática.",
      "Próximo passo manual: revisar capacidade + responder com proposta no painel ou WhatsApp."
    ],
    data_blocks: [
      ["Nome", "{{first_name}} {{last_name}}"], ["E-mail", "{{user_email}}"], ["WhatsApp", "{{phone}}"],
      ["Carro", "{{car_name}}"], ["Plano", "{{plan_name}}"], ["Período", "{{period_days}} dias"],
      ["Início", "{{start_date}}"], ["Origem", "{{source}}"]
    ],
    cta: "Abrir no painel", cta_url: PANEL_ADMIN + "#leads",
    cta2: "Responder por WhatsApp", cta2_url: "https://wa.me/{{phone_e164}}",
    security: SEC_ADMIN
  },
  team_documentos_para_revisar: {
    key: "team_documentos_para_revisar", profile: "admin", priority: "alta",
    subject: "[Equipe] Documentos KYC pra revisar",
    preheader: "{{first_name}} enviou CNH + selfie + comprovante. SLA 24h.",
    title: "Revisar KYC",
    body: [
      "Documentos novos pra análise manual. SLA: 24h úteis (cliente foi informado deste prazo).",
      "Verificar: CNH válida, categoria B, selfie corresponde à foto da CNH, comprovante <3 meses."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}} {{last_name}}"], ["CPF", "{{cpf_masked}}"],
      ["CNH categoria", "{{cnh_category}}"], ["CNH validade", "{{cnh_expires_at}}"], ["Documentos", "{{documents_count}}"]
    ],
    cta: "Revisar KYC", cta_url: PANEL_ADMIN + "#kyc",
    security: SEC_ADMIN
  },
  team_contrato_assinado: {
    key: "team_contrato_assinado", profile: "admin", priority: "alta",
    subject: "[Equipe] Contrato assinado — agendar entrega",
    preheader: "{{first_name}} assinou. Aguardar pagamento ou já agendar?",
    title: "Contrato assinado",
    body: [
      "Cliente assinou o contrato no Autentique. Pagamento ainda em aberto — assim que cair, parta pra agendar entrega.",
      "Se cliente pagou simultaneamente (raro), aciona o e-mail mensal_pagamento_confirmado e abre janela de entrega."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}} {{last_name}}"], ["Carro", "{{car_name}}"],
      ["Período", "{{period_days}} dias"], ["Total", "{{price_total_brl}}"], ["Link contrato", "{{autentique_url}}"]
    ],
    cta: "Abrir reserva", cta_url: PANEL_ADMIN + "#reservas",
    security: SEC_ADMIN
  },
  team_pagamento_recebido: {
    key: "team_pagamento_recebido", profile: "admin", priority: "alta",
    subject: "[Equipe] Pagamento recebido — agendar entrega",
    preheader: "{{price_total_brl}} de {{first_name}} confirmado.",
    title: "Pagamento recebido",
    body: [
      "Pagamento confirmado. Cliente foi avisado automaticamente que vamos contatar em 24h.",
      "Próximo passo manual: ligar/whats e fechar local + horário da entrega."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}}"], ["Valor", "{{price_total_brl}}"], ["Forma", "{{payment_method}}"],
      ["Stripe ID", "{{stripe_payment_id}}"], ["Cidade preferida", "{{city}}"]
    ],
    cta: "Agendar entrega", cta_url: PANEL_ADMIN + "#agenda",
    cta2: "Ligar / WhatsApp", cta2_url: "https://wa.me/{{phone_e164}}",
    security: SEC_ADMIN
  },
  team_pagamento_falhou: {
    key: "team_pagamento_falhou", profile: "admin", priority: "critica",
    subject: "[Equipe] Pagamento FALHOU — contato urgente",
    preheader: "{{first_name}} tentou pagar mas falhou. Motivo: {{failure_reason}}.",
    title: "Pagamento falhou",
    body: [
      "Cliente assinou contrato mas o pagamento falhou. Contato urgente — janela de reserva pode expirar.",
      "Motivo do gateway: <strong>{{failure_reason}}</strong>. Sugestão: oferecer PIX como alternativa imediata."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}}"], ["Valor", "{{price_total_brl}}"],
      ["Motivo", "{{failure_reason}}"], ["Tentativas", "{{attempts}}"]
    ],
    cta: "Contatar cliente", cta_url: "https://wa.me/{{phone_e164}}",
    security: SEC_ADMIN
  },
  team_devolucao_atrasada: {
    key: "team_devolucao_atrasada", profile: "admin", priority: "critica",
    subject: "[Equipe] DEVOLUÇÃO ATRASADA — {{first_name}} ({{hours_late}}h)",
    preheader: "Carro {{vehicle_plate}} não voltou. Acionar protocolo.",
    title: "Devolução atrasada",
    body: [
      "<strong>Atraso de {{hours_late}}h.</strong> Cliente não devolveu o carro no horário combinado e não respondeu mensagens automáticas.",
      "Protocolo: 1) ligar; 2) se não atender em 2h, acionar rastreador (Cobli); 3) se >24h, abrir B.O. + acionar seguro."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}}"], ["WhatsApp", "{{phone}}"],
      ["Carro", "{{car_name}} ({{vehicle_plate}})"], ["Devolução prevista", "{{return_date}}"],
      ["Atraso", "{{hours_late}}h"], ["Última localização", "{{last_known_location}}"]
    ],
    cta: "Ver rastreador", cta_url: "{{tracker_url}}",
    cta2: "Ligar agora", cta2_url: "tel:{{phone_e164}}",
    security: SEC_ADMIN
  },
  team_uso_suspeito_app: {
    key: "team_uso_suspeito_app", profile: "admin", priority: "critica",
    subject: "[Equipe] Possível uso restrito — Cláusula 7(h) — {{vehicle_plate}}",
    preheader: "Telemetria indica padrão de aplicativo. Acionar cliente em 48h.",
    title: "Uso restrito — possível Cláusula 7(h)",
    body: [
      "A telemetria detectou padrão de uso compatível com Uber/99/iFood ou similares, o que é vedado em contrato (Cláusula 7, alínea h).",
      "Protocolo: 1) WhatsApp ao cliente com mensagem pré-pronta (link abaixo); 2) prazo de 48h pra resposta; 3) se confirmado, multa + rescisão."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}}"], ["Carro", "{{car_name}} ({{vehicle_plate}})"],
      ["Indicadores", "{{indicators}}"], ["Janela analisada", "{{analysis_window}}"], ["Score risco", "{{risk_score}}/100"]
    ],
    cta: "Abrir alerta + template WhatsApp", cta_url: PANEL_ADMIN + "#alertas",
    security: SEC_ADMIN
  },
  team_manutencao_proxima: {
    key: "team_manutencao_proxima", profile: "admin", priority: "alta",
    subject: "[Equipe] Manutenção próxima — {{car_name}}",
    preheader: "{{km_remaining}} km até a próxima {{maintenance_type}}.",
    title: "Manutenção programada se aproximando",
    body: [
      "O carro <strong>{{car_name}}</strong> ({{vehicle_plate}}) está próximo da {{maintenance_type}} programada.",
      "Há alerta criado em <em>maintenance_alerts</em> com template WhatsApp pronto pras 3 opções (A/B/C) ao cliente."
    ],
    data_blocks: [
      ["Veículo", "{{car_name}} ({{vehicle_plate}})"], ["Tipo", "{{maintenance_type}}"],
      ["Km atual", "{{current_km}}"], ["Km restante", "{{km_remaining}}"], ["Oficina sugerida", "{{workshop_name}}"]
    ],
    cta: "Abrir alerta", cta_url: PANEL_ADMIN + "#manutencao",
    security: SEC_ADMIN
  },
  team_documento_veiculo_vencendo: {
    key: "team_documento_veiculo_vencendo", profile: "admin", priority: "alta",
    subject: "[Equipe] {{doc_type}} vencendo — {{car_name}}",
    preheader: "Vence em {{days_until_expiry}} dias. Programar renovação.",
    title: "Documento do veículo vencendo",
    body: [
      "O <strong>{{doc_type}}</strong> do carro {{car_name}} vence em {{days_until_expiry}} dias.",
      "Programar renovação antes pra evitar suspensão de operação do veículo."
    ],
    data_blocks: [
      ["Veículo", "{{car_name}} ({{vehicle_plate}})"], ["Documento", "{{doc_type}}"],
      ["Vencimento", "{{expires_at}}"], ["Dias restantes", "{{days_until_expiry}}"]
    ],
    cta: "Marcar como renovado", cta_url: PANEL_ADMIN + "#frota",
    security: SEC_ADMIN
  },
  team_nps_baixo: {
    key: "team_nps_baixo", profile: "admin", priority: "alta",
    subject: "[Equipe] NPS baixo ({{nps_score}}) — {{first_name}}",
    preheader: "Cliente deu nota {{nps_score}}/10. Investigar e responder.",
    title: "NPS baixo — investigar",
    body: [
      "Cliente avaliou a experiência com nota <strong>{{nps_score}}/10</strong>. Comentário aberto abaixo.",
      "Protocolo: contatar em 24h pelo WhatsApp pra entender, oferecer compensação se aplicável, registrar lição aprendida."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}}"], ["NPS", "{{nps_score}}/10"],
      ["Reserva", "{{booking_protocol}}"], ["Carro", "{{car_name}}"], ["Comentário", "{{nps_comment}}"]
    ],
    cta: "Contatar cliente", cta_url: "https://wa.me/{{phone_e164}}",
    security: SEC_ADMIN
  },
  team_parceiro_indicou: {
    key: "team_parceiro_indicou", profile: "admin", priority: "media",
    subject: "[Equipe] Indicação de parceiro — {{partner_name}}",
    preheader: "{{partner_name}} indicou {{first_name}} para um aluguel mensal.",
    title: "Indicação de parceiro recebida",
    body: [
      "Lead chegou via parceiro <strong>{{partner_name}}</strong> ({{partner_type}}). Atenção redobrada: a primeira locação tem comissão de {{commission_pct}}% pro parceiro e desconto de {{discount_pct}}% pro cliente.",
      "Responder com prioridade — qualidade da resposta impacta a parceria."
    ],
    data_blocks: [
      ["Parceiro", "{{partner_name}}"], ["Tipo", "{{partner_type}}"],
      ["Cliente", "{{first_name}}"], ["Carro pretendido", "{{car_name}}"],
      ["Comissão", "{{commission_pct}}%"], ["Desconto cliente", "{{discount_pct}}%"]
    ],
    cta: "Abrir lead", cta_url: PANEL_ADMIN + "#leads",
    security: SEC_ADMIN
  },
  team_recorrencia_nao_renovou: {
    key: "team_recorrencia_nao_renovou", profile: "admin", priority: "media",
    subject: "[Equipe] Cliente {{first_name}} não renovou",
    preheader: "Devolveu há 3 dias e não voltou. Vale uma sondagem?",
    title: "Cliente não renovou",
    body: [
      "{{first_name}} usou nosso serviço por {{previous_period_days}} dias e devolveu há 3 dias sem reservar de novo.",
      "Se NPS foi alto, pode ser só caso de não estar mais em Uberlândia. Se NPS médio/baixo, vale entender o motivo."
    ],
    data_blocks: [
      ["Cliente", "{{first_name}}"], ["Última reserva", "{{previous_period_days}} dias"],
      ["NPS última", "{{last_nps}}/10"], ["LTV até agora", "{{ltv_brl}}"]
    ],
    cta: "Mandar mensagem de retenção", cta_url: "https://wa.me/{{phone_e164}}",
    security: SEC_ADMIN
  },
  team_capacidade_ocupacao: {
    key: "team_capacidade_ocupacao", profile: "admin", priority: "media",
    subject: "[Equipe] Ocupação frota {{occupancy_pct}}% — considerar expansão",
    preheader: "{{available_cars}}/{{total_cars}} carros disponíveis. Mais leads podem ficar sem carro.",
    title: "Ocupação alta — momento de escalar?",
    body: [
      "A frota está com <strong>{{occupancy_pct}}% de ocupação</strong>. Sobram apenas {{available_cars}} de {{total_cars}} carros pra novos leads esta semana.",
      "Se a tendência continuar, vale acelerar a aquisição do próximo veículo ou ativar lista de espera no site."
    ],
    data_blocks: [
      ["Ocupação", "{{occupancy_pct}}%"], ["Carros total", "{{total_cars}}"],
      ["Carros livres", "{{available_cars}}"], ["Leads pendentes", "{{pending_leads}}"],
      ["MRR atual", "{{mrr_brl}}"]
    ],
    cta: "Ver dashboard frota", cta_url: PANEL_ADMIN + "#frota",
    security: SEC_ADMIN
  }
};

// --------------------------------------------------------------------
// Render minimal (espelho do emails/render.js, porém em TS Deno)
// --------------------------------------------------------------------

const LOGO = "https://nomadedrive.com.br/images/logo-nomade-drive.jpg";
const BTN = "#079344";

function paragraphs(arr: string[]): string {
  return (arr || []).map(p =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#1f2937;">${p}</p>`
  ).join("");
}

function dataBlocks(rows?: Array<[string, string]>): string {
  if (!rows || !rows.length) return "";
  const trs = rows.map(r =>
    `<tr><td style="padding:9px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #eef0ef;">${r[0]}</td>` +
    `<td style="padding:9px 14px;font-size:13px;color:#1f2937;font-weight:bold;text-align:right;border-bottom:1px solid #eef0ef;">${r[1]}</td></tr>`
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 20px;background:#f6f8f7;border:1px solid #e5e7eb;border-radius:10px;">${trs}</table>`;
}

function button(label?: string, url?: string, primary = true): string {
  if (!label) return "";
  const bg = primary ? BTN : "#ffffff";
  const fg = primary ? "#ffffff" : "#079344";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0;">` +
    `<tr><td style="border-radius:10px;background:${bg};">` +
    `<a href="${url || "#"}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:${fg};text-decoration:none;border:1px solid #079344;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">${label}</a>` +
    `</td></tr></table>`;
}

function fillVars(html: string, vars: Record<string, string | number>): string {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key) => {
    const v = vars?.[key];
    return (v == null || v === "") ? "—" : String(v);
  });
}

const SEC_DEFAULT_FOR_RENDER = SEC_DEFAULT;

export function renderTemplate(
  key: string,
  vars: Record<string, string | number> = {}
): { subject: string; html: string; text: string } | null {
  const tpl = TEMPLATES_V3[key];
  if (!tpl) return null;

  const subject = fillVars(tpl.subject, vars);
  const security = tpl.security || SEC_DEFAULT_FOR_RENDER;
  const badge = tpl.profile === "admin"
    ? '<div style="margin-top:8px;"><span style="display:inline-block;padding:3px 10px;font-size:11px;font-weight:bold;color:#b45309;background:#fef3c7;border-radius:6px;">Equipe Nomade Drive</span></div>'
    : "";

  // Monta HTML usando o mesmo shell do base-template.html
  const html = fillVars(`<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>${tpl.subject}</title>
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background: #f6f8f7; }
  a { color: #079344; }
  @media only screen and (max-width: 620px) {
    .ndb-card { width: 100% !important; }
    .ndb-pad { padding-left: 22px !important; padding-right: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f6f8f7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f6f8f7;">${tpl.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7;">
    <tr><td align="center" style="padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" class="ndb-card" cellpadding="0" cellspacing="0" style="width:640px;max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <tr><td class="ndb-pad" style="padding:26px 32px;border-bottom:1px solid #e5e7eb;">
          <img src="${LOGO}" alt="Nomade Drive Brasil" height="40" style="height:40px;width:auto;display:block;" />
          ${badge}
        </td></tr>
        <tr><td class="ndb-pad" style="padding:32px;">
          <h1 style="margin:0 0 14px;font-size:23px;line-height:1.3;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">${tpl.title}</h1>
          ${paragraphs(tpl.body)}
          ${dataBlocks(tpl.data_blocks)}
          ${button(tpl.cta, tpl.cta_url, true)}
          ${button(tpl.cta2, tpl.cta2_url, false)}
        </td></tr>
        <tr><td class="ndb-pad" style="padding:22px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 10px;font-size:12.5px;line-height:1.6;color:#6b7280;">🔒 ${security}</p>
          <p style="margin:0 0 10px;font-size:12.5px;line-height:1.6;color:#6b7280;">Precisa de ajuda? <a href="https://nomadedrive.com.br/index.html#contato" style="color:#079344;font-weight:bold;">Fale com o suporte</a>.</p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">Nomade Drive Brasil · nomadedrive.com.br · &copy; ${new Date().getFullYear()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`, vars);

  const textLines: string[] = [tpl.title, ""];
  for (const p of tpl.body) textLines.push(p.replace(/<[^>]+>/g, ""), "");
  if (tpl.data_blocks?.length) {
    for (const [k, v] of tpl.data_blocks) textLines.push(`${k}: ${v}`);
    textLines.push("");
  }
  if (tpl.cta) textLines.push(`${tpl.cta}: ${tpl.cta_url || ""}`, "");
  textLines.push(security, "", "Nomade Drive Brasil — nomadedrive.com.br");
  const text = fillVars(textLines.join("\n"), vars);

  return { subject, html, text };
}

export function getReplyTo(key: string): string | undefined {
  // Mapeia template -> endereço operacional (quando domínio Resend verificado)
  if (key.includes("pagamento")) return "pagamentos@nomadedrive.com.br";
  if (key.includes("contrato")) return "contato@nomadedrive.com.br";
  if (key.startsWith("team_")) return "operacional@nomadedrive.com.br";
  return undefined;
}
