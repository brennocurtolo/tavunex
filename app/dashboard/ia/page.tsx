"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function IAPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar empresa:", error);
      return;
    }

    setCompanyId(data.company_id);
  }

  async function sendMessage() {
    if (!message.trim()) return;

    if (!companyId) {
      setResponse("Empresa ainda não foi carregada.");
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          companyId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResponse(data.error || "Erro ao enviar mensagem.");
        return;
      }

      if (data.error) {
        setResponse(data.error);
        return;
      }

      setResponse(data.response);
    } catch (error) {
      console.error("Erro:", error);
      setResponse("Erro ao conectar com a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Testar IA
        </h1>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="w-full border rounded-lg p-4 min-h-[150px]"
        />

        <button
          onClick={sendMessage}
          disabled={loading || !companyId}
          className="mt-4 bg-black text-white rounded-lg px-6 py-3 disabled:opacity-50"
        >
          {loading
            ? "Pensando..."
            : !companyId
            ? "Carregando empresa..."
            : "Enviar"}
        </button>

        {response && (
          <div className="mt-8 border rounded-xl p-6">
            <h2 className="font-semibold mb-3">
              Resposta da IA
            </h2>

            <p>{response}</p>
          </div>
        )}
      </div>
    </main>
  );
}