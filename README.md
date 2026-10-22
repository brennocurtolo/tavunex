This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Conectar o WhatsApp durante o desenvolvimento

O login da Meta precisa ser iniciado em uma página HTTPS. Para testar a conexão
com o WhatsApp, mantenha o Next.js em `http://localhost:3000` e acesse o painel
pelo endereço HTTPS do túnel ngrok.

O domínio de desenvolvimento configurado em `next.config.ts` é:

[Abrir configurações do WhatsApp por HTTPS](https://semifinal-capacity-props.ngrok-free.dev/dashboard/configuracoes/whatsapp)

Mantenha o servidor Next.js e o túnel ngrok em execução. Faça login no endereço
HTTPS antes de conectar o WhatsApp: a sessão de `localhost` pertence a outra
origem e não é compartilhada com o domínio do túnel.

Se o túnel estiver parado, execute em outro terminal:

```bash
ngrok http --url=semifinal-capacity-props.ngrok-free.dev 3000
```

O domínio usado pelo navegador também precisa estar autorizado nas configurações
do aplicativo da Meta. `allowedDevOrigins` controla apenas o servidor Next.js.
Se trocar o domínio do túnel, atualize essa configuração e os endereços
autorizados na Meta.

## Conexão do WhatsApp no site publicado

O cliente acessa o domínio definitivo da aplicação, entra na conta e clica em
**Conectar WhatsApp** para autorizar a conexão na Meta. O botão usa as rotas do
próprio site; o túnel ngrok é usado somente nos testes locais.

Para a análise do app na Meta, use páginas públicas do domínio publicado para
a política de privacidade e as instruções de exclusão de dados. Depois de
configurar o domínio definitivo da Tavunex, informe estas URLs no painel da Meta:

- `https://<dominio-publicado>/politica-de-privacidade`
- `https://<dominio-publicado>/exclusao-de-dados`

Confirme que o domínio publicado é o definitivo e que ambas as páginas abrem
sem login antes de enviar a solicitação de análise.

Para disponibilizar esse fluxo:

1. Publique a aplicação em uma hospedagem compatível com Next.js e suas rotas de
   servidor. Configure HTTPS e o redirecionamento de HTTP para HTTPS na hospedagem.
2. Configure as variáveis do Supabase e da Meta no ambiente publicado. As variáveis
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_META_APP_ID` e `NEXT_PUBLIC_META_CONFIG_ID` precisam estar definidas
   antes do build. `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_SECRET` e
   `WHATSAPP_VERIFY_TOKEN` ficam somente no servidor. Ao trocar de aplicativo da
   Meta, atualize o ID, o ID da configuração do Embedded Signup e o segredo para
   pertencerem ao mesmo aplicativo; depois, faça um novo deploy.
3. No aplicativo da Meta, autorize o domínio definitivo em **Facebook Login for
   Business > Settings > Allowed Domains for the JavaScript SDK** e os endereços
   HTTPS usados pelo fluxo em **Valid OAuth Redirect URIs**. Conclua as permissões
   e verificações exigidas pela Meta para atender empresas de terceiros e coloque
   o aplicativo em modo **Live** antes de liberar para clientes.
4. Configure em **Webhooks** do produto WhatsApp a URL
   `https://<dominio-publicado>/api/whatsapp/webhook`, usando o mesmo
   `WHATSAPP_VERIFY_TOKEN` definido no servidor, e assine o campo `messages`.
   O webhook também valida a assinatura `x-hub-signature-256` usando o
   `META_APP_SECRET`.
5. Valide a conexão com uma conta de salão no domínio publicado. O acesso por HTTPS
   resolve o bloqueio de HTTP; a autorização também depende da configuração e
   aprovação do aplicativo na Meta.

Referência para configuração de domínio e modo Live:
[guia de integração do Embedded Signup](https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide#update-login-settings-on-your-meta-app).
Este projeto utiliza a API da Meta diretamente; essa referência não implica
contratar ou integrar a Twilio.

Cada salão conecta sua própria conta pelo Embedded Signup. O token autorizado é
salvo em `company_whatsapp_credentials` e usado para os envios daquele salão; o
webhook identifica a empresa pelo `phone_number_id` e envia a mensagem à IA no
mesmo domínio da aplicação. A tabela `whatsapp_processed_messages` precisa ter
uma restrição única em `message_id` para evitar processar notificações repetidas.
O fluxo automatizado atualmente processa mensagens de texto; mensagens de mídia
não recebem resposta automática.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
