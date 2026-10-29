# Faith Steps

App de hábitos cristãos com cara de jogo: seu personagem cresce a cada passo de fé que você dá na vida real.

- App: https://criativelucas.github.io/faith-steps/
- Plano do MVP: [PLANO-MVP.md](PLANO-MVP.md)
- Conceito visual: [arte/conceito-personagem.html](arte/conceito-personagem.html)

## Rodar localmente

```bash
cd app
npm install
npm run web      # abre no navegador
npm run check    # checa as regras do jogo
```

Cada push na `main` publica o app no GitHub Pages.

## Ativar login e sincronização (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. No **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication > Emails**, nos modelos **Magic Link** e **Confirm signup**, coloque `{{ .Token }}` no corpo do e-mail (o app usa código, não link).
4. Em **Authentication > URL Configuration**, defina o Site URL como `https://criativelucas.github.io/faith-steps/`.
5. No GitHub, em **Settings > Secrets and variables > Actions > Variables**, crie `SUPABASE_URL` (Project URL) e `SUPABASE_KEY` (Publishable key) e rode o deploy de novo. Para testar no computador, copie `app/.env.example` para `app/.env` com os mesmos valores.

### Entrar com Google (opcional)

1. No [Google Cloud Console](https://console.cloud.google.com), crie um projeto, configure a tela de consentimento (público externo) e publique o app.
2. Crie um cliente OAuth do tipo **Aplicativo da Web** com origem `https://criativelucas.github.io` e URI de redirecionamento `https://<projeto>.supabase.co/auth/v1/callback`.
3. No Supabase, em **Authentication > Sign In / Providers > Google**, ative e cole o Client ID e o Client Secret.

O botão "Entrar com Google" aparece sozinho no app quando o provedor está ativo.

O e-mail padrão do Supabase envia poucas mensagens por hora. Para testar com mais gente, configure um SMTP próprio em **Authentication > SMTP Settings**.
