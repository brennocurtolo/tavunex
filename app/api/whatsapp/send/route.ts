import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      conversationId,
      message,
    } = await request.json();

    if (!conversationId || !message?.trim()) {
      return NextResponse.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select(`
        id,
        customer_phone,
        company_id,
        companies (
          whatsapp_phone_number_id
        )
      `)
      .eq("id", conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    const companyData = conversation.companies as any;

    const phoneNumberId =
      companyData?.whatsapp_phone_number_id;

    const customerPhone =
      conversation.customer_phone;

    if (!phoneNumberId || !customerPhone) {
      return NextResponse.json(
        { error: "WhatsApp não configurado." },
        { status: 400 }
      );
    }

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: customerPhone,
          type: "text",
          text: {
            body: message.trim(),
          },
        }),
      }
    );

    const whatsappData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error(whatsappData);

      return NextResponse.json(
        { error: "Erro ao enviar mensagem." },
        { status: 500 }
      );
    }

    // Salva mensagem humana no histórico
    await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: message.trim(),
      });

    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro interno." },
      { status: 500 }
    );
  }
}