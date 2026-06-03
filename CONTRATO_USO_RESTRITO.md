# 📑 Cláusulas de Uso Restrito do Veículo — Contrato Clicksign

> Versão: 1.0 · 03/06/2026
> Pra incluir no contrato modelo Clicksign quando configurar Fase 82-5.
> Já implementado no site (FAQ index, bloco "Quem NÃO atendemos", restrições nas páginas de carro).

---

## Cláusula 7 — Responsabilidades do Locatário (revisão completa)

O LOCATÁRIO compromete-se a:

a) Utilizar o veículo com diligência, conforme manual do fabricante e legislação de trânsito brasileira (CTB);
b) Arcar com combustível, lavagem, pedágios e multas de trânsito imputadas durante o período de locação;
c) Comunicar imediatamente à NomadeDrive qualquer sinistro, avaria, pane mecânica ou ocorrência envolvendo o veículo;
d) Permitir manutenção programada em até 7 dias após aviso da NomadeDrive;
e) Não permitir que terceiros não identificados neste contrato conduzam o veículo;
f) Devolver o veículo nas condições contratadas (combustível, limpeza básica, integridade);
g) **NÃO utilizar o veículo para nenhuma das atividades vedadas listadas no item (h) abaixo.**

**(h) USO VEDADO — declaração expressa do LOCATÁRIO:**

O LOCATÁRIO declara expressamente que NÃO utilizará o veículo objeto deste contrato para nenhuma das atividades abaixo, sendo qualquer uso enquadrado nestas hipóteses considerado **uso indevido e violação contratual grave**:

(i) **Transporte remunerado de passageiros via aplicativos** (Uber, 99, Cabify, InDriver, BlaBlaCar ou similares);

(ii) **Entregas remuneradas via aplicativos de logística** (iFood, Rappi, James, Loggi, Uber Eats, Lalamove ou similares);

(iii) **Atividade profissional remunerada de motorista**, taxista ou motorista de aplicativo em qualquer modalidade, incluindo o regime de TRPIP (Transporte Remunerado Privado Individual de Passageiros) conforme Lei 13.640/2018;

(iv) **Fretamento, transporte escolar, transporte de turismo, mototáxi** ou qualquer atividade equivalente de transporte remunerado;

(v) **Sublocação, empréstimo prolongado ou cessão** a terceiros não identificados neste contrato;

(vi) Qualquer **atividade comercial não declarada formalmente** à NomadeDrive no momento da contratação (transporte de cargas, entregas internas de empresa, frete eletrônico, etc.).

A NomadeDrive utiliza **telemetria embarcada com análise de padrões de uso** (quilometragem diária, paradas frequentes, rotas típicas de aplicativo, horários de pico). Caso o sistema detecte padrão compatível com uso para aplicativo, a NomadeDrive **notificará o LOCATÁRIO em até 48 horas**. Persistindo o padrão após notificação, o contrato será rescindido nos termos da Cláusula 11 e o veículo recolhido em até 24 horas.

---

## Cláusula 7.1 — Penalidades por Uso Indevido (NOVA)

Em caso de uso indevido conforme listado na Cláusula 7(h), o LOCATÁRIO concorda com as seguintes **penalidades cumulativas**:

a) **Multa contratual** equivalente a **50% do valor total do contrato vigente**;

b) **Cobrança integral de eventual sinistro** ocorrido durante o uso indevido, considerando que a apólice de seguro de frota da NomadeDrive **NÃO cobre** situações de uso para transporte remunerado;

c) **Cobrança de manutenção corretiva adicional** decorrente do desgaste excessivo do veículo (avaliada por oficina parceira da NomadeDrive, conforme tabela de preços vigente);

d) **Bloqueio do LOCATÁRIO em futuras locações** da NomadeDrive (inclusão em base interna de inadimplentes);

e) **Notificação ao banco de dados de inadimplentes** (SPC/Serasa/SCPC) em caso de não pagamento das penalidades dentro de 30 dias após cobrança formal.

A cobrança das penalidades pode ser realizada via:
- Captura do valor disponível na caução pré-autorizada no cartão de crédito;
- Geração de boleto bancário com vencimento em 10 dias;
- Inscrição em órgãos de proteção ao crédito após 30 dias de inadimplência;
- Ação judicial de cobrança, com inclusão de honorários advocatícios e juros legais.

---

## Cláusula 7.2 — Recomendação alternativa (NOVA, opcional)

A NomadeDrive recomenda que motoristas de aplicativo (Uber, 99, iFood, Rappi etc.) procurem **plataformas especializadas** com modelo de negócio adequado ao perfil de uso intenso, como:

- **Kovi** (https://kovi.com.br)
- **Yallo** (https://yallo.com.br)

Essas plataformas possuem apólice de seguro adaptada e modelo financeiro compatível com o desgaste superior de veículos usados em aplicativo.

---

## 🔍 Detecção via telemetria — alertas automáticos

Configuração no dashboard (Cobli ou Maxtrack) quando ativada:

### Indicadores de uso para Uber/99
- Mais de 200 km rodados por dia em média semanal
- Mais de 30 paradas curtas (3-15 min) por dia
- Atividade concentrada entre 17h-2h em dias úteis
- Rotas frequentes em zonas comerciais e bairros residenciais alternados

### Indicadores de uso para iFood/Rappi
- Mais de 50 paradas muito curtas (1-5 min) por dia
- Atividade concentrada entre 11h-14h e 18h-23h
- Velocidade média baixa, muitas acelerações/freadas
- Rotas em zonas com alta concentração de restaurantes

### Alerta N — Padrão de uso suspeito de aplicativo
- **Disparo**: telemetria detecta indicadores acima por 5 dias consecutivos
- **Para**: Daniel + Danilo (urgente)
- **Assunto**: "ATENÇÃO: Padrão suspeito de uso para aplicativo — Carro [placa] — Cliente [nome]"
- **Conteúdo**: dados de uso, comparação com padrão particular, sugestão de ação (notificação ao cliente em 48h)

---

## ✅ Onde já está implementado no site

| Local | Status |
|---|---|
| **FAQ index.html** — pergunta destacada como PRIMEIRA do bloco | ✅ commit a partir desta sessão |
| **Bloco visual "Quem NÃO atendemos"** após "Para Quem É" | ✅ |
| **Cláusula visível em carros/popular.html** após specs | ✅ |
| **Cláusula visível em carros/sedan.html** após specs | ✅ |
| **politica-privacidade.html** — Cláusula formal | ⏸ pendente reescrita |
| **termos.html** — Cláusula formal 4 (Uso Permitido) | ⏸ pendente reescrita |
| **Contrato Clicksign** — Cláusulas 7 + 7.1 + 7.2 | ⏸ pendente Fase 82-5 |
| **Telemetria Cobli** — alertas automáticos | ⏸ pendente integração Cobli |

---

## 📋 Próximas ações pra Daniel

1. **Implementação imediata no contrato**: quando ativar Clicksign (Fase 82-5), usar estas cláusulas literalmente
2. **Validação jurídica**: passar este documento pra advogado revisar antes de assinar o 1º contrato real
3. **Telemetria**: configurar alertas no painel Cobli quando integrar
4. **Treinamento Danilo**: como identificar suspeita de uso indevido na 1ª conversa com cliente
5. **Atualizar termos.html + politica-privacidade.html** com Cláusula 4 (Uso Permitido) — pra fazer quando você confirmar texto final
