import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCompanyWhatsAppAccessToken,
  sendWhatsAppText,
} from "@/lib/server/whatsapp";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const META_APP_SECRET = process.env.META_APP_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

type WhatsAppMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
};

type WhatsAppValue = {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{
    wa_id?: string;
    profile?: { name?: string };
  }>;
  messages?: WhatsAppMessage[];
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{ value?: WhatsAppValue }>;
  }>;
};

function hasValidSignature(body: string, signatureHeader: string | null) {
  if (!META_APP_SECRET || !signatureHeader) return false;

  const [algorithm, signature] = signatureHeader.split("=");
  if (algorithm !== "sha256" || !/^[a-f0-9]{64}$/i.test(signature || "")) {
    return false;
  }

  const expected = createHmac("sha256", META_APP_SECRET).update(body).digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function processMessage(value: WhatsAppValue, message: WhatsAppMessage, origin: string) {
  const messageId = message.id;
  const phoneNumberId = value.metadata?.phone_number_id;
  const customerPhone = message.from;
  const messageText = message.type === "text" ? message.text?.body?.trim() : "";

  if (!messageId || !phoneNumberId || !customerPhone) {
    throw new Error("Evento do WhatsApp sem identificadores obrigatórios.");
  }

  const { error: claimError } = await supabase
    .from("whatsapp_processed_messages")
    .insert({ message_id: messageId });

  if (claimError?.code === "23505") {
    console.log("Mensagem do WhatsApp já processada:", messageId);
    return;
  }

  if (claimError) {
    console.error("Erro ao registrar mensagem recebida:", claimError);
    throw new Error("Não foi possível registrar a mensagem recebida.");
  }

  try {
    if (!messageText) {
      console.log("Mensagem não textual recebida; não será processada pela IA.");
      return;
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name, whatsapp_connected")
      .eq("whatsapp_phone_number_id", phoneNumberId)
      .maybeSingle();

    if (companyError) {
      console.error("Erro ao identificar salão pelo número conectado:", companyError);
      throw new Error("Não foi possível identificar o salão do WhatsApp.");
    }

    if (!company || !company.whatsapp_connected) {
      throw new Error("O número recebido não está conectado a um salão ativo.");
    }

    const contact = value.contacts?.find((item) => item.wa_id === customerPhone)
      ?? value.contacts?.[0];
    const aiResponse = await fetch(new URL("/api/ai", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageText,
        companyId: company.id,
        customerPhone,
        customerName: contact?.profile?.name || null,
      }),
      cache: "no-store",
    });

    const aiData = (await aiResponse.json().catch(() => null)) as {
      response?: unknown;
      human?: boolean;
      error?: string;
    } | null;

    if (!aiResponse.ok) {
      console.error("Erro ao processar mensagem na IA:", aiData?.error || aiResponse.status);
      throw new Error("Não foi possível processar a mensagem com a IA.");
    }

    if (aiData?.human === true || typeof aiData?.response !== "string" || !aiData.response.trim()) {
      console.log("A conversa está em atendimento humano ou a IA não gerou resposta.");
      return;
    }

    const accessToken = await getCompanyWhatsAppAccessToken(supabase, company.id);
    await sendWhatsAppText({
      phoneNumberId,
      accessToken,
      to: customerPhone,
      message: aiData.response.trim(),
    });

    console.log("Resposta da IA enviada pelo WhatsApp:", {
      companyId: company.id,
      messageId,
    });
  } catch (error) {
    const { error: releaseError } = await supabase
      .from("whatsapp_processed_messages")
      .delete()
      .eq("message_id", messageId);

    if (releaseError) {
      console.error("Erro ao liberar mensagem para nova tentativa:", releaseError);
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!VERIFY_TOKEN) {
    console.error("WHATSAPP_VERIFY_TOKEN não está configurado.");
    return NextResponse.json(
      { error: "Webhook não configurado." },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json(
    { error: "Falha na verificação do webhook." },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  if (!META_APP_SECRET) {
    console.error("META_APP_SECRET não está configurado para validar o webhook.");
    return NextResponse.json(
      { error: "Webhook não configurado." },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json(
      { error: "Assinatura do webhook inválida." },
      { status: 401 },
    );
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "Corpo JSON inválido." },
      { status: 400 },
    );
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (value) {
          for (const message of value.messages ?? []) {
            await processMessage(value, message, request.nextUrl.origin);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook do WhatsApp:", error);
    return NextResponse.json(
      { error: "Falha ao processar o webhook." },
      { status: 500 },
    );
  }
}
