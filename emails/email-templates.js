/* ====================================================================
   Nomade Drive Brasil — Catálogo de e-mails transacionais
   --------------------------------------------------------------------
   "Banco de e-mails": a definição (conteúdo) de cada e-mail da
   plataforma. O motor (render.js) junta este catálogo ao
   base-template.html e às variáveis reais para gerar o HTML final.

   Cada template tem:
     key                 — identificador único (template_key)
     profile             — perfil destinatário
     priority            — baixa | media | alta | critica
     trigger             — evento que dispara o e-mail
     subject / preheader — assunto e pré-cabeçalho
     title               — título dentro do e-mail
     body                — parágrafos (array)
     data_blocks         — linhas rótulo/valor (array de [rótulo, valor])
     cta / cta_url       — botão principal
     cta2 / cta2_url     — botão secundário (opcional)
     security            — aviso de segurança (opcional; usa padrão)

   Variáveis ({{...}}) são preenchidas pelo backend de envio no futuro.
   Enquanto não há backend, este catálogo + preview.html já permitem
   ver e validar todos os e-mails.
   ==================================================================== */
(function (root) {
  "use strict";

  var SEC_DEFAULT = "A Nomade Drive nunca pede senha, código ou dados de cartão por e-mail. Na dúvida, acesse o painel digitando nomadedrive.com.br você mesmo.";
  var SEC_PAYMENT = "Nunca informe número de cartão, CVV ou senha por e-mail. Pague somente dentro do painel oficial da Nomade Drive.";
  var SEC_LOGIN = "Se não foi você, redefina sua senha imediatamente e avise o suporte. Nunca compartilhe seus códigos de acesso.";
  var SEC_ADMIN = "E-mail interno da operação. Confirme a ação no painel administrativo antes de agir e nunca encaminhe este alerta para fora da equipe.";

  var PANEL_CLIENT = "https://nomadedrive.com.br/dashboard-cliente.html";
  var PANEL_OWNER = "https://nomadedrive.com.br/dashboard-proprietario.html";
  var PANEL_PARTNER = "https://nomadedrive.com.br/dashboard-parceiro.html";
  var PANEL_WORKSHOP = "https://nomadedrive.com.br/dashboard-oficina.html";
  var PANEL_PROTECTION = "https://nomadedrive.com.br/dashboard-protecao.html";
  var PANEL_ADMIN = "https://nomadedrive.com.br/admin.html";

  var TEMPLATES = [

    /* ============ CLIENTE ============ */
    {
      key: "client_welcome_verify_email", profile: "cliente", priority: "alta",
      trigger: "Cadastro iniciado",
      subject: "Confirme seu e-mail para começar na Nomade Drive",
      preheader: "Falta um passo para ativar sua conta de cliente.",
      title: "Bem-vindo à Nomade Drive Brasil",
      body: [
        "Olá, {{first_name}}! Sua conta foi criada. Para continuar, confirme que este e-mail é seu.",
        "O link de confirmação expira em {{expires_at}}. Depois disso, é só pedir um novo."
      ],
      cta: "Confirmar meu e-mail", cta_url: "{{cta_url}}",
      cta2: "Ver o site", cta2_url: "https://nomadedrive.com.br"
    },
    {
      key: "client_profile_under_review", profile: "cliente", priority: "alta",
      trigger: "Perfil completo enviado",
      subject: "Seu cadastro está em análise",
      preheader: "Recebemos seus dados e estamos verificando seu perfil.",
      title: "Cadastro recebido — em análise",
      body: [
        "Olá, {{first_name}}. Recebemos seu cadastro de cliente e ele está em análise pela nossa equipe.",
        "A aprovação não é automática: verificamos documentos e histórico para manter a operação segura. Avisamos por aqui assim que houver uma definição."
      ],
      data_blocks: [["Status", "Em análise"], ["Prazo estimado", "{{expires_at}}"]],
      cta: "Acompanhar pelo painel", cta_url: PANEL_CLIENT
    },
    {
      key: "client_documents_pending", profile: "cliente", priority: "alta",
      trigger: "Pendência documental",
      subject: "Há documentos pendentes no seu cadastro",
      preheader: "Envie os documentos abaixo para destravar sua análise.",
      title: "Documentos pendentes",
      body: [
        "Olá, {{first_name}}. Para seguir com sua análise, precisamos que você envie ou reenvie alguns documentos.",
        "O envio é feito com segurança na área Documentos do seu painel."
      ],
      data_blocks: [["Pendência", "{{document_name}}"], ["Motivo", "{{rejection_reason}}"]],
      cta: "Enviar documentos", cta_url: PANEL_CLIENT + "#documentos"
    },
    {
      key: "client_reservation_requested", profile: "cliente", priority: "alta",
      trigger: "Reserva criada",
      subject: "Recebemos sua solicitação de reserva",
      preheader: "Sua solicitação entrou na fila de análise operacional.",
      title: "Solicitação de reserva recebida",
      body: [
        "Olá, {{first_name}}. Recebemos sua solicitação de reserva e ela está em análise. A confirmação depende de documentação, disponibilidade e validação operacional.",
        "Você acompanha cada etapa pela linha do tempo da reserva no painel."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Veículo", "{{vehicle_name}}"], ["Período", "{{period}}"]],
      cta: "Ver a reserva", cta_url: "{{cta_url}}"
    },
    {
      key: "client_reservation_approved", profile: "cliente", priority: "alta",
      trigger: "Aprovação operacional",
      subject: "Sua reserva foi aprovada",
      preheader: "Próximo passo: concluir o pagamento e o check-in.",
      title: "Reserva aprovada 🎉",
      body: [
        "Boa notícia, {{first_name}}! Sua reserva foi aprovada.",
        "O próximo passo é concluir o pagamento. Em seguida, você poderá agendar o check-in do veículo."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Veículo", "{{vehicle_name}}"], ["Período", "{{period}}"], ["Valor mensal", "{{payment_amount}}"]],
      cta: "Concluir pagamento", cta_url: "{{cta_url}}",
      cta2: "Ver detalhes da reserva", cta2_url: "{{reservation_url}}"
    },
    {
      key: "client_payment_required", profile: "cliente", priority: "critica",
      trigger: "Pagamento pendente",
      subject: "Falta concluir o pagamento da sua reserva",
      preheader: "Sua reserva fica garantida após a confirmação do pagamento.",
      title: "Pagamento pendente",
      body: [
        "Olá, {{first_name}}. Sua reserva está aprovada, mas ainda aguarda o pagamento para ser confirmada.",
        "O pagamento é feito de forma segura dentro do painel. O link de cobrança expira em {{expires_at}}."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Valor", "{{payment_amount}}"]],
      cta: "Pagar agora", cta_url: "{{cta_url}}",
      security: SEC_PAYMENT
    },
    {
      key: "client_payment_succeeded", profile: "cliente", priority: "critica",
      trigger: "Stripe payment_intent.succeeded ou invoice.paid",
      subject: "Pagamento confirmado com sucesso",
      preheader: "Recebemos seu pagamento. Sua reserva seguiu em frente.",
      title: "Pagamento confirmado",
      body: [
        "Olá, {{first_name}}. Seu pagamento foi confirmado e sua reserva está em dia.",
        "O recibo oficial é emitido pelo nosso processador de pagamentos. Use o botão abaixo para acessá-lo."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Valor pago", "{{payment_amount}}"], ["Data", "{{paid_at}}"]],
      cta: "Ver recibo oficial", cta_url: "{{receipt_url}}",
      cta2: "Ver a reserva", cta2_url: "{{reservation_url}}",
      security: SEC_PAYMENT
    },
    {
      key: "client_payment_failed", profile: "cliente", priority: "critica",
      trigger: "Stripe payment_intent.payment_failed ou invoice.payment_failed",
      subject: "Não foi possível concluir seu pagamento",
      preheader: "Tente novamente ou use outro cartão para garantir sua reserva.",
      title: "Pagamento não concluído",
      body: [
        "Olá, {{first_name}}. A última tentativa de pagamento da sua reserva não foi concluída.",
        "Isso costuma acontecer por limite, dados do cartão ou recusa do banco. Você pode tentar de novo ou usar outro cartão pelo painel."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Valor", "{{payment_amount}}"], ["Motivo", "{{failure_reason}}"]],
      cta: "Tentar pagamento de novo", cta_url: "{{cta_url}}",
      security: SEC_PAYMENT
    },
    {
      key: "client_card_action_required", profile: "cliente", priority: "critica",
      trigger: "Stripe payment_intent.requires_action",
      subject: "Confirme seu cartão para continuar",
      preheader: "Seu banco pediu uma autenticação adicional (3D Secure).",
      title: "Autenticação do cartão necessária",
      body: [
        "Olá, {{first_name}}. Seu banco solicitou uma confirmação extra (autenticação 3D Secure) para concluir o pagamento.",
        "É um passo rápido de segurança. Sua reserva não é confirmada até a autenticação ser concluída."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Valor", "{{payment_amount}}"]],
      cta: "Confirmar com meu banco", cta_url: "{{cta_url}}",
      security: SEC_PAYMENT
    },
    {
      key: "client_deposit_authorized", profile: "cliente", priority: "critica",
      trigger: "Autorização de caução",
      subject: "Caução autorizada para sua reserva",
      preheader: "A caução é uma reserva de valor, não uma cobrança definitiva.",
      title: "Caução autorizada",
      body: [
        "Olá, {{first_name}}. A caução da sua reserva foi autorizada no seu cartão.",
        "A caução é uma garantia: o valor fica reservado e só é capturado se houver pendência prevista em contrato. Caso contrário, é liberado conforme o prazo combinado."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Valor da caução", "{{deposit_amount}}"], ["Prazo de liberação", "{{release_term}}"]],
      cta: "Ver detalhes da caução", cta_url: "{{reservation_url}}",
      security: SEC_PAYMENT
    },
    {
      key: "client_checkin_required", profile: "cliente", priority: "alta",
      trigger: "Início da reserva",
      subject: "Hora do check-in do veículo",
      preheader: "Faça o check-in para registrar a retirada do carro.",
      title: "Faça o check-in da sua reserva",
      body: [
        "Olá, {{first_name}}. Sua reserva está perto de começar. Faça o check-in pelo painel ao retirar o veículo.",
        "No check-in você registra data, local, quilometragem e combustível. Esse registro protege você e o proprietário."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Veículo", "{{vehicle_name}}"], ["Início", "{{start_date}}"]],
      cta: "Solicitar check-in", cta_url: PANEL_CLIENT + "#checklist"
    },
    {
      key: "client_checkout_required", profile: "cliente", priority: "alta",
      trigger: "Fim da reserva",
      subject: "Hora do check-out do veículo",
      preheader: "Faça o check-out para registrar a devolução do carro.",
      title: "Faça o check-out da sua reserva",
      body: [
        "Olá, {{first_name}}. Sua reserva está chegando ao fim. Faça o check-out pelo painel ao devolver o veículo.",
        "Lembre-se: a quilometragem informada no check-out não pode ser menor que a do check-in — o sistema registra tudo."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Veículo", "{{vehicle_name}}"], ["Devolução prevista", "{{end_date}}"]],
      cta: "Solicitar check-out", cta_url: PANEL_CLIENT + "#checklist"
    },
    {
      key: "client_damage_reported", profile: "cliente", priority: "alta",
      trigger: "Dano ou divergência",
      subject: "Registramos uma ocorrência na sua reserva",
      preheader: "Acompanhe a análise da ocorrência pelo painel.",
      title: "Ocorrência registrada",
      body: [
        "Olá, {{first_name}}. Uma ocorrência foi registrada na sua reserva e está em análise pela equipe de proteção.",
        "Você pode acompanhar o andamento e enviar informações pelo painel. Nada é decidido sem análise."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Tipo", "{{case_type}}"], ["Status", "Em análise"]],
      cta: "Acompanhar a ocorrência", cta_url: PANEL_CLIENT + "#protecao"
    },
    {
      key: "client_refund_or_deposit_release", profile: "cliente", priority: "alta",
      trigger: "Liberação ou retenção de caução",
      subject: "Atualização sobre liberação de valores",
      preheader: "Há uma novidade sobre a caução ou estorno da sua reserva.",
      title: "Atualização financeira da reserva",
      body: [
        "Olá, {{first_name}}. Houve uma atualização sobre valores da sua reserva — liberação de caução, retenção parcial ou estorno.",
        "Os detalhes e a justificativa estão no painel. Em caso de dúvida, fale com o suporte."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Tipo", "{{movement_type}}"], ["Valor", "{{payment_amount}}"]],
      cta: "Ver detalhes", cta_url: "{{reservation_url}}",
      security: SEC_PAYMENT
    },

    /* ============ PROPRIETÁRIO ============ */
    {
      key: "owner_welcome", profile: "proprietário", priority: "alta",
      trigger: "Cadastro iniciado/aprovado",
      subject: "Bem-vindo à área do proprietário Nomade Drive",
      preheader: "Seu painel de proprietário está pronto para uso.",
      title: "Bem-vindo, proprietário",
      body: [
        "Olá, {{first_name}}. Sua área de proprietário na Nomade Drive Brasil está ativa.",
        "Por aqui você cadastra veículos, acompanha reservas, vê o financeiro e valida check-in e check-out. Lembrando: receita é estimada, não garantida, e o veículo entra na frota após aprovação."
      ],
      cta: "Acessar meu painel", cta_url: PANEL_OWNER
    },
    {
      key: "owner_vehicle_submitted", profile: "proprietário", priority: "alta",
      trigger: "Veículo enviado",
      subject: "Recebemos o cadastro do seu veículo",
      preheader: "Seu veículo entrou na fila de análise documental e técnica.",
      title: "Veículo recebido — em análise",
      body: [
        "Olá, {{first_name}}. Recebemos o cadastro do seu veículo. Ele passará por análise documental, fotos e checklist técnico em oficina parceira.",
        "A aprovação não é garantida e depende dessas etapas. Avisamos por aqui a cada mudança de status."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Status", "Em análise"]],
      cta: "Acompanhar meu veículo", cta_url: PANEL_OWNER + "#veiculos"
    },
    {
      key: "owner_vehicle_approved", profile: "proprietário", priority: "alta",
      trigger: "Aprovação do admin",
      subject: "Seu veículo foi aprovado para operação",
      preheader: "Seu carro está apto a receber reservas.",
      title: "Veículo aprovado ✅",
      body: [
        "Boa notícia, {{first_name}}! Seu veículo foi aprovado e já pode receber solicitações de reserva.",
        "Mantenha a documentação e a manutenção em dia para evitar bloqueios operacionais."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Status", "Aprovado"]],
      cta: "Ver meu veículo", cta_url: PANEL_OWNER + "#veiculos"
    },
    {
      key: "owner_vehicle_rejected", profile: "proprietário", priority: "alta",
      trigger: "Recusa com motivo",
      subject: "Seu veículo precisa de ajustes antes da aprovação",
      preheader: "Veja o que ajustar para reenviar o cadastro.",
      title: "Veículo precisa de ajustes",
      body: [
        "Olá, {{first_name}}. Após a análise, seu veículo ainda não pôde ser aprovado.",
        "Veja o motivo abaixo, faça os ajustes e reenvie. Estamos à disposição para ajudar."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Motivo", "{{rejection_reason}}"]],
      cta: "Revisar e reenviar", cta_url: PANEL_OWNER + "#veiculos"
    },
    {
      key: "owner_reservation_received", profile: "proprietário", priority: "alta",
      trigger: "Reserva solicitada",
      subject: "Seu veículo recebeu uma solicitação de reserva",
      preheader: "Uma nova solicitação entrou para o seu veículo.",
      title: "Nova solicitação de reserva",
      body: [
        "Olá, {{first_name}}. Seu veículo recebeu uma solicitação de reserva. A operação fará a análise do cliente e da documentação.",
        "Você acompanha cada etapa pelo painel."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Reserva", "{{reservation_id}}"], ["Período", "{{period}}"]],
      cta: "Ver no painel", cta_url: PANEL_OWNER + "#locacao"
    },
    {
      key: "owner_reservation_confirmed", profile: "proprietário", priority: "alta",
      trigger: "Confirmação final",
      subject: "Reserva confirmada para seu veículo",
      preheader: "Sua locação está confirmada e seguirá para o check-in.",
      title: "Reserva confirmada",
      body: [
        "Olá, {{first_name}}. A reserva do seu veículo foi confirmada.",
        "O cliente fará o check-in na retirada. Você valida cada check-in e check-out pelo painel."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Reserva", "{{reservation_id}}"], ["Período", "{{period}}"], ["Repasse estimado", "{{owner_amount}}"]],
      cta: "Acompanhar a locação", cta_url: PANEL_OWNER + "#locacao"
    },
    {
      key: "owner_financial_statement_ready", profile: "proprietário", priority: "alta",
      trigger: "Fechamento financeiro",
      subject: "Seu demonstrativo financeiro foi atualizado",
      preheader: "Confira receita, taxa e repasse estimado da sua locação.",
      title: "Demonstrativo financeiro atualizado",
      body: [
        "Olá, {{first_name}}. Seu demonstrativo financeiro foi atualizado no painel.",
        "Valores são estimativas conforme o contrato. Quando o fechamento ainda não estiver pronto, alguns campos aparecem como “em processamento”."
      ],
      data_blocks: [["Receita bruta", "{{gross_amount}}"], ["Taxa da plataforma", "{{platform_fee}}"], ["Repasse estimado", "{{owner_amount}}"]],
      cta: "Ver o financeiro", cta_url: PANEL_OWNER + "#financeiro"
    },
    {
      key: "owner_payout_scheduled", profile: "proprietário", priority: "alta",
      trigger: "Repasse aprovado",
      subject: "Repasse programado",
      preheader: "Seu repasse foi programado para a conta cadastrada.",
      title: "Repasse programado",
      body: [
        "Olá, {{first_name}}. Um repasse foi programado para a sua conta bancária cadastrada.",
        "O prazo de compensação depende do banco. Em caso de alteração de dados bancários, o repasse passa por verificação de segurança."
      ],
      data_blocks: [["Valor", "{{payout_amount}}"], ["Previsão", "{{payout_date}}"]],
      cta: "Ver o financeiro", cta_url: PANEL_OWNER + "#financeiro"
    },
    {
      key: "owner_payout_blocked", profile: "proprietário", priority: "critica",
      trigger: "Pendência, fraude ou dados bancários alterados",
      subject: "Repasse bloqueado temporariamente",
      preheader: "Há uma verificação pendente antes de liberar seu repasse.",
      title: "Repasse bloqueado temporariamente",
      body: [
        "Olá, {{first_name}}. Um repasse foi bloqueado temporariamente por uma verificação de segurança — pode ser pendência, revisão antifraude ou alteração recente de dados bancários.",
        "Isso protege o seu dinheiro. Verifique as pendências no painel ou fale com o suporte."
      ],
      data_blocks: [["Valor", "{{payout_amount}}"], ["Motivo", "{{block_reason}}"]],
      cta: "Ver pendências", cta_url: PANEL_OWNER + "#financeiro",
      security: SEC_LOGIN
    },
    {
      key: "owner_maintenance_due", profile: "proprietário", priority: "alta",
      trigger: "Alerta preventivo",
      subject: "Manutenção ou revisão próxima do vencimento",
      preheader: "Seu veículo está perto de uma manutenção recomendada.",
      title: "Manutenção próxima do vencimento",
      body: [
        "Olá, {{first_name}}. Seu veículo está se aproximando de uma manutenção recomendada, com base na quilometragem registrada.",
        "Manter a manutenção em dia evita bloqueios operacionais e protege a sua receita."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Item", "{{maintenance_item}}"], ["Km atual", "{{current_km}}"]],
      cta: "Ver manutenção", cta_url: PANEL_OWNER + "#manutencao"
    },
    {
      key: "owner_km_discrepancy_alert", profile: "proprietário", priority: "critica",
      trigger: "Tentativa de redução ou divergência de vistoria",
      subject: "Atenção: divergência de quilometragem identificada",
      preheader: "Registramos uma divergência de km no seu veículo.",
      title: "Divergência de quilometragem",
      body: [
        "Olá, {{first_name}}. O sistema identificou uma divergência de quilometragem no seu veículo. A quilometragem nunca pode regredir — toda tentativa fica registrada em log de auditoria.",
        "A equipe vai analisar o caso. Quilometragem, vistorias, despesas e documentos têm rastreabilidade e não podem ser alterados sem registro."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Km anterior", "{{previous_km}}"], ["Km informado", "{{reported_km}}"]],
      cta: "Ver o histórico do veículo", cta_url: PANEL_OWNER + "#manutencao",
      security: SEC_LOGIN
    },

    /* ============ PARCEIRO DE INDICAÇÃO ============ */
    {
      key: "partner_welcome", profile: "parceiro", priority: "media",
      trigger: "Cadastro aprovado",
      subject: "Sua área de parceiro está pronta",
      preheader: "Comece a indicar e acompanhe suas comissões.",
      title: "Bem-vindo, parceiro",
      body: [
        "Olá, {{first_name}}. Sua área de parceiro de indicação foi aprovada.",
        "Use seu código de indicação para registrar leads. Comissões só se tornam elegíveis após validação, aprovação e conversão real — nunca são garantidas."
      ],
      cta: "Acessar meu painel", cta_url: PANEL_PARTNER
    },
    {
      key: "partner_referral_received", profile: "parceiro", priority: "media",
      trigger: "Nova indicação",
      subject: "Indicação recebida com sucesso",
      preheader: "Sua indicação foi registrada e entrará em análise.",
      title: "Indicação registrada",
      body: [
        "Olá, {{first_name}}. Recebemos uma nova indicação registrada com o seu código.",
        "Ela passará por validação. Você acompanha o status de cada lead pelo painel."
      ],
      data_blocks: [["Indicado", "{{referred_name}}"], ["Tipo", "{{referral_type}}"], ["Status", "Em análise"]],
      cta: "Ver minhas indicações", cta_url: PANEL_PARTNER + "#indicacoes"
    },
    {
      key: "partner_referral_converted", profile: "parceiro", priority: "media",
      trigger: "Lead qualificado",
      subject: "Sua indicação virou uma oportunidade válida",
      preheader: "Um lead que você indicou avançou no funil.",
      title: "Indicação convertida",
      body: [
        "Boa notícia, {{first_name}}! Uma indicação sua foi convertida em oportunidade válida.",
        "A comissão entra em apuração e só é confirmada após as regras vigentes da plataforma."
      ],
      data_blocks: [["Indicado", "{{referred_name}}"], ["Etapa", "Convertida"]],
      cta: "Ver comissões", cta_url: PANEL_PARTNER + "#comissoes"
    },
    {
      key: "partner_commission_pending", profile: "parceiro", priority: "media",
      trigger: "Reserva/pagamento em análise",
      subject: "Comissão em validação",
      preheader: "Sua comissão está sendo apurada.",
      title: "Comissão em validação",
      body: [
        "Olá, {{first_name}}. Uma comissão sua está em validação, aguardando a confirmação da reserva e do pagamento relacionados.",
        "Comissões aparecem como estimadas até a apuração final."
      ],
      data_blocks: [["Indicação", "{{referred_name}}"], ["Status", "Estimada / em validação"]],
      cta: "Acompanhar comissões", cta_url: PANEL_PARTNER + "#comissoes"
    },
    {
      key: "partner_commission_approved", profile: "parceiro", priority: "media",
      trigger: "Validação concluída",
      subject: "Comissão aprovada",
      preheader: "Sua comissão foi validada e está elegível para pagamento.",
      title: "Comissão aprovada",
      body: [
        "Olá, {{first_name}}. Uma comissão sua foi aprovada após a validação.",
        "Ela entra na fila de pagamento conforme o calendário e as regras da plataforma."
      ],
      data_blocks: [["Indicação", "{{referred_name}}"], ["Status", "Aprovada"]],
      cta: "Ver comissões", cta_url: PANEL_PARTNER + "#comissoes"
    },
    {
      key: "partner_commission_paid", profile: "parceiro", priority: "alta",
      trigger: "Pagamento enviado",
      subject: "Comissão paga",
      preheader: "O pagamento da sua comissão foi enviado.",
      title: "Comissão paga ✅",
      body: [
        "Olá, {{first_name}}. O pagamento de uma comissão sua foi enviado para a conta cadastrada.",
        "O prazo de compensação depende do banco."
      ],
      data_blocks: [["Indicação", "{{referred_name}}"], ["Valor", "{{payout_amount}}"], ["Data", "{{payout_date}}"]],
      cta: "Ver o histórico", cta_url: PANEL_PARTNER + "#comissoes"
    },
    {
      key: "partner_fraud_review", profile: "parceiro", priority: "alta",
      trigger: "Suspeita ou duplicidade",
      subject: "Indicação em revisão de segurança",
      preheader: "Uma indicação sua entrou em análise antifraude.",
      title: "Indicação em revisão de segurança",
      body: [
        "Olá, {{first_name}}. Uma indicação registrada com o seu código entrou em revisão de segurança por suspeita de duplicidade ou inconsistência.",
        "Isso é um procedimento padrão de proteção. Se precisar esclarecer algo, fale com o suporte."
      ],
      data_blocks: [["Indicação", "{{referred_name}}"], ["Status", "Em revisão de segurança"]],
      cta: "Falar com o suporte", cta_url: "{{support_url}}",
      security: SEC_LOGIN
    },

    /* ============ OFICINA ============ */
    {
      key: "workshop_welcome", profile: "oficina", priority: "alta",
      trigger: "Cadastro aprovado",
      subject: "Sua oficina foi cadastrada na Nomade Drive",
      preheader: "Sua oficina está credenciada para receber ordens de serviço.",
      title: "Oficina credenciada",
      body: [
        "Olá, {{first_name}}. Sua oficina foi credenciada na Nomade Drive Brasil.",
        "Por aqui você recebe ordens de serviço, envia orçamentos e laudos técnicos e registra checklists dos veículos."
      ],
      cta: "Acessar o painel da oficina", cta_url: PANEL_WORKSHOP
    },
    {
      key: "workshop_service_order_created", profile: "oficina", priority: "alta",
      trigger: "OS criada",
      subject: "Nova ordem de serviço disponível",
      preheader: "Uma OS foi atribuída à sua oficina.",
      title: "Nova ordem de serviço",
      body: [
        "Olá, {{first_name}}. Uma nova ordem de serviço foi atribuída à sua oficina.",
        "Acesse o painel para ver os detalhes do veículo e iniciar o atendimento."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["OS", "{{service_order_id}}"]],
      cta: "Ver a ordem de serviço", cta_url: PANEL_WORKSHOP
    },
    {
      key: "workshop_quote_requested", profile: "oficina", priority: "alta",
      trigger: "Orçamento pendente",
      subject: "Envie o orçamento deste serviço",
      preheader: "Há um serviço aguardando o seu orçamento.",
      title: "Orçamento solicitado",
      body: [
        "Olá, {{first_name}}. Um serviço está aguardando o orçamento da sua oficina.",
        "Envie o orçamento pelo painel para que a operação possa aprovar e seguir."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["OS", "{{service_order_id}}"]],
      cta: "Enviar orçamento", cta_url: PANEL_WORKSHOP
    },
    {
      key: "workshop_quote_approved", profile: "oficina", priority: "alta",
      trigger: "Admin/proprietário aprovou",
      subject: "Orçamento aprovado",
      preheader: "Você já pode iniciar o serviço.",
      title: "Orçamento aprovado",
      body: [
        "Olá, {{first_name}}. O orçamento enviado pela sua oficina foi aprovado.",
        "Você já pode iniciar o serviço. Lembre-se de registrar o checklist e o laudo no painel."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["OS", "{{service_order_id}}"]],
      cta: "Abrir a ordem de serviço", cta_url: PANEL_WORKSHOP
    },
    {
      key: "workshop_checklist_required", profile: "oficina", priority: "alta",
      trigger: "Antes/depois de serviço",
      subject: "Checklist obrigatório pendente",
      preheader: "Registre o checklist técnico para concluir a etapa.",
      title: "Checklist pendente",
      body: [
        "Olá, {{first_name}}. Há um checklist técnico obrigatório pendente para um veículo da sua oficina.",
        "O checklist com fotos é o que documenta o estado do veículo e protege todas as partes."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Etapa", "{{checklist_stage}}"]],
      cta: "Registrar checklist", cta_url: PANEL_WORKSHOP
    },
    {
      key: "workshop_report_submitted", profile: "oficina", priority: "media",
      trigger: "Laudo enviado",
      subject: "Laudo recebido com sucesso",
      preheader: "Recebemos o laudo técnico enviado pela sua oficina.",
      title: "Laudo recebido",
      body: [
        "Olá, {{first_name}}. Recebemos o laudo técnico enviado pela sua oficina. Obrigado pelo registro.",
        "A operação dará sequência conforme o resultado do laudo."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["OS", "{{service_order_id}}"]],
      cta: "Ver no painel", cta_url: PANEL_WORKSHOP
    },
    {
      key: "workshop_quality_alert", profile: "oficina", priority: "alta",
      trigger: "Reclamação/divergência",
      subject: "Atenção: pendência de qualidade identificada",
      preheader: "Uma divergência foi registrada em um serviço da sua oficina.",
      title: "Pendência de qualidade",
      body: [
        "Olá, {{first_name}}. Foi registrada uma divergência ou reclamação de qualidade em um serviço da sua oficina.",
        "Acesse o painel para ver os detalhes e regularizar a pendência."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["OS", "{{service_order_id}}"], ["Pendência", "{{quality_issue}}"]],
      cta: "Ver a pendência", cta_url: PANEL_WORKSHOP
    },

    /* ============ PROTEÇÃO / SINISTROS ============ */
    {
      key: "protection_case_opened", profile: "proteção", priority: "critica",
      trigger: "Sinistro/ocorrência",
      subject: "Novo caso de proteção aberto",
      preheader: "Um caso de proteção foi aberto e precisa de triagem.",
      title: "Novo caso de proteção",
      body: [
        "Olá, {{first_name}}. Um novo caso de proteção foi aberto e está disponível para triagem no painel.",
        "Confira a descrição e a reserva relacionada para iniciar a análise."
      ],
      data_blocks: [["Caso", "{{case_id}}"], ["Tipo", "{{case_type}}"], ["Veículo", "{{vehicle_name}}"]],
      cta: "Abrir o caso", cta_url: PANEL_PROTECTION + "#triagem"
    },
    {
      key: "protection_documents_required", profile: "proteção", priority: "alta",
      trigger: "Pendência",
      subject: "Documentos necessários para análise",
      preheader: "Um caso de proteção aguarda documentos para seguir.",
      title: "Documentos pendentes no caso",
      body: [
        "Olá, {{first_name}}. Um caso de proteção em análise precisa de documentos adicionais para avançar.",
        "Solicite ou registre os documentos pelo painel para destravar a análise."
      ],
      data_blocks: [["Caso", "{{case_id}}"], ["Pendência", "{{document_name}}"]],
      cta: "Ver o caso", cta_url: PANEL_PROTECTION + "#triagem"
    },
    {
      key: "protection_evidence_received", profile: "proteção", priority: "media",
      trigger: "Upload realizado",
      subject: "Evidência recebida",
      preheader: "Uma nova evidência foi anexada a um caso de proteção.",
      title: "Evidência recebida",
      body: [
        "Olá, {{first_name}}. Uma nova evidência foi anexada a um caso de proteção em análise.",
        "Acesse o painel para revisar o material e dar sequência à triagem."
      ],
      data_blocks: [["Caso", "{{case_id}}"], ["Evidência", "{{evidence_name}}"]],
      cta: "Revisar o caso", cta_url: PANEL_PROTECTION + "#triagem"
    },
    {
      key: "protection_case_decision", profile: "proteção", priority: "critica",
      trigger: "Aprovação/negação",
      subject: "Decisão emitida para o caso",
      preheader: "Uma decisão foi registrada em um caso de proteção.",
      title: "Decisão do caso registrada",
      body: [
        "Olá, {{first_name}}. Uma decisão foi emitida para um caso de proteção — cobertura aprovada, negada ou parcial.",
        "A decisão e a justificativa ficam registradas no painel, com rastreabilidade."
      ],
      data_blocks: [["Caso", "{{case_id}}"], ["Decisão", "{{case_decision}}"], ["Valor estimado", "{{estimated_amount}}"]],
      cta: "Ver a decisão", cta_url: PANEL_PROTECTION + "#triagem"
    },
    {
      key: "protection_case_closed", profile: "proteção", priority: "alta",
      trigger: "Finalização",
      subject: "Caso encerrado",
      preheader: "Um caso de proteção foi finalizado.",
      title: "Caso de proteção encerrado",
      body: [
        "Olá, {{first_name}}. Um caso de proteção foi encerrado. O histórico completo fica disponível no painel.",
        "Obrigado pelo acompanhamento."
      ],
      data_blocks: [["Caso", "{{case_id}}"], ["Status", "Encerrado"]],
      cta: "Ver o histórico", cta_url: PANEL_PROTECTION + "#triagem"
    },

    /* ============ ADMIN / SUPER ADMIN ============ */
    {
      key: "admin_new_user_registered", profile: "admin", priority: "media",
      trigger: "Cadastro novo",
      subject: "[Admin] Novo usuário cadastrado",
      preheader: "Um novo cadastro entrou na plataforma.",
      title: "Novo usuário cadastrado",
      body: [
        "Um novo usuário se cadastrou na plataforma e pode precisar de análise conforme o perfil.",
        "Verifique o cadastro no painel administrativo."
      ],
      data_blocks: [["Perfil", "{{user.profile_type}}"], ["Usuário", "{{user_email}}"], ["Severidade", "Informativo"]],
      cta: "Abrir o painel admin", cta_url: PANEL_ADMIN + "#cadastros",
      security: SEC_ADMIN
    },
    {
      key: "admin_document_review_required", profile: "admin", priority: "alta",
      trigger: "Upload/documento pendente",
      subject: "[Admin] Documento aguardando análise",
      preheader: "Há um documento de identidade aguardando revisão.",
      title: "Documento aguardando análise",
      body: [
        "Um documento foi enviado e aguarda revisão da equipe na área de Verificação de identidade.",
        "Confira o arquivo e aprove ou recuse pelo painel administrativo."
      ],
      data_blocks: [["Tipo", "{{document_name}}"], ["Usuário", "{{user_email}}"], ["Severidade", "Alta"]],
      cta: "Revisar documento", cta_url: PANEL_ADMIN + "#documentos",
      security: SEC_ADMIN
    },
    {
      key: "admin_payment_failed_alert", profile: "admin", priority: "critica",
      trigger: "Stripe falhou",
      subject: "[Admin] Falha de pagamento requer atenção",
      preheader: "Um pagamento falhou e pode afetar uma reserva.",
      title: "Falha de pagamento",
      body: [
        "Um pagamento falhou no processador e pode impactar uma reserva ativa.",
        "Verifique a reserva e o cliente envolvidos e defina a ação conforme a regra de cobrança."
      ],
      data_blocks: [["Reserva", "{{reservation_id}}"], ["Valor", "{{payment_amount}}"], ["Severidade", "Crítica"]],
      cta: "Ver no painel admin", cta_url: PANEL_ADMIN,
      security: SEC_ADMIN
    },
    {
      key: "admin_dispute_created", profile: "admin", priority: "critica",
      trigger: "charge.dispute.created",
      subject: "[Admin] Disputa/chargeback aberto no Stripe",
      preheader: "Uma disputa foi aberta — ação imediata recomendada.",
      title: "Disputa / chargeback aberto",
      body: [
        "Uma disputa (chargeback) foi aberta no processador de pagamentos. Ações financeiras relacionadas devem ser congeladas até a análise.",
        "Abra o caso de disputa e reúna as evidências dentro do prazo do processador."
      ],
      data_blocks: [["Cobrança", "{{charge_id}}"], ["Valor", "{{payment_amount}}"], ["Severidade", "Crítica"]],
      cta: "Tratar a disputa", cta_url: PANEL_ADMIN,
      security: SEC_ADMIN
    },
    {
      key: "admin_webhook_failed", profile: "admin", priority: "alta",
      trigger: "Webhook com erro",
      subject: "[Admin] Falha no processamento de webhook",
      preheader: "Um webhook falhou e precisa de reprocessamento.",
      title: "Falha de webhook",
      body: [
        "Um webhook não foi processado corretamente. Eventos de pagamento podem estar dessincronizados.",
        "Verifique o log e reprocesse o evento pelo painel."
      ],
      data_blocks: [["Evento", "{{event_type}}"], ["Erro", "{{error_message}}"], ["Severidade", "Alta"]],
      cta: "Ver logs", cta_url: PANEL_ADMIN,
      security: SEC_ADMIN
    },
    {
      key: "admin_bank_data_changed", profile: "admin", priority: "critica",
      trigger: "Proprietário/parceiro/oficina alterou banco",
      subject: "[Admin] Dados bancários foram alterados",
      preheader: "Uma conta bancária de repasse foi alterada.",
      title: "Alteração de dados bancários",
      body: [
        "Um usuário alterou os dados bancários cadastrados para repasse. Repasses dessa conta entram em verificação de segurança.",
        "Confirme a legitimidade da alteração antes de liberar pagamentos."
      ],
      data_blocks: [["Usuário", "{{user_email}}"], ["Perfil", "{{user.profile_type}}"], ["Severidade", "Crítica"]],
      cta: "Verificar no painel", cta_url: PANEL_ADMIN,
      security: SEC_ADMIN
    },
    {
      key: "admin_permission_changed", profile: "admin", priority: "critica",
      trigger: "Mudança de acesso",
      subject: "[Admin] Permissão administrativa alterada",
      preheader: "Um nível de acesso administrativo mudou.",
      title: "Permissão administrativa alterada",
      body: [
        "Uma permissão administrativa foi alterada na plataforma. Toda mudança de acesso é registrada em auditoria.",
        "Confirme se a alteração foi autorizada."
      ],
      data_blocks: [["Alvo", "{{user_email}}"], ["Ação", "{{permission_change}}"], ["Por", "{{admin_actor}}"]],
      cta: "Ver auditoria", cta_url: PANEL_ADMIN + "#log",
      security: SEC_ADMIN
    },
    {
      key: "admin_restricted_access_denied", profile: "admin", priority: "alta",
      trigger: "Admin restrito tentou ação proibida",
      subject: "[Admin] Tentativa de acesso negada",
      preheader: "Um acesso restrito foi bloqueado pela plataforma.",
      title: "Tentativa de acesso negada",
      body: [
        "Uma tentativa de acessar uma área ou ação restrita foi negada pelo controle de permissões.",
        "Se a tentativa não for esperada, investigue a conta envolvida."
      ],
      data_blocks: [["Conta", "{{user_email}}"], ["Recurso", "{{denied_resource}}"], ["Severidade", "Alta"]],
      cta: "Ver auditoria", cta_url: PANEL_ADMIN + "#log",
      security: SEC_ADMIN
    },
    {
      key: "admin_global_setting_changed", profile: "admin", priority: "critica",
      trigger: "Preço, taxa, documentação, termos",
      subject: "[Admin] Regra global alterada",
      preheader: "Uma configuração global da plataforma foi alterada.",
      title: "Regra global alterada",
      body: [
        "Uma regra global — preço, taxa, documentação ou termos — foi alterada. Mudanças assim afetam toda a operação.",
        "Confirme a alteração e a pessoa responsável na auditoria."
      ],
      data_blocks: [["Configuração", "{{setting_name}}"], ["Alterada por", "{{admin_actor}}"], ["Severidade", "Crítica"]],
      cta: "Ver auditoria", cta_url: PANEL_ADMIN + "#log",
      security: SEC_ADMIN
    },
    {
      key: "admin_km_fraud_alert", profile: "admin", priority: "critica",
      trigger: "Km reduzido/divergente",
      subject: "[Admin] Alerta de possível manipulação de quilometragem",
      preheader: "O antifraude bloqueou uma regressão de quilometragem.",
      title: "Alerta de quilometragem",
      body: [
        "O sistema antifraude bloqueou uma tentativa de reduzir a quilometragem de um veículo. O km anterior, maior, foi mantido.",
        "A tentativa ficou registrada em auditoria. Avalie o veículo e a conta envolvidos."
      ],
      data_blocks: [["Veículo", "{{vehicle_name}}"], ["Km anterior", "{{previous_km}}"], ["Km tentado", "{{reported_km}}"]],
      cta: "Ver auditoria", cta_url: PANEL_ADMIN + "#log",
      security: SEC_ADMIN
    }

  ];

  var DEFAULTS = {
    security_default: SEC_DEFAULT,
    support_url: "https://nomadedrive.com.br/index.html#contato",
    logo_url: "https://nomadedrive.com.br/images/logo-nomade-drive.jpg"
  };

  var api = { templates: TEMPLATES, defaults: DEFAULTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NDB_EMAILS = api;
})(typeof window !== "undefined" ? window : this);
