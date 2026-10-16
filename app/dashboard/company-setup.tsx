"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CompanyRequestError, completeCompanySetup, type Company } from "@/lib/company";

export default function CompanySetup({
  initialName,
  onComplete,
}: {
  initialName: string;
  onComplete: (company: Company) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    if (!name.trim()) {
      setError("Informe o nome do salão.");
      return;
    }

    submitting.current = true;
    setSaving(true);
    setError("");

    try {
      onComplete(await completeCompanySetup(name.trim()));
    } catch (error) {
      if (error instanceof CompanyRequestError && error.status === 401) {
        router.replace("/login");
        return;
      }

      setError(error instanceof CompanyRequestError
        ? error.message
        : "Não foi possível cadastrar o salão. Tente novamente.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="p-6 lg:p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Conclua o cadastro do seu salão</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Sua conta ainda não está vinculada a um salão. Cadastre seu salão para acessar o painel e conectar o WhatsApp.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Se você já faz parte de um salão cadastrado, peça ao responsável para vincular sua conta ou entre com a conta utilizada no cadastro.
        </p>

        <form onSubmit={submit} className="mt-6">
          <label htmlFor="company-name" className="block text-sm font-medium text-slate-700">
            Nome do salão
          </label>
          <input
            id="company-name"
            name="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={200}
            disabled={saving}
            placeholder="Ex: Studio Bella"
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-slate-900 focus:border-slate-400 focus:outline-none disabled:opacity-50"
          />
          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="mt-5 h-12 rounded-xl bg-slate-950 px-6 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Cadastrando..." : "Cadastrar salão"}
          </button>
        </form>
      </div>
    </main>
  );
}
