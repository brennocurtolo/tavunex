import type { SupabaseClient } from "@supabase/supabase-js";

export const META_GRAPH_VERSION = "v26.0";

type WhatsAppMessage = {
  id?: string;
};

export async function getCompanyWhatsAppAccessToken(
  supabase: SupabaseClient,
  companyId: string,
) {
  const { data, error } = await supabase
    .from("company_whatsapp_credentials")
    .select("access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar credencial do WhatsApp:", error);
    throw new Error("Não foi possível carregar a credencial do WhatsApp.");
  }

  if (typeof data?.access_token !== "string" || !data.access_token) {
    throw new Error("Este salão ainda não tem uma credencial do WhatsApp.");
  }

  return data.access_token;
}

export async function sendWhatsAppText({
  phoneNumberId,
  accessToken,
  to,
  message,
}: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  message: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: message },
      }),
      cache: "no-store",
    },
  );

  const data = (await response.json()) as {
    error?: { message?: string };
    messages?: WhatsAppMessage[];
  };

  if (!response.ok) {
    console.error("Erro ao enviar mensagem pela API do WhatsApp:", data);
    throw new Error(
      data.error?.message || "A Meta não aceitou o envio da mensagem.",
    );
  }

  return data;
}
