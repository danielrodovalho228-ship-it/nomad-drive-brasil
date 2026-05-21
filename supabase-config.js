/* ====================================================================
   NomadDrive Brasil — Configuracao do Supabase
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
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "COLE_AQUI_SUA_ANON_PUBLISHABLE_KEY",
  googleOAuth: false
};
