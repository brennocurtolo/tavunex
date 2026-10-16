import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type SuggestionRequest = {
  type: "product" | "brand" | "description";
  query?: string;
  product?: string;
  brand?: string;
};

type SuggestionResponse = {
  suggestions?: string[];
  description?: string;
};

function parseResponse(value: string): SuggestionResponse {
  const parsed = JSON.parse(
    value.replace(/```json/g, "").replace(/```/g, "").trim(),
  ) as SuggestionResponse;

  return {
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [],
    description: typeof parsed.description === "string" ? parsed.description.trim() : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!accessToken) {
      return NextResponse.json({ error: "Sessão não informada." }, { status: 401 });
    }

    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      },
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Sua sessão expirou." }, { status: 401 });
    }

    const body = await request.json() as SuggestionRequest;
    const type = body.type;
    const query = body.query?.trim() || "";
    const product = body.product?.trim() || "";
    const brand = body.brand?.trim() || "";

    if (!["product", "brand", "description"].includes(type)) {
      return NextResponse.json({ error: "Tipo de sugestão inválido." }, { status: 400 });
    }

    if (type !== "description" && query.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    if (type === "description" && !product) {
      return NextResponse.json({ description: "" });
    }

    const instructions = type === "description"
      ? `
Você ajuda um salão de beleza a cadastrar produtos.
Crie uma descrição clara, específica e útil sobre o produto em si, com no mínimo 3 linhas separadas por quebras de linha.
A primeira linha deve explicar o que é o produto e sua principal finalidade.
A segunda deve explicar os benefícios ou características mais relevantes para o cliente.
A terceira deve indicar para quem é recomendado ou em quais situações pode ser usado.
Use a marca apenas como contexto de identificação; não escreva um texto promocional sobre a marca.
Não invente benefícios médicos, resultados garantidos, certificações, ingredientes ou informações técnicas específicas.
Quando não houver informação suficiente para uma característica, descreva de forma geral e segura.
Retorne SOMENTE JSON válido neste formato:
{"description":"Linha 1\\nLinha 2\\nLinha 3"}
`
      : `
Você ajuda um salão de beleza a cadastrar produtos.
Gere até 8 sugestões relacionadas ao texto digitado.
Para produto, sugira nomes de produtos profissionais usados em salão, incluindo tratamentos,
finalizadores, colorações e cuidados capilares quando fizer sentido.
Para marca, sugira marcas reais e conhecidas de produtos profissionais de beleza relacionadas
à categoria do produto informado. Não crie marcas fictícias.
Retorne SOMENTE JSON válido neste formato:
{"suggestions":["..."]}
`;

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      instructions,
      input: JSON.stringify({ type, query, product, brand }),
    });

    return NextResponse.json(parseResponse(response.output_text));
  } catch (error) {
    console.error("Erro ao gerar sugestão de produto:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar sugestões agora." },
      { status: 500 },
    );
  }
}
