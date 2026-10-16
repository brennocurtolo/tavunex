"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Cadastro() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [salao, setSalao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function cadastrar() {
    setMensagem("");
    setSuccess(false);

    if (!nome.trim() || !email.trim() || !senha || !salao.trim()) {
      setMensagem("Preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: {
            name: nome.trim(),
            company_name: salao.trim(),
          },
        },
      });

    if (authError) {
      console.error(authError);
      setLoading(false);
      setMensagem(authError.message);
      return;
    }

    if (!authData.user) {
      setLoading(false);
      setMensagem("Não foi possível criar o usuário.");
      return;
    }

    if (!authData.session) {
      setLoading(false);
      setSuccess(true);
      setMensagem(
        "Conta criada. Confirme seu e-mail e entre para concluir o cadastro do salão."
      );
      return;
    }

    const { error: companyError } = await supabase.rpc(
      "create_company",
      {
        company_name: salao.trim(),
      }
    );

    if (companyError) {
      console.error(companyError);
      setLoading(false);
      setMensagem("Sua conta foi criada, mas o cadastro do salão não foi concluído. Entre para tentar novamente.");
      return;
    }

    setLoading(false);
    setSuccess(true);
    setMensagem("Conta criada com sucesso.");

    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

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

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm px-8 py-9">

          {/* MARCA */}
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

          {/* TÍTULO */}
          <div className="mb-8">

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Criar sua conta
            </h1>

            <p className="text-slate-500 mt-2">
              Cadastre seu salão para começar a configurar seu atendimento.
            </p>

          </div>

          {/* NOME */}
          <div className="mb-4">

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Seu nome
            </label>

            <input
              type="text"
              placeholder="Digite seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
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

          {/* SALÃO */}
          <div className="mb-4">

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome do salão
            </label>

            <input
              type="text"
              placeholder="Ex: Studio Bella"
              value={salao}
              onChange={(e) => setSalao(e.target.value)}
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
              placeholder="Mínimo de 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  cadastrar();
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

          {/* BOTÃO */}
          <button
            onClick={cadastrar}
            disabled={loading}
            className="
              w-full
              h-12
              mt-6
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
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          {/* MENSAGEM */}
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

          {/* LOGIN */}
          <div className="mt-7 pt-6 border-t border-slate-100 text-center">

            <p className="text-sm text-slate-500">
              Já tem uma conta?{" "}

              <Link
                href="/login"
                className="
                  text-sm
                  font-normal
                  text-slate-600
                  underline
                  underline-offset-4
                  decoration-slate-300
                  hover:text-slate-950
                  hover:decoration-slate-950
                  transition
                "
              >
                Entrar
              </Link>
            </p>

          </div>

        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Tavunex · Atendimento e agendamentos inteligentes
        </p>

      </div>
    </main>
  );
}
