/* ====================================================================
   Nomade Drive Brasil — Configuracao do Supabase
   --------------------------------------------------------------------
   Preencha com os dados do SEU projeto Supabase:
   Painel do Supabase > Project Settings > API.

   - "url"     => campo "Project URL".
   - "anonKey" => campo "anon public" (tambem chamada de publishable key).

   SEGURANCA:
   - A "anonKey" e a chave PUBLICA. Ela pode ficar aqui e no GitHub Pages:
     o acesso aos dados e controlado por Row Level Security (RLS) no banco.
   - NUNCA coloque a "service_role key" neste arquivo, no GitHub ou em
     qualquer JavaScript do navegador. Ela so pode existir em backend
     seguro (Supabase Edge Functions ou Vercel Serverless Functions).
   - Como a service_role ja foi exposta antes, ROTACIONE-A no painel do
     Supabase (Project Settings > API) antes de ir para producao.

   - "googleOAuth": deixe false ate configurar o provedor Google no
     Supabase (Authentication > Providers > Google). Quando estiver true,
     o botao "Continuar com Google" aparece nas telas de login/cadastro.
   ==================================================================== */
window.NOMADDRIVE_SUPABASE = {
  url: "https://zeexmbgacvsaciojcrwr.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZXhtYmdhY3ZzYWNpb2pjcndyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjg3ODQsImV4cCI6MjA5NDk0NDc4NH0.wJVJtIxW69_c9uHUTmGeksHAIbBJWKkTWOwZm3ZiqT8",
  googleOAuth: false
};
