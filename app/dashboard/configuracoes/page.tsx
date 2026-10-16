import Link from "next/link";

export default function ConfiguracoesPage() {
  return (
    <main className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Configurações
          </h1>
          <p className="text-slate-500 mt-2">
            Configure a conexão do WhatsApp do seu salão.
          </p>
        </div>

        <Link
          href="/dashboard/configuracoes/whatsapp"
          className="group block max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">
            W
          </div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">WhatsApp</h2>
            <span aria-hidden="true" className="text-slate-400 group-hover:text-slate-950">
              →
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Conecte seu número do WhatsApp Business e consulte os dados da conexão.
          </p>
        </Link>
      </div>
    </main>
  );
}
