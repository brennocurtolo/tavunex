"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setMensagem("");

    if (!email || !senha) {
      setMensagem("Preencha seu e-mail e senha.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setMensagem("E-mail ou senha incorretos.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6 py-10">

      <div className="w-full max-w-md">

        {/* VOLTAR */}
        <Link
          href="/"
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            text-slate-500
            hover:text-slate-900
            transition-colors
            mb-6
          "
        >
          <span>←</span>
          Voltar para início
        </Link>

        {/* CARD */}
        <div
          className="
            bg-white
            border
            border-slate-200
            rounded-3xl
            shadow-sm
            px-8
            py-9
          "
        >

          {/* MARCA */}
          <div className="mb-8">

            <div className="flex items-center gap-3 mb-7">

              <div
                className="
                  w-10
                  h-10
                  bg-slate-950
                  rounded-xl
                  flex
                  items-center
                  justify-center
                  text-white
                  font-bold
                  text-lg
                "
              >
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
              Bem-vindo de volta
            </h1>

            <p className="text-slate-500 mt-2">
              Entre para acessar o painel do seu salão.
            </p>

          </div>

          {/* EMAIL */}
          <div className="mb-4">

            <label className="block text-sm font-medium text-slate-700 mb-2">
              E-mail
            </label>

            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full
                h-12
                border
                border-slate-200
                rounded-xl
                px-4
                text-slate-900
                placeholder:text-slate-300
                outline-none
                transition
                focus:border-slate-400
                focus:ring-4
                focus:ring-slate-100
              "
            />

          </div>

          {/* SENHA */}
          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Senha
            </label>

            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  entrar();
                }
              }}
              className="
                w-full
                h-12
                border
                border-slate-200
                rounded-xl
                px-4
                text-slate-900
                placeholder:text-slate-300
                outline-none
                transition
                focus:border-slate-400
                focus:ring-4
                focus:ring-slate-100
              "
            />

          </div>

          {/* ESQUECI SENHA */}
          <div className="flex justify-end mt-3 mb-6">

            <Link
              href="/esqueci-senha"
              className="
                text-sm
                font-medium
                text-slate-600
                underline
                underline-offset-4
                decoration-slate-300
                hover:text-slate-950
                hover:decoration-slate-950
                transition
              "
            >
              Esqueci minha senha
            </Link>

          </div>

          {/* BOTÃO */}
          <button
            onClick={entrar}
            disabled={loading}
            className="
              w-full
              h-12
              rounded-xl
              bg-slate-950
              text-white
              font-semibold
              hover:bg-slate-800
              active:scale-[0.99]
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {/* ERRO */}
          {mensagem && (
            <div
              className="
                mt-4
                rounded-xl
                bg-red-50
                border
                border-red-100
                px-4
                py-3
                text-sm
                text-red-600
              "
            >
              {mensagem}
            </div>
          )}

          {/* CADASTRO */}
          <div className="mt-7 pt-6 border-t border-slate-100 text-center">

            <p className="text-sm text-slate-500">
              Ainda não tem uma conta?{" "}

              <Link
                href="/cadastro"
                className="
                  font-normal
                  text-slate-900
                  underline
                  underline-offset-4
                  decoration-slate-300
                  hover:decoration-slate-900
                  transition
                "
              >
                Criar conta
              </Link>

            </p>

          </div>

        </div>

        {/* RODAPÉ */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Tavunex · Atendimento e agendamentos inteligentes
        </p>

      </div>

    </main>
  );
}