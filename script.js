/* ===== NomadDrive Brasil — behavior ===== */

/* ---- CONFIG: edit these ---- */
const CONFIG = {
  whatsapp: "5534999999999",          // <-- replace with the real WhatsApp number (country+area+number, digits only)
  email: "hello@nomaddrive.com.br",   // <-- replace with the real email
  instagram: "https://instagram.com/", // <-- replace with the real Instagram URL
};

/* ---- translations ---- */
const I18N = {
  en: {
    "nav.how": "How it works", "nav.car": "The car", "nav.pricing": "Pricing",
    "nav.safety": "Safety", "nav.faq": "FAQ", "nav.cta": "Get a quote",

    "hero.badge": "Built for travelers between the US & Brazil",
    "hero.title": "Skip the agency markup. Drive Brazil for less.",
    "hero.sub": "Big agencies charge a premium for monthly rentals. We're one well-kept car, properly insured, offered by referral — at a fair, all-in monthly price.",
    "hero.cta1": "Request your quote", "hero.cta2": "See how it works",
    "hero.stat1": "all-in, taxes included",
    "hero.stat2v": "Owner-direct", "hero.stat2": "no agency markup",
    "hero.stat3": "personal handover & support",
    "hero.pricecard.tag": "Your monthly price",
    "hero.pricecard.note": "≈ $530 USD · taxes included · backup car",
    "photo.hero": "Add <strong>images/hero.jpg</strong><br /><em>(white Cobalt photo — see README)</em>",

    "strip.1": "✓ Fully insured for rental use", "strip.2": "✓ By referral only",
    "strip.3": "✓ Backup car if anything happens", "strip.4": "✓ English-speaking support",
    "strip.5": "✓ Based in Uberlândia, MG",

    "problem.eyebrow": "The problem",
    "problem.title": "Monthly rentals in Brazil are quietly expensive",
    "problem.sub": "Visiting family for one or two months shouldn't cost a fortune. But the big chains price for their overhead — huge fleets, staff, branches — not for you.",
    "problem.c1.title": "A premium hiding in the daily rate",
    "problem.c1.body": "A daily rate looks small — but over a one or two-month stay it quietly adds up to far more than it should cost to rent a car.",
    "problem.c2.title": "Priced for their costs, not yours",
    "problem.c2.body": "Fleets, employees and branches are expensive. That overhead is baked into every daily rate you pay.",
    "problem.c3.title": "No one speaks your situation",
    "problem.c3.body": "Long stays, a foreign license, family visits — generic counters aren't built for the US-to-Brazil traveler.",

    "how.eyebrow": "How it works",
    "how.title": "Simple, personal, and by referral",
    "how.sub": "We keep it small on purpose. Fewer cars, trusted renters, and a real person on the other side of the conversation.",
    "how.s1.title": "You're referred",
    "how.s1.body": "A friend or family member who knows us connects you. Referral-first keeps everyone safe and trusted.",
    "how.s2.title": "Request a quote",
    "how.s2.body": "Tell us your dates and pick-up city. We confirm availability and send an all-in monthly price.",
    "how.s3.title": "Sign & secure",
    "how.s3.body": "A clear rental contract, ID/license check, a refundable deposit and a quick photo inspection.",
    "how.s4.title": "Pick up & drive",
    "how.s4.body": "We hand over the car in person in Uberlândia and stay reachable for your whole trip.",

    "photo.car": "images/car-exterior.jpg", "photo.interior": "images/car-interior.jpg", "photo.trunk": "images/car-trunk.jpg",
    "car.eyebrow": "The car",
    "car.title": "2018 Chevrolet Cobalt Elite. Well kept. Ready for the road.",
    "car.sub": "A 2018 Chevrolet Cobalt Elite — automatic, fully optioned, white. A comfortable mid-size sedan: cheap to maintain and roomy for road trips and family.",
    "car.spec1.k": "Year", "car.spec1.v": "2018",
    "car.spec2.k": "Transmission", "car.spec2.v": "Automatic",
    "car.spec3.k": "Model", "car.spec3.v": "Chevrolet Cobalt Elite",
    "car.spec4.k": "Color", "car.spec4.v": "White",
    "car.spec5.k": "Mileage", "car.spec5.v": "120,000 km",
    "car.spec6.k": "Best for", "car.spec6.v": "Long stays & travel",
    "car.editnote": "Add real photos of the car to the <strong>/images</strong> folder — see the README.",
    "car.cta": "Check availability",

    "pricing.eyebrow": "Pricing",
    "pricing.title": "Fair, all-in, no surprises",
    "pricing.sub": "One transparent monthly rate with taxes included. Longer stays get a better rate. USD figures are approximate.",
    "pricing.feat.taxes": "Taxes included",
    "pricing.feat.insurance": "Insured for rental use",
    "pricing.feat.backup": "Backup car included",
    "pricing.p1.title": "1 month", "pricing.p1.usd": "≈ $530 USD", "pricing.p1.cta": "Request quote",
    "pricing.p2.flag": "Most popular", "pricing.p2.title": "2 months",
    "pricing.p2.usd": "≈ $1,020 USD · taxes included",
    "pricing.p2.feat": "Priority support during your stay", "pricing.p2.cta": "Request quote",
    "pricing.p3.title": "3+ months", "pricing.p3.price": "Custom",
    "pricing.p3.usd": "Best monthly rate — let's talk", "pricing.p3.cta": "Talk to us",
    "compare.title": "NomadDrive vs. a big agency",
    "compare.col1": "Big agency",
    "compare.r1": "2-month rental, same car class", "compare.r1v": "Noticeably higher",
    "compare.r2": "Taxes included",
    "compare.r3": "Backup car", "compare.r3v": "Sometimes",
    "compare.r4": "English-speaking, personal contact",
    "compare.r5": "In-person handover", "compare.r5v": "Counter only",
    "compare.note": "Prices and exchange rates vary and depend on the car. Your quote is always confirmed in writing.",

    "safety.eyebrow": "Safety & trust",
    "safety.title": "How we keep everyone protected",
    "safety.sub": "A small operation can still be a serious one. Here's how risk is handled on both sides.",
    "safety.c1.title": "Proper insurance",
    "safety.c1.body": "The car carries insurance that covers rental use — not just a personal policy.",
    "safety.c2.title": "Clear contract",
    "safety.c2.body": "A written rental agreement, ID and license verification, and a photo inspection at pick-up and return.",
    "safety.c3.title": "Tracker equipped",
    "safety.c3.body": "The car has a GPS tracker for recovery and peace of mind on both sides.",
    "safety.c4.title": "Referral-first",
    "safety.c4.body": "We start with people connected to our circle. Trust before scale.",
    "safety.disclaimer": "Note: insurance terms, deposit and contract details are confirmed individually for each rental. This page is informational and not a binding offer.",

    "who.eyebrow": "Who it's for",
    "who.title": "Made for the US-to-Brazil traveler",
    "who.sub": "If you live in the States and come back to spend real time in Brazil, you're exactly who we built this for.",
    "who.l1": "Visiting family for 1–3 months",
    "who.l2": "Want an automatic, comfortable car without agency prices",
    "who.l3": "Prefer dealing with a real, English-speaking person",
    "who.l4": "Value a backup car and a contract that protects you",
    "photo.travel": "images/travel.jpg",

    "quote.eyebrow": "Get a quote",
    "quote.title": "Tell us your dates — we'll reply fast",
    "quote.sub": "Fill this in and it opens WhatsApp with your details ready to send. No account, no spam.",
    "quote.p1": "Reply within 24 hours", "quote.p2": "All-in price in writing", "quote.p3": "No commitment to ask",
    "form.name": "Your name", "form.contact": "Email or WhatsApp",
    "form.start": "Pick-up date", "form.months": "How long?",
    "form.months.1": "1 month", "form.months.2": "2 months", "form.months.3": "3 months", "form.months.4": "4+ months",
    "form.city": "Pick-up city", "form.ref": "Who referred you?", "form.optional": "(optional)",
    "form.msg": "Anything else?", "form.submit": "Send via WhatsApp",
    "form.altprefix": "Prefer email?", "form.altlink": "Email us instead",
    "form.err": "Please fill in your name and a way to reach you.",

    "faq.eyebrow": "FAQ", "faq.title": "Good questions, straight answers",
    "faq.q1": "Can I rent without a referral?",
    "faq.a1": "Right now we work referral-first to keep things trusted and safe. If you don't have one, reach out anyway — tell us your situation and we'll see what's possible.",
    "faq.q2": "Can I drive with my US license?",
    "faq.a2": "Generally a valid foreign license is accepted in Brazil for visitors, often alongside an international permit. We confirm the exact requirement with you before pick-up.",
    "faq.q3": "What happens if the car has a problem?",
    "faq.a3": "You get a backup car so you're never stranded, and we stay reachable for your whole trip.",
    "faq.q4": "Is there a deposit?",
    "faq.a4": "Yes — a refundable security deposit is part of the contract. The amount is confirmed in your quote.",
    "faq.q5": "Which cities do you serve?",
    "faq.a5": "Pick-up is in Uberlândia, MG. From there the car is yours to travel anywhere in Brazil within the contract terms.",
    "faq.q6": "How do I pay?",
    "faq.a6": "We'll arrange a convenient method when you book — discussed openly, with everything in writing.",

    "final.title": "Coming to Brazil soon?",
    "final.sub": "Lock in a fair monthly price before your trip. It starts with a quick message.",
    "final.cta": "Request your quote",

    "footer.tag": "Fair monthly car rental for travelers between the US and Brazil.",
    "footer.contact": "Contact", "footer.whatsapp": "WhatsApp", "footer.email": "hello@nomaddrive.com.br",
    "footer.instagram": "Instagram", "footer.explore": "Explore",
    "footer.legal": "© 2026 NomadDrive Brasil. Informational website — not a binding offer. Rental terms, insurance and contract confirmed individually.",
  },

  pt: {
    "nav.how": "Como funciona", "nav.car": "O carro", "nav.pricing": "Preços",
    "nav.safety": "Segurança", "nav.faq": "Dúvidas", "nav.cta": "Pedir orçamento",

    "hero.badge": "Feito para quem vive entre os EUA e o Brasil",
    "hero.title": "Fuja do preço de locadora. Dirija no Brasil por menos.",
    "hero.sub": "As grandes locadoras cobram caro pelo aluguel mensal. Aqui é um carro só, bem cuidado, com seguro adequado e oferecido por indicação — a um preço mensal justo, tudo incluso.",
    "hero.cta1": "Pedir meu orçamento", "hero.cta2": "Ver como funciona",
    "hero.stat1": "tudo incluso, com impostos",
    "hero.stat2v": "Direto com o dono", "hero.stat2": "sem markup de locadora",
    "hero.stat3": "entrega e suporte pessoais",
    "hero.pricecard.tag": "Seu preço mensal",
    "hero.pricecard.note": "≈ $530 USD · impostos inclusos · carro reserva",
    "photo.hero": "Adicione <strong>images/hero.jpg</strong><br /><em>(foto do Cobalt branco — veja o README)</em>",

    "strip.1": "✓ Seguro para locação", "strip.2": "✓ Somente por indicação",
    "strip.3": "✓ Carro reserva se acontecer algo", "strip.4": "✓ Suporte em inglês e português",
    "strip.5": "✓ Em Uberlândia, MG",

    "problem.eyebrow": "O problema",
    "problem.title": "O aluguel mensal no Brasil é caro sem parecer",
    "problem.sub": "Visitar a família por um ou dois meses não deveria custar uma fortuna. Mas as grandes redes precificam pela estrutura delas — frota enorme, funcionários, lojas — não por você.",
    "problem.c1.title": "Um preço escondido na diária",
    "problem.c1.body": "A diária parece pequena — mas numa estadia de um ou dois meses ela se acumula e fica bem acima do que deveria custar alugar um carro.",
    "problem.c2.title": "Precificado pelo custo deles, não pelo seu",
    "problem.c2.body": "Frota, funcionários e lojas custam caro. Esse custo está embutido em cada diária que você paga.",
    "problem.c3.title": "Ninguém entende a sua situação",
    "problem.c3.body": "Estadias longas, habilitação estrangeira, visita à família — o balcão genérico não foi feito para quem vem dos EUA.",

    "how.eyebrow": "Como funciona",
    "how.title": "Simples, pessoal e por indicação",
    "how.sub": "A gente mantém pequeno de propósito. Menos carros, locatários de confiança e uma pessoa de verdade do outro lado.",
    "how.s1.title": "Você é indicado",
    "how.s1.body": "Um amigo ou familiar que nos conhece faz a ponte. Começar por indicação mantém todo mundo seguro.",
    "how.s2.title": "Peça um orçamento",
    "how.s2.body": "Conte as datas e a cidade de retirada. Confirmamos a disponibilidade e enviamos o preço mensal, tudo incluso.",
    "how.s3.title": "Assine e garanta",
    "how.s3.body": "Contrato de locação claro, conferência de documento/CNH, caução reembolsável e vistoria com fotos.",
    "how.s4.title": "Retire e dirija",
    "how.s4.body": "Entregamos o carro pessoalmente em Uberlândia e ficamos à disposição durante toda a sua viagem.",

    "photo.car": "images/car-exterior.jpg", "photo.interior": "images/car-interior.jpg", "photo.trunk": "images/car-trunk.jpg",
    "car.eyebrow": "O carro",
    "car.title": "Chevrolet Cobalt Elite 2018. Bem cuidado. Pronto para a estrada.",
    "car.sub": "Um Chevrolet Cobalt Elite 2018 — automático, completo, branco. Um sedã médio confortável: barato de manter e espaçoso para viagens e família.",
    "car.spec1.k": "Ano", "car.spec1.v": "2018",
    "car.spec2.k": "Câmbio", "car.spec2.v": "Automático",
    "car.spec3.k": "Modelo", "car.spec3.v": "Chevrolet Cobalt Elite",
    "car.spec4.k": "Cor", "car.spec4.v": "Branco",
    "car.spec5.k": "Quilometragem", "car.spec5.v": "120.000 km",
    "car.spec6.k": "Ideal para", "car.spec6.v": "Estadias longas e viagens",
    "car.editnote": "Adicione fotos reais do carro na pasta <strong>/images</strong> — veja o README.",
    "car.cta": "Ver disponibilidade",

    "pricing.eyebrow": "Preços",
    "pricing.title": "Justo, tudo incluso, sem surpresas",
    "pricing.sub": "Um preço mensal transparente com impostos inclusos. Estadias mais longas têm preço melhor. Valores em dólar são aproximados.",
    "pricing.feat.taxes": "Impostos inclusos",
    "pricing.feat.insurance": "Seguro para locação",
    "pricing.feat.backup": "Carro reserva incluso",
    "pricing.p1.title": "1 mês", "pricing.p1.usd": "≈ $530 USD", "pricing.p1.cta": "Pedir orçamento",
    "pricing.p2.flag": "Mais procurado", "pricing.p2.title": "2 meses",
    "pricing.p2.usd": "≈ $1.020 USD · impostos inclusos",
    "pricing.p2.feat": "Suporte prioritário durante a estadia", "pricing.p2.cta": "Pedir orçamento",
    "pricing.p3.title": "3+ meses", "pricing.p3.price": "Sob medida",
    "pricing.p3.usd": "Melhor preço mensal — vamos conversar", "pricing.p3.cta": "Falar com a gente",
    "compare.title": "NomadDrive vs. uma grande locadora",
    "compare.col1": "Grande locadora",
    "compare.r1": "Aluguel de 2 meses, mesma categoria", "compare.r1v": "Bem mais alto",
    "compare.r2": "Impostos inclusos",
    "compare.r3": "Carro reserva", "compare.r3v": "Às vezes",
    "compare.r4": "Atendimento pessoal, em inglês",
    "compare.r5": "Entrega em mãos", "compare.r5v": "Só no balcão",
    "compare.note": "Preços e câmbio variam e dependem do carro. Seu orçamento é sempre confirmado por escrito.",

    "safety.eyebrow": "Segurança e confiança",
    "safety.title": "Como protegemos todo mundo",
    "safety.sub": "Uma operação pequena também pode ser séria. Veja como o risco é tratado dos dois lados.",
    "safety.c1.title": "Seguro adequado",
    "safety.c1.body": "O carro tem seguro que cobre o uso em locação — não apenas uma apólice pessoal.",
    "safety.c2.title": "Contrato claro",
    "safety.c2.body": "Contrato de locação por escrito, conferência de documento e CNH, e vistoria com fotos na retirada e na devolução.",
    "safety.c3.title": "Com rastreador",
    "safety.c3.body": "O carro tem rastreador GPS para recuperação e tranquilidade dos dois lados.",
    "safety.c4.title": "Indicação primeiro",
    "safety.c4.body": "Começamos com pessoas ligadas ao nosso círculo. Confiança antes de escalar.",
    "safety.disclaimer": "Observação: condições do seguro, caução e detalhes do contrato são confirmados individualmente em cada locação. Esta página é informativa e não constitui oferta vinculante.",

    "who.eyebrow": "Para quem é",
    "who.title": "Feito para quem vem dos EUA para o Brasil",
    "who.sub": "Se você mora nos Estados Unidos e volta para passar um tempo de verdade no Brasil, é exatamente para você que criamos isso.",
    "who.l1": "Visita a família por 1 a 3 meses",
    "who.l2": "Quer um carro automático e confortável sem preço de locadora",
    "who.l3": "Prefere falar com uma pessoa de verdade, em inglês ou português",
    "who.l4": "Valoriza carro reserva e um contrato que te protege",
    "photo.travel": "images/travel.jpg",

    "quote.eyebrow": "Pedir orçamento",
    "quote.title": "Conte suas datas — respondemos rápido",
    "quote.sub": "Preencha e o WhatsApp abre com seus dados prontos para enviar. Sem cadastro, sem spam.",
    "quote.p1": "Resposta em até 24 horas", "quote.p2": "Preço fechado por escrito", "quote.p3": "Pedir não compromete",
    "form.name": "Seu nome", "form.contact": "E-mail ou WhatsApp",
    "form.start": "Data de retirada", "form.months": "Por quanto tempo?",
    "form.months.1": "1 mês", "form.months.2": "2 meses", "form.months.3": "3 meses", "form.months.4": "4+ meses",
    "form.city": "Cidade de retirada", "form.ref": "Quem indicou você?", "form.optional": "(opcional)",
    "form.msg": "Mais alguma coisa?", "form.submit": "Enviar pelo WhatsApp",
    "form.altprefix": "Prefere e-mail?", "form.altlink": "Fale com a gente por e-mail",
    "form.err": "Preencha seu nome e uma forma de contato.",

    "faq.eyebrow": "Dúvidas", "faq.title": "Boas perguntas, respostas diretas",
    "faq.q1": "Posso alugar sem indicação?",
    "faq.a1": "Por enquanto trabalhamos por indicação para manter tudo seguro e de confiança. Se você não tem uma, fale com a gente mesmo assim — conte sua situação e vemos o que é possível.",
    "faq.q2": "Posso dirigir com a habilitação dos EUA?",
    "faq.a2": "Em geral, uma habilitação estrangeira válida é aceita no Brasil para visitantes, muitas vezes junto com a permissão internacional. Confirmamos a exigência exata com você antes da retirada.",
    "faq.q3": "E se o carro tiver algum problema?",
    "faq.a3": "Você tem um carro reserva para nunca ficar na mão, e ficamos à disposição durante toda a viagem.",
    "faq.q4": "Tem caução?",
    "faq.a4": "Sim — uma caução reembolsável faz parte do contrato. O valor é confirmado no seu orçamento.",
    "faq.q5": "Quais cidades vocês atendem?",
    "faq.a5": "A retirada é em Uberlândia, MG. A partir daí o carro é seu para viajar por todo o Brasil dentro das condições do contrato.",
    "faq.q6": "Como faço o pagamento?",
    "faq.a6": "Combinamos uma forma conveniente na reserva — conversado de forma aberta, com tudo por escrito.",

    "final.title": "Vem para o Brasil em breve?",
    "final.sub": "Garanta um preço mensal justo antes da viagem. Começa com uma mensagem rápida.",
    "final.cta": "Pedir meu orçamento",

    "footer.tag": "Aluguel mensal de carro justo para quem vive entre os EUA e o Brasil.",
    "footer.contact": "Contato", "footer.whatsapp": "WhatsApp", "footer.email": "hello@nomaddrive.com.br",
    "footer.instagram": "Instagram", "footer.explore": "Navegar",
    "footer.legal": "© 2026 NomadDrive Brasil. Site informativo — não constitui oferta vinculante. Condições de locação, seguro e contrato confirmados individualmente.",
  },
};

/* ---- language ---- */
let currentLang = (navigator.language || "en").toLowerCase().startsWith("pt") ? "pt" : "en";

function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  const dict = I18N[lang];
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.innerHTML = dict[key];
  });
  document.querySelectorAll(".lang-toggle__opt").forEach((opt) => {
    opt.classList.toggle("is-active", opt.dataset.lang === lang);
  });
}

document.getElementById("langToggle").addEventListener("click", () => {
  applyLang(currentLang === "en" ? "pt" : "en");
});

/* ---- nav scroll state ---- */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 10);
});

/* ---- contact links ---- */
function waUrl(text) {
  const base = "https://wa.me/" + CONFIG.whatsapp;
  return text ? base + "?text=" + encodeURIComponent(text) : base;
}
document.getElementById("waFloat").href = waUrl(
  currentLang === "pt"
    ? "Olá! Vi o site da NomadDrive Brasil e quero um orçamento."
    : "Hi! I saw the NomadDrive Brasil site and I'd like a quote."
);
document.getElementById("footerWhats").href = waUrl("");
document.getElementById("footerInsta").href = CONFIG.instagram;
document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
  a.href = "mailto:" + CONFIG.email;
});

/* ---- quote form -> WhatsApp ---- */
const form = document.getElementById("quoteForm");
const formErr = document.getElementById("formErr");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  if (!data.name.trim() || !data.contact.trim()) {
    formErr.classList.add("is-visible");
    return;
  }
  formErr.classList.remove("is-visible");

  const monthsLabel = I18N[currentLang]["form.months." + (data.months === "4+" ? "4" : data.months)] || data.months;
  const lines = currentLang === "pt"
    ? [
        "*Novo pedido de orçamento — NomadDrive Brasil*",
        "",
        "Nome: " + data.name,
        "Contato: " + data.contact,
        "Retirada: " + (data.start || "a definir"),
        "Duração: " + monthsLabel,
        "Cidade: " + data.city,
        data.ref ? "Indicado por: " + data.ref : null,
        data.msg ? "Observações: " + data.msg : null,
      ]
    : [
        "*New quote request — NomadDrive Brasil*",
        "",
        "Name: " + data.name,
        "Contact: " + data.contact,
        "Pick-up: " + (data.start || "to be defined"),
        "Duration: " + monthsLabel,
        "City: " + data.city,
        data.ref ? "Referred by: " + data.ref : null,
        data.msg ? "Notes: " + data.msg : null,
      ];

  window.open(waUrl(lines.filter(Boolean).join("\n")), "_blank");
});

/* ---- init ---- */
applyLang(currentLang);
