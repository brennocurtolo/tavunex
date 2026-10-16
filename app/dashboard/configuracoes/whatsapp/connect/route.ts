import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

const GRAPH_VERSION = "v25.0";

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // 1. PEGA JWT DO USUÁRIO LOGADO
    // =====================================================

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Usuário não autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken = authorization.replace(
      "Bearer ",
      ""
    );

    // =====================================================
    // 2. VALIDA USUÁRIO NO SUPABASE
    // =====================================================

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Sessão inválida ou expirada.",
        },
        {
          status: 401,
        }
      );
    }

    // =====================================================
    // 3. DESCOBRE EMPRESA PELO USUÁRIO
    // =====================================================

    const {
      data: companyUser,
      error: companyUserError,
    } = await supabaseAdmin
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (
      companyUserError ||
      !companyUser?.company_id
    ) {
      console.error(
        "Erro ao buscar empresa do usuário:",
        companyUserError
      );

      return NextResponse.json(
        {
          error:
            "Empresa vinculada ao usuário não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    const companyId =
      companyUser.company_id;

    // =====================================================
    // 4. DADOS RECEBIDOS DO EMBEDDED SIGNUP
    // =====================================================

    const {
      code,
      wabaId,
      phoneNumberId,
    } = await request.json();

    if (!code) {
      return NextResponse.json(
        {
          error:
            "Código de autorização da Meta não recebido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!wabaId || !phoneNumberId) {
      return NextResponse.json(
        {
          error:
            "A Meta não retornou os dados do WhatsApp.",
        },
        {
          status: 400,
        }
      );
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.json(
        {
          error:
            "Configuração da Meta incompleta no servidor.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 5. TROCA CODE POR TOKEN
    // =====================================================

    const tokenUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`
    );

    tokenUrl.searchParams.set(
      "client_id",
      META_APP_ID
    );

    tokenUrl.searchParams.set(
      "client_secret",
      META_APP_SECRET
    );

    tokenUrl.searchParams.set(
      "code",
      code
    );

    const tokenResponse = await fetch(
      tokenUrl.toString(),
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const tokenData =
      await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.access_token
    ) {
      console.error(
        "Erro ao trocar code da Meta:",
        tokenData
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível concluir a autorização com a Meta.",
        },
        {
          status: 400,
        }
      );
    }

    const whatsappAccessToken =
      tokenData.access_token;

    // =====================================================
    // 6. BUSCA DADOS DO NÚMERO
    // =====================================================

    const phoneResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name`,
      {
        headers: {
          Authorization:
            `Bearer ${whatsappAccessToken}`,
        },
        cache: "no-store",
      }
    );

    const phoneData =
      await phoneResponse.json();

    if (!phoneResponse.ok) {
      console.error(
        "Erro ao buscar número na Meta:",
        phoneData
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível consultar o número conectado.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 7. EVITA MESMO NÚMERO EM OUTRO SALÃO
    // =====================================================

    const {
      data: existingCompany,
      error: existingCompanyError,
    } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq(
        "whatsapp_phone_number_id",
        phoneNumberId
      )
      .neq("id", companyId)
      .maybeSingle();

    if (existingCompanyError) {
      console.error(
        "Erro ao verificar número existente:",
        existingCompanyError
      );

      return NextResponse.json(
        {
          error:
            "Erro ao validar o número do WhatsApp.",
        },
        {
          status: 500,
        }
      );
    }

    if (existingCompany) {
      return NextResponse.json(
        {
          error:
            "Este número do WhatsApp já está conectado a outro salão.",
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // 8. ASSINA WABA NO NOSSO APP
    // =====================================================

    const subscriptionResponse =
      await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/subscribed_apps`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${whatsappAccessToken}`,

            "Content-Type":
              "application/json",
          },
        }
      );

    const subscriptionData =
      await subscriptionResponse.json();

    if (!subscriptionResponse.ok) {
      console.error(
        "Erro ao assinar WABA:",
        subscriptionData
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível ativar o recebimento de mensagens.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // 9. SALVA TOKEN PRIVADO DO SALÃO
    // =====================================================

    const {
      error: credentialError,
    } = await supabaseAdmin
      .from(
        "company_whatsapp_credentials"
      )
      .upsert(
        {
          company_id: companyId,

          access_token:
            whatsappAccessToken,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "company_id",
        }
      );

    if (credentialError) {
      console.error(
        "Erro ao salvar credencial:",
        credentialError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível salvar a credencial do WhatsApp.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // 10. ATUALIZA EMPRESA
    // =====================================================

    const {
      error: companyError,
    } = await supabaseAdmin
      .from("companies")
      .update({
        whatsapp_waba_id:
          wabaId,

        whatsapp_phone_number_id:
          phoneNumberId,

        whatsapp_display_phone_number:
          phoneData.display_phone_number ||
          null,

        whatsapp_connected:
          true,

        whatsapp_connected_at:
          new Date().toISOString(),
      })
      .eq("id", companyId);

    if (companyError) {
      console.error(
        "Erro ao atualizar empresa:",
        companyError
      );

      return NextResponse.json(
        {
          error:
            "Não foi possível vincular o WhatsApp ao salão.",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // SUCESSO
    // =====================================================

    return NextResponse.json({
      success: true,
      phoneNumber:
        phoneData.display_phone_number ||
        null,
    });
  } catch (error) {
    console.error(
      "Erro em /api/whatsapp/connect:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao conectar WhatsApp.",
      },
      {
        status: 500,
      }
    );
  }
}