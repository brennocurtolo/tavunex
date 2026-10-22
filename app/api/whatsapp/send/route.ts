import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCompanyWhatsAppAccessToken,
  sendWhatsAppText,
} from "@/lib/server/whatsapp";

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

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!accessToken) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const conversationId =
      typeof body?.conversationId === "string" ? body.conversationId : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!conversationId || !message || message.length > 4096) {
      return NextResponse.json(
        { error: "Informe uma conversa e uma mensagem válida (até 4096 caracteres)." },
        { status: 400 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Erro ao verificar vínculo do usuário:", membershipError);
      return NextResponse.json(
        { error: "Não foi possível validar o salão do usuário." },
        { status: 500 },
      );
    }

    if (!membership?.company_id) {
      return NextResponse.json(
        { error: "Não há um salão vinculado a esta conta." },
        { status: 404 },
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, customer_phone, company_id")
      .eq("id", conversationId)
      .eq("company_id", membership.company_id)
      .maybeSingle();

    if (conversationError) {
      console.error("Erro ao buscar conversa:", conversationError);
      return NextResponse.json(
        { error: "Não foi possível carregar a conversa." },
        { status: 500 },
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversa não encontrada." },
        { status: 404 },
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("whatsapp_phone_number_id")
      .eq("id", membership.company_id)
      .maybeSingle();

    if (companyError) {
      console.error("Erro ao buscar número do WhatsApp:", companyError);
      return NextResponse.json(
        { error: "Não foi possível carregar o número do WhatsApp." },
        { status: 500 },
      );
    }

    if (!company?.whatsapp_phone_number_id || !conversation.customer_phone) {
      return NextResponse.json(
        { error: "O WhatsApp deste salão ainda não está conectado." },
        { status: 400 },
      );
    }

    const accessTokenForCompany =
      await getCompanyWhatsAppAccessToken(supabase, membership.company_id);
    await sendWhatsAppText({
      phoneNumberId: company.whatsapp_phone_number_id,
      accessToken: accessTokenForCompany,
      to: conversation.customer_phone,
      message,
    });

    const { error: insertError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: message,
    });

    if (insertError) {
      console.error("Erro ao salvar mensagem enviada:", insertError);
      return NextResponse.json(
        { error: "A mensagem foi enviada, mas não foi salva no histórico." },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    if (updateError) {
      console.error("Erro ao atualizar conversa:", updateError);
      return NextResponse.json(
        { error: "A mensagem foi enviada, mas a conversa não foi atualizada." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar mensagem pelo WhatsApp:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao enviar mensagem.",
      },
      { status: 500 },
    );
  }
}
