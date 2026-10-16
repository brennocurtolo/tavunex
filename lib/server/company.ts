import type { SupabaseClient } from "@supabase/supabase-js";

export type Company = {
  id: string;
  name: string;
  whatsapp_phone_number_id: string | null;
  whatsapp_display_phone_number: string | null;
  whatsapp_waba_id: string | null;
  whatsapp_connected: boolean | null;
};

type Dependencies = {
  createAdminClient: () => SupabaseClient;
  createUserClient: (accessToken: string) => SupabaseClient;
};

class CompanyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function failure(error: unknown) {
  if (error instanceof CompanyError) {
    return json({ error: error.message }, error.status);
  }

  return json({ error: "Não foi possível carregar o salão. Tente novamente." }, 500);
}

async function findCompany(admin: SupabaseClient, userId: string): Promise<Company | null> {
  const { data: membership, error: membershipError } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    if (membershipError.code === "PGRST116") {
      throw new CompanyError("Sua conta possui mais de um vínculo de salão. Verifique seu cadastro.", 409);
    }

    throw new CompanyError("Não foi possível consultar o vínculo do salão. Tente novamente.", 500);
  }

  if (!membership) return null;

  if (!membership.company_id) {
    throw new CompanyError("O vínculo do salão está incompleto. Verifique seu cadastro.", 409);
  }

  const { data: company, error: companyError } = await admin
    .from("companies")
    .select("id, name, whatsapp_phone_number_id, whatsapp_display_phone_number, whatsapp_waba_id, whatsapp_connected")
    .eq("id", membership.company_id)
    .maybeSingle();

  if (companyError) {
    throw new CompanyError("Não foi possível consultar os dados do salão. Tente novamente.", 500);
  }

  if (!company) {
    throw new CompanyError("O salão vinculado à sua conta não está disponível. Verifique seu cadastro.", 409);
  }

  return company as Company;
}

export function createCompanyHandlers(dependencies: Dependencies) {
  async function authenticate(request: Request) {
    const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      throw new CompanyError("Usuário não autenticado.", 401);
    }

    const accessToken = match[1];
    const admin = dependencies.createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(accessToken);

    if (error || !user) {
      throw new CompanyError("Sessão inválida ou expirada.", 401);
    }

    return { admin, accessToken, userId: user.id };
  }

  return {
    async GET(request: Request) {
      try {
        const { admin, userId } = await authenticate(request);
        const company = await findCompany(admin, userId);
        return json({ company });
      } catch (error) {
        return failure(error);
      }
    },

    async POST(request: Request) {
      try {
        const { admin, accessToken, userId } = await authenticate(request);
        let body: unknown;

        try {
          body = await request.json();
        } catch {
          throw new CompanyError("Informe um nome válido para o salão.", 400);
        }

        if (!body || typeof body !== "object" || !("name" in body) || typeof body.name !== "string") {
          throw new CompanyError("Informe o nome do salão.", 400);
        }

        const name = body.name.trim();

        if (!name || name.length > 200) {
          throw new CompanyError("O nome do salão deve ter entre 1 e 200 caracteres.", 400);
        }

        const existingCompany = await findCompany(admin, userId);

        if (existingCompany) return json({ company: existingCompany });

        // The existing RPC creates the company and membership as the signed-in user.
        // Atomic protection against concurrent creation belongs in that database function.
        const userClient = dependencies.createUserClient(accessToken);
        const { error: createError } = await userClient.rpc("create_company", { company_name: name });

        if (createError) {
          throw new CompanyError("Não foi possível cadastrar o salão. Tente novamente.", 500);
        }

        const company = await findCompany(admin, userId);

        if (!company) {
          throw new CompanyError("O cadastro do salão não retornou um vínculo válido. Verifique seu cadastro.", 409);
        }

        return json({ company });
      } catch (error) {
        return failure(error);
      }
    },
  };
}
