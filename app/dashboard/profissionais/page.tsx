"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  name: string;
  role: string | null;
};

export default function ProfissionaisPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function getCompanyId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return null;
    }

    const { data, error } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    return data.company_id;
  }

  async function loadEmployees() {
    setLoading(true);

    const id = await getCompanyId();

    if (!id) {
      setLoading(false);
      return;
    }

    setCompanyId(id);

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, role")
      .eq("company_id", id)
      .eq("active", true)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setEmployees(data || []);
    setLoading(false);
  }

  async function addEmployee() {
    setMessage("");
    setSuccess(false);

    if (!companyId || !name.trim()) {
      setMessage("Digite o nome do profissional.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("employees")
      .insert({
        company_id: companyId,
        name: name.trim(),
        role: role.trim() || null,
      });

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao cadastrar profissional.");
      return;
    }

    setName("");
    setRole("");

    setSuccess(true);
    setMessage("Profissional cadastrado com sucesso.");

    await loadEmployees();
  }

  if (loading) {
    return (
      <main className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
          Carregando profissionais...
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* CABEÇALHO */}
        <div className="mb-8">
          <p className="text-sm text-slate-500 mb-1">
            Equipe
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Profissionais
          </h1>

          <p className="text-slate-500 mt-2">
            Cadastre e gerencie os profissionais que atendem no salão.
          </p>
        </div>

        {/* NOVO PROFISSIONAL */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-7 mb-6">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Novo profissional
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Adicione uma pessoa à equipe do salão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome
              </label>

              <input
                type="text"
                placeholder="Ex: Marta Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="
                  w-full
                  h-12
                  border
                  border-slate-300
                  rounded-xl
                  px-4
                  bg-white
                  text-slate-900
                  placeholder:text-slate-400
                  outline-none
                  transition
                  focus:border-slate-500
                  focus:ring-4
                  focus:ring-slate-100
                "
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Função
              </label>

              <input
                type="text"
                placeholder="Ex: Cabeleireira"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="
                  w-full
                  h-12
                  border
                  border-slate-300
                  rounded-xl
                  px-4
                  bg-white
                  text-slate-900
                  placeholder:text-slate-400
                  outline-none
                  transition
                  focus:border-slate-500
                  focus:ring-4
                  focus:ring-slate-100
                "
              />
            </div>

          </div>

          <div className="mt-6">
            <button
              onClick={addEmployee}
              disabled={saving}
              className="
                h-12
                px-6
                rounded-xl
                bg-slate-950
                text-white
                font-semibold
                hover:bg-slate-800
                disabled:opacity-50
                disabled:cursor-not-allowed
                transition
              "
            >
              {saving
                ? "Adicionando..."
                : "Adicionar profissional"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                success
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-red-50 border-red-100 text-red-600"
              }`}
            >
              {message}
            </div>
          )}

        </div>

        {/* LISTA */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">

            <div>
              <h2 className="font-semibold text-slate-950">
                Profissionais cadastrados
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {employees.length}{" "}
                {employees.length === 1
                  ? "profissional ativo"
                  : "profissionais ativos"}
              </p>
            </div>

            <div className="min-w-9 h-9 px-2 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
              {employees.length}
            </div>

          </div>

          {employees.length === 0 && (
            <div className="py-16 px-6 text-center">

              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-xl">
                ♙
              </div>

              <h3 className="font-semibold text-slate-900">
                Nenhum profissional cadastrado
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Adicione o primeiro profissional para começar a configurar a agenda.
              </p>

            </div>
          )}

          {employees.length > 0 && (
            <div className="divide-y divide-slate-200">

              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="px-6 py-5 flex items-center gap-4"
                >

                  {/* AVATAR */}
                  <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold shrink-0">
                    {employee.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">

                    <h3 className="font-semibold text-slate-950 truncate">
                      {employee.name}
                    </h3>

                    <p className="text-sm text-slate-500 mt-0.5">
                      {employee.role || "Função não informada"}
                    </p>

                  </div>

                  <div className="shrink-0">

                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Ativo
                    </span>

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}