"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RedefinirSenhaPage() {
  const router = useRouter();

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [recoveryValid, setRecoveryValid] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    verificarRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryValid(true);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function verificarRecovery() {
    // Se o Supabase conseguiu processar o link,
    // haverá uma sessão de recuperação válida.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      setRecoveryValid(true);
    }

    setLoading(false);
  }

  async function redefinirSenha() {
    setMensagem("");

    if (!recoveryValid) {
      setMensagem(
        "Este link de recuperação é inválido ou expirou. Solicite um novo link."
      );
      return;
    }

    if (senha.length < 6) {
      setMensagem(
        "A senha precisa ter pelo menos 6 caracteres."
      );
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem("As senhas não coincidem.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: senha,
    });

    setSaving(false);

    if (error) {
      console.error(error);

      setMensagem(
        "Não foi possível alterar a senha. Solicite um novo link de recuperação."
      );

      return;
    }

    setMensagem("Senha alterada com sucesso.");

    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <p className="text-slate-500">
          Validando link de recuperação...
        </p>
      </main>
    );
  }

  if (!recoveryValid) {
    return (
      <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm p-8">

          <h1 className="text-2xl font-bold text-slate-950">
            Link inválido ou expirado
          </h1>

          <p className="text-slate-500 mt-2">
            Solicite um novo link para redefinir sua senha.
          </p>

          <Link
            href="/esqueci-senha"
            className="
              inline-block
              mt-6
              text-sm
              font-normal
              text-slate-600
              underline
              underline-offset-4
              decoration-slate-300
              hover:text-slate-950
              hover:decoration-slate-950
            "
          >
            Solicitar novo link
          </Link>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6 py-10">

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-sm px-8 py-9">

        <div className="flex items-center gap-3 mb-7">

          <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            T
          </div>

          <div>
            <div className="font-bold text-slate-950">
              Tavunex
            </div>

            <div className="text-xs text-slate-400">
              Atendimento inteligente
            </div>
          </div>

        </div>

        <h1 className="text-3xl font-bold text-slate-950">
          Criar nova senha
        </h1>

        <p className="text-slate-500 mt-2 mb-7">
          Defina uma nova senha para sua conta.
        </p>

        <label className="block text-sm font-medium text-slate-700 mb-2">
          Nova senha
        </label>

        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Digite sua nova senha"
          className="
            w-full
            h-12
            border
            border-slate-200
            rounded-xl
            px-4
            mb-4
            outline-none
            focus:border-slate-400
            focus:ring-4
            focus:ring-slate-100
          "
        />

        <label className="block text-sm font-medium text-slate-700 mb-2">
          Confirmar nova senha
        </label>

        <input
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          placeholder="Digite novamente"
          className="
            w-full
            h-12
            border
            border-slate-200
            rounded-xl
            px-4
            outline-none
            focus:border-slate-400
            focus:ring-4
            focus:ring-slate-100
          "
        />

        <button
          onClick={redefinirSenha}
          disabled={saving}
          className="
            w-full
            h-12
            mt-5
            rounded-xl
            bg-slate-950
            text-white
            font-semibold
            hover:bg-slate-800
            disabled:opacity-50
          "
        >
          {saving ? "Alterando..." : "Alterar senha"}
        </button>

        {mensagem && (
          <p className="mt-4 text-sm text-slate-600">
            {mensagem}
          </p>
        )}

      </div>

    </main>
  );
}