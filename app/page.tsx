"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Tavunex
        </h1>

        <p className="text-slate-500 mb-8">
          Atendimento inteligente para salões.
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full text-center bg-slate-900 text-white rounded-xl px-5 py-3 font-medium"
          >
            Entrar
          </Link>

          <Link
            href="/cadastro"
            className="block w-full text-center border border-slate-200 rounded-xl px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}