# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/331b4460-bdc1-47e8-9296-63ddcbb1803e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/331b4460-bdc1-47e8-9296-63ddcbb1803e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/331b4460-bdc1-47e8-9296-63ddcbb1803e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## Concluir Demanda por Resposta de E-mail (Resend Inbound)

Esta funcionalidade permite que empregados concluam tarefas automaticamente respondendo o e-mail de notificação com palavras-chave como "ok", "feito" ou "concluído".

### Configuração no Painel do Resend

1. **Habilitar Receiving (Inbound)**:
   - Acesse [resend.com/domains](https://resend.com/domains)
   - Ative a opção "Receiving" para obter um domínio `.resend.app` (ex: `cool-hedgehog.resend.app`) ou configure um subdomínio próprio

2. **Criar Webhook**:
   - Acesse [resend.com/webhooks](https://resend.com/webhooks)
   - Crie um novo webhook com:
     - **Events**: `email.received`
     - **Endpoint**: `https://riubtdbaqjyronitywbs.functions.supabase.co/resend-inbound-task-reply`
   - Copie o **Signing Secret** gerado

3. **Configurar Secrets no Supabase**:
   - `RESEND_INBOUND_DOMAIN`: Domínio do Resend para recebimento (ex: `cool-hedgehog.resend.app`)
   - `RESEND_WEBHOOK_SECRET`: Signing Secret do webhook criado

### Como Funciona

1. Ao distribuir uma tarefa, o e-mail é enviado com um `replyTo` único: `tarefa-{id}@{domínio}`
2. O empregado responde o e-mail com uma das palavras-chave:
   - `ok`, `feito`, `feita`, `concluído`, `concluída`, `done`, `finalizado`, `pronto`
3. O Resend envia o webhook para a edge function `resend-inbound-task-reply`
4. A função identifica a tarefa pelo endereço e atualiza o status para "concluída"
5. Se todas as tarefas de uma demanda estiverem concluídas, a demanda também é finalizada

### Como Testar

1. Distribua uma tarefa para um empregado (seu próprio e-mail para teste)
2. Receba o e-mail de notificação
3. Responda com "ok" ou "feito"
4. Verifique no sistema se o status mudou para "concluída"

### Tabelas Relacionadas

- `distribuicao_tarefas`: Colunas adicionadas para rastreamento de e-mails
  - `resend_sent_id`: ID do e-mail enviado pelo Resend
  - `reply_to_address`: Endereço de resposta único
  - `inbound_email_id`: ID do e-mail de resposta recebido
  - `concluida_por_email`: Flag indicando conclusão via e-mail

- `task_email_events`: Log de todos os eventos de e-mail para auditoria
