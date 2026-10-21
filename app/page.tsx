import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tavunex | Atendimento para salões",
  description:
    "Organize o atendimento do seu salão pelo WhatsApp com a Tavunex.",
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fa] text-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Tavunex<span className="text-emerald-600">.</span>
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 pb-20 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:pb-28 lg:pt-24">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Feita para a rotina do seu salão
          </p>

          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Seu atendimento no WhatsApp,{" "}
            <span className="text-emerald-700">mais organizado.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            A Tavunex ajuda salões a organizar conversas, apresentar serviços e
            cuidar dos agendamentos em um só lugar, com automação e
            acompanhamento humano quando necessário.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Acessar a plataforma
            </Link>
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Criar uma conta
            </Link>
          </div>
        </div>

        <div
          aria-label="Resumo dos recursos da Tavunex"
          className="relative"
        >
          <div className="absolute -inset-5 rounded-[2rem] bg-emerald-100/70 blur-2xl" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Atendimento do salão
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Conversas em um só lugar
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                WhatsApp
              </span>
            </div>

            <div className="space-y-4 py-6">
              <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700">
                Olá! Gostaria de saber os serviços disponíveis.
              </div>
              <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-emerald-700 px-4 py-3 text-sm leading-6 text-white">
                Olá! Será um prazer ajudar. Você pode consultar os serviços e
                horários disponíveis por aqui.
              </div>
            </div>

            <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Conversas organizadas
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Acompanhe o atendimento em um painel.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Mais praticidade
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Apoio para serviços e agendamentos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Tavunex. Todos os direitos reservados.</p>
          <nav aria-label="Links legais" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href="/politica-de-privacidade"
              className="transition hover:text-slate-900"
            >
              Política de Privacidade
            </Link>
            <Link
              href="/exclusao-de-dados"
              className="transition hover:text-slate-900"
            >
              Exclusão de dados
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
