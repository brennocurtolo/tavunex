"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function enviarReset() {
    setMensagem("");
    setSuccess(false);

    if (!email.trim()) {
      setMensagem("Digite seu e-mail.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      }
    );

    setLoading(false);

    if (error) {
      console.error(error);
      setMensagem("Não foi possível enviar o e-mail de recuperação.");
      return;
    }

    setSuccess(true);
    setMensagem(
      "Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha."
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          ← Voltar para login
        </Link>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm px-8 py-9">

          <div className="flex items-center gap-3 mb-7">
            <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              T
            </div>

            <div>
              <div className="font-bold text-slate-950 leading-tight">
                Tavunex
              </div>

              <div className="text-xs text-slate-400">
                Atendimento inteligente
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Recuperar senha
          </h1>

          <p className="text-slate-500 mt-2 mb-7">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            E-mail
          </label>

          <input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 border border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
          />

          <button
            onClick={enviarReset}
            disabled={loading}
            className="w-full h-12 mt-5 rounded-xl bg-slate-950 text-white font-semibold hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </button>

          {mensagem && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                success
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-red-50 border-red-100 text-red-600"
              }`}
            >
              {mensagem}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}