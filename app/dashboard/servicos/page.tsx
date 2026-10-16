"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
};

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  // =====================================================
  // EMPRESA DO USUÁRIO
  // =====================================================

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

  // =====================================================
  // CARREGAR SERVIÇOS
  // =====================================================

  async function loadServices() {
    setLoading(true);

    const id = await getCompanyId();

    if (!id) {
      setLoading(false);
      return;
    }

    setCompanyId(id);

    const { data, error } = await supabase
      .from("services")
      .select(
        "id, name, description, price, duration_minutes"
      )
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

    setServices(data || []);
    setLoading(false);
  }

  // =====================================================
  // ADICIONAR SERVIÇO
  // =====================================================

  async function addService() {
    setMessage("");
    setSuccess(false);

    if (!companyId) return;

    if (!name.trim()) {
      setMessage("Digite o nome do serviço.");
      return;
    }

    const parsedPrice = Number(
      price.replace(",", ".")
    );

    const parsedDuration = Number(duration);

    if (
      price.trim() &&
      (Number.isNaN(parsedPrice) || parsedPrice < 0)
    ) {
      setMessage("Digite um preço válido.");
      return;
    }

    if (
      Number.isNaN(parsedDuration) ||
      parsedDuration <= 0
    ) {
      setMessage("Digite uma duração válida.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("services")
      .insert({
        company_id: companyId,
        name: name.trim(),
        description:
          description.trim() || null,
        price: parsedPrice || 0,
        duration_minutes: parsedDuration,
      });

    setSaving(false);

    if (error) {
      console.error(error);

      setMessage(
        "Erro ao cadastrar serviço."
      );

      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setDuration("30");

    setSuccess(true);

    setMessage(
      "Serviço cadastrado com sucesso."
    );

    await loadServices();
  }

  // =====================================================
  // FORMATA PREÇO
  // =====================================================

  function formatPrice(value: number) {
    return Number(value).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />

          Carregando serviços...
        </div>
      </main>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <main className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* CABEÇALHO */}

        <div className="mb-8">
          <p className="text-sm text-slate-500 mb-1">
            Catálogo
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Serviços
          </h1>

          <p className="text-slate-500 mt-2">
            Cadastre os procedimentos oferecidos pelo salão.
          </p>
        </div>

        {/* NOVO SERVIÇO */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-7 mb-6">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-950">
              Novo serviço
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Informe o serviço, valor e tempo necessário para o atendimento.
            </p>
          </div>

          <div className="space-y-5">

            {/* NOME */}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome do serviço
              </label>

              <input
                type="text"
                placeholder="Ex: Corte feminino"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
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

            {/* DESCRIÇÃO */}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descrição
              </label>

              <textarea
                placeholder="Ex: Corte personalizado de acordo com o formato do rosto e preferência da cliente."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                rows={3}
                className="
                  w-full
                  border
                  border-slate-300
                  rounded-xl
                  px-4
                  py-3
                  bg-white
                  text-slate-900
                  placeholder:text-slate-400
                  outline-none
                  resize-none
                  transition
                  focus:border-slate-500
                  focus:ring-4
                  focus:ring-slate-100
                "
              />

              <p className="text-xs text-slate-400 mt-2">
                Essa informação também poderá ser usada pela IA para explicar o serviço aos clientes.
              </p>
            </div>

            {/* PREÇO + DURAÇÃO */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preço
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    R$
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value)
                    }
                    className="
                      w-full
                      h-12
                      border
                      border-slate-300
                      rounded-xl
                      pl-11
                      pr-4
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Duração
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="30"
                    value={duration}
                    onChange={(e) =>
                      setDuration(e.target.value)
                    }
                    className="
                      w-full
                      h-12
                      border
                      border-slate-300
                      rounded-xl
                      px-4
                      pr-20
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

                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                    minutos
                  </span>
                </div>
              </div>

            </div>

          </div>

          {/* BOTÃO */}

          <div className="mt-6">
            <button
              onClick={addService}
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
                : "Adicionar serviço"}
            </button>
          </div>

          {/* MENSAGEM */}

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

        {/* SERVIÇOS CADASTRADOS */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">

            <div>
              <h2 className="font-semibold text-slate-950">
                Serviços cadastrados
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {services.length}{" "}
                {services.length === 1
                  ? "serviço ativo"
                  : "serviços ativos"}
              </p>
            </div>

            <div className="min-w-9 h-9 px-2 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
              {services.length}
            </div>

          </div>

          {/* SEM SERVIÇOS */}

          {services.length === 0 && (
            <div className="py-16 px-6 text-center">

              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-xl">
                ✂
              </div>

              <h3 className="font-semibold text-slate-900">
                Nenhum serviço cadastrado
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Cadastre o primeiro serviço oferecido pelo salão.
              </p>

            </div>
          )}

          {/* LISTA */}

          {services.length > 0 && (
            <div className="divide-y divide-slate-200">

              {services.map((service) => (
                <div
                  key={service.id}
                  className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >

                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-semibold shrink-0">
                    ✂
                  </div>

                  <div className="min-w-0 flex-1">

                    <h3 className="font-semibold text-slate-950">
                      {service.name}
                    </h3>

                    {service.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                        {service.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">

                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {service.duration_minutes} min
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>

                    </div>

                  </div>

                  <div className="sm:text-right shrink-0">

                    <p className="text-lg font-bold text-slate-950">
                      {formatPrice(service.price)}
                    </p>

                    <p className="text-xs text-slate-400 mt-0.5">
                      por atendimento
                    </p>

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