<div>

# Tavunex

### Salon management and AI-powered customer service, connected through WhatsApp.

[![Live application](https://img.shields.io/badge/Live%20app-Visit%20Tavunex-047857?style=for-the-badge)](https://tavunex-smch.vercel.app/)

Tavunex helps salons organize appointments, services, products, staff, and customer conversations in one place. Its WhatsApp integration and AI assistant help answer customer questions using each salon's business information, while keeping people involved when personal follow-up is needed.

</div>

## See Tavunex

<p align="center">
  <a href="https://tavunex-smch.vercel.app/">
    <img src="https://github.com/user-attachments/assets/5db25a3b-c859-49c4-bc8a-a74ffb3bfeb5" alt="Tavunex landing page" width="49%">
  </a>
  <img src="https://github.com/user-attachments/assets/38180feb-b66f-47bd-90ee-5ac293087100" alt="Tavunex salon management dashboard" width="49%">
</p>




## What it does

- **Appointment management:** organize bookings by service, professional, date, and available time.
- **Salon operations:** manage services, products, team members, business hours, and customer conversations from a central dashboard.
- **WhatsApp Business integration:** connect a salon's WhatsApp account and manage incoming customer messages.
- **AI-assisted customer service:** answer questions using salon-specific services and business information, with human follow-up when needed.
- **AI-assisted product descriptions:** help salon teams prepare clear product information for their catalog.
- **Business-specific data access:** keep each salon's information associated with its own account.

## Built with

| Area | Technologies |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS |
| Data and authentication | Supabase |
| AI | OpenAI API |
| Messaging | WhatsApp Business Cloud API, Meta Embedded Signup |
| Hosting | Vercel |

## Run locally

You will need Node.js, npm, and credentials for the services you configure.

```bash
npm install
npm run dev
```

Create a `.env.local` file in the project root and add the environment variables required by your Supabase, OpenAI, and Meta integrations. Keep API keys, service-role keys, app secrets, and webhook verification tokens private; never commit real credentials.

Open [http://localhost:3000](http://localhost:3000) to view the app.

The Meta Embedded Signup flow requires HTTPS. To test WhatsApp account authorization locally, use an HTTPS development tunnel and authorize its origin in the Meta app configuration.

## Available scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## WhatsApp message support

The webhook validates incoming events and routes text conversations to the assistant for the matching salon. Automated replies currently support text messages; incoming media messages do not receive an automated response.
