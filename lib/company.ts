import { supabase } from "./supabase";

export type Company = {
  id: string;
  name: string;
  whatsapp_phone_number_id: string | null;
  whatsapp_display_phone_number: string | null;
  whatsapp_waba_id: string | null;
  whatsapp_connected: boolean;
};

export class CompanyRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CompanyRequestError";
    this.status = status;
  }
}

async function requestCompany(name?: string): Promise<Company | null> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    throw new CompanyRequestError("Sua sessão expirou. Entre novamente.", 401);
  }

  const response = await fetch("/api/company", {
    method: name === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(name === undefined ? {} : { "Content-Type": "application/json" }),
    },
    cache: "no-store",
    ...(name === undefined ? {} : { body: JSON.stringify({ name }) }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new CompanyRequestError(
      data.error || "Não foi possível carregar os dados do salão.",
      response.status,
    );
  }

  return data.company;
}

export function getCurrentCompany() {
  return requestCompany();
}

export async function completeCompanySetup(name: string): Promise<Company> {
  const company = await requestCompany(name);

  if (!company) {
    throw new Error("Não foi possível concluir o cadastro do salão. Tente novamente.");
  }

  return company;
}
