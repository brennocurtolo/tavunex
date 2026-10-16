import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =========================================================
// GET - META VERIFICA NOSSO WEBHOOK
// =========================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN &&
    challenge
  ) {
    console.log("Webhook verificado pela Meta.");

    return new Response(challenge, {
      status: 200,
    });
  }

  return NextResponse.json(
    {
      error: "Falha na verificação do webhook.",
    },
    {
      status: 403,
    }
  );
}

// =========================================================
// POST - RECEBE EVENTOS DO WHATSAPP
// =========================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // -----------------------------------------------------
    // 1. PEGA O EVENTO RECEBIDO
    // -----------------------------------------------------

    const change =
      body?.entry?.[0]?.changes?.[0]?.value;

    if (!change) {
      return NextResponse.json({
        received: true,
      });
    }

    // -----------------------------------------------------
    // 2. IGNORA EVENTOS QUE NÃO SÃO MENSAGENS
    // Ex.: delivered, read, sent etc.
    // -----------------------------------------------------

    const whatsappMessage = change.messages?.[0];
    
    if (!whatsappMessage) {
      return NextResponse.json({
        received: true,
      });
    }

    const whatsappMessageId = whatsappMessage.id;

    const messageTimestamp = Number(whatsappMessage.timestamp) * 1000;

    const messageAgeMinutes =
      (Date.now() - messageTimestamp) / 1000 / 60;

    console.log(
      "IDADE DA MENSAGEM:",
      messageAgeMinutes.toFixed(2),
      "minutos"
    );

    // Tenta registrar a mensagem
    const { error: duplicateError } = await supabase
      .from("whatsapp_processed_messages")
      .insert({
        message_id: whatsappMessageId,
      });

    if (duplicateError) {
      // Código 23505 = chave duplicada
      if (duplicateError.code === "23505") {
        console.log(
          "Mensagem já processada. Ignorando:",
          whatsappMessageId
        );

        return NextResponse.json({
          received: true,
        });
      }

      console.error(
        "Erro ao registrar mensagem:",
        duplicateError
      );

      return NextResponse.json({
        received: true,
      });
    }

    // Ignora mensagens antigas que a Meta esteja reenviando
    if (messageAgeMinutes > 5) {
      console.log(
        "Mensagem antiga ignorada:",
        whatsappMessageId
      );

      return NextResponse.json({
        received: true,
      });
    }

    // -----------------------------------------------------
    // 3. DADOS DA MENSAGEM
    // -----------------------------------------------------

    const phoneNumberId =
      change.metadata?.phone_number_id;

    const customerPhone =
      whatsappMessage.from;

    const customerName =
      change.contacts?.[0]?.profile?.name || null;

    const messageText =
      whatsappMessage.type === "text"
        ? whatsappMessage.text?.body
        : null;

    console.log(
      "======================================"
    );

    console.log("PHONE NUMBER ID:", phoneNumberId);
    console.log("CLIENTE:", customerPhone);
    console.log("MENSAGEM:", messageText);

    // -----------------------------------------------------
    // 4. VALIDA PHONE NUMBER ID
    // -----------------------------------------------------

    if (!phoneNumberId) {
      console.error(
        "phone_number_id não encontrado."
      );

      return NextResponse.json({
        received: true,
      });
    }

    // -----------------------------------------------------
    // 5. DESCOBRE QUAL SALÃO RECEBEU A MENSAGEM
    // -----------------------------------------------------

    const {
      data: company,
      error: companyError,
    } = await supabase
      .from("companies")
      .select("id, name")
      .eq(
        "whatsapp_phone_number_id",
        phoneNumberId
      )
      .maybeSingle();

    if (companyError) {
      console.error(
        "Erro ao identificar empresa:",
        companyError
      );

      return NextResponse.json({
        received: true,
      });
    }

    if (!company) {
      console.error(
        "Nenhuma empresa encontrada para o phone_number_id:",
        phoneNumberId
      );

      return NextResponse.json({
        received: true,
      });
    }

    console.log(
      "EMPRESA:",
      company.name
    );

    console.log(
      "COMPANY ID:",
      company.id
    );

    // -----------------------------------------------------
    // 6. POR ENQUANTO ACEITAMOS SOMENTE TEXTO
    // -----------------------------------------------------

    if (!messageText) {
      console.log(
        "Mensagem não textual recebida. Ignorando por enquanto."
      );

      return NextResponse.json({
        received: true,
      });
    }

    // -----------------------------------------------------
    // 7. ENVIA A MENSAGEM PARA NOSSA IA
    // -----------------------------------------------------

    console.log(
      "Enviando mensagem para IA..."
    );

    const aiResponse = await fetch(
      "http://localhost:3000/api/ai",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: messageText,
          companyId: company.id,
          customerPhone: customerPhone,
          customerName: customerName,
        }),
      }
    );

    const aiData = await aiResponse.json();

    // -----------------------------------------------------
    // 8. VERIFICA ERRO DA IA
    // -----------------------------------------------------

    if (!aiResponse.ok) {
      console.error(
        "Erro ao chamar IA:",
        aiData
      );

      return NextResponse.json({
        received: true,
      });
    }

    // -----------------------------------------------------
    // 9. ATENDIMENTO HUMANO
    //
    // Se /api/ai retornar response: null porque a conversa
    // está com humano, NÃO respondemos automaticamente.
    // -----------------------------------------------------

    if (
      aiData.human === true ||
      !aiData.response
    ) {
      console.log(
        "Conversa em atendimento humano. IA não responderá."
      );

      return NextResponse.json({
        received: true,
      });
    }

    const responseText =
      aiData.response;

    console.log(
      "RESPOSTA DA IA:",
      responseText
    );

    // -----------------------------------------------------
    // 10. CONFERE TOKEN DO WHATSAPP
    // -----------------------------------------------------

    if (!WHATSAPP_ACCESS_TOKEN) {
      console.error(
        "WHATSAPP_ACCESS_TOKEN não configurado."
      );

      return NextResponse.json({
        received: true,
      });
    }

    // -----------------------------------------------------
    // 11. ENVIA RESPOSTA PARA O WHATSAPP
    // -----------------------------------------------------

    console.log(
      "Enviando resposta para WhatsApp..."
    );

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${WHATSAPP_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          messaging_product: "whatsapp",

          recipient_type: "individual",

          to: customerPhone,

          type: "text",

          text: {
            body: responseText,
          },
        }),
      }
    );

    const whatsappData =
      await whatsappResponse.json();

    // -----------------------------------------------------
    // 12. VERIFICA SE A META ACEITOU
    // -----------------------------------------------------

    if (!whatsappResponse.ok) {
      console.error(
        "Erro ao enviar mensagem pelo WhatsApp:",
        JSON.stringify(
          whatsappData,
          null,
          2
        )
      );

      return NextResponse.json({
        received: true,
      });
    }

    console.log(
      "Mensagem enviada pelo WhatsApp com sucesso."
    );

    console.log(
      "MESSAGE ID:",
      whatsappData?.messages?.[0]?.id
    );

    console.log(
      "======================================"
    );

    // -----------------------------------------------------
    // 13. FINALIZA WEBHOOK
    // -----------------------------------------------------

    return NextResponse.json({
      received: true,
    });

  } catch (error) {
    console.error(
      "Erro no webhook:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro ao processar webhook.",
      },
      {
        status: 500,
      }
    );
  }
}