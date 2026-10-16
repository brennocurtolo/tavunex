"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BusinessHour = {
  id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
};

const days = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default function HorariosPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadHours();
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

  async function loadHours() {
    setLoading(true);

    const id = await getCompanyId();

    if (!id) {
      setLoading(false);
      return;
    }

    setCompanyId(id);

    const { data, error } = await supabase
      .from("business_hours")
      .select("*")
      .eq("company_id", id)
      .order("day_of_week");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setHours(data);
      setLoading(false);
      return;
    }

    const defaultHours = days.map((_, index) => ({
      day_of_week: index,
      is_open: index !== 0,
      open_time: "08:00",
      close_time: "18:00",
    }));

    setHours(defaultHours);
    setLoading(false);
  }

  function updateHour(
    index: number,
    field: keyof BusinessHour,
    value: string | boolean
  ) {
    setHours((current) =>
      current.map((hour, i) =>
        i === index
          ? { ...hour, [field]: value }
          : hour
      )
    );
  }

  async function saveHours() {
    if (!companyId) return;

    setSaving(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase
      .from("business_hours")
      .upsert(
        hours.map((hour) => ({
          company_id: companyId,
          day_of_week: hour.day_of_week,
          is_open: hour.is_open,
          open_time: hour.is_open ? hour.open_time : null,
          close_time: hour.is_open ? hour.close_time : null,
        })),
        {
          onConflict: "company_id,day_of_week",
        }
      );

    setSaving(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao salvar horários.");
      return;
    }

    setSuccess(true);
    setMessage("Horários salvos com sucesso.");
  }

  if (loading) {
    return (
      <main className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
          Carregando horários...
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
            Configuração
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Horários de funcionamento
          </h1>

          <p className="text-slate-500 mt-2">
            Defina os dias e horários em que o salão está aberto.
          </p>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="font-semibold text-slate-950">
              Semana
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Ative ou desative cada dia e configure os horários.
            </p>
          </div>

          <div className="divide-y divide-slate-200">

            {hours.map((hour, index) => (
              <div
                key={hour.day_of_week}
                className="p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                  {/* DIA */}
                  <div className="min-w-[180px]">
                    <h3 className="font-semibold text-slate-950">
                      {days[hour.day_of_week]}
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {hour.is_open
                        ? "Salão aberto neste dia"
                        : "Salão fechado neste dia"}
                    </p>
                  </div>

                  {/* CONTROLES */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 justify-end">

                    {/* TOGGLE */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">

                      <button
                        type="button"
                        onClick={() =>
                          updateHour(
                            index,
                            "is_open",
                            !hour.is_open
                          )
                        }
                        className={`relative w-11 h-6 rounded-full transition ${
                          hour.is_open
                            ? "bg-slate-950"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition ${
                            hour.is_open
                              ? "left-[22px]"
                              : "left-0.5"
                          }`}
                        />
                      </button>

                      <span className="text-sm font-medium text-slate-700">
                        {hour.is_open ? "Aberto" : "Fechado"}
                      </span>

                    </label>

                    {/* HORÁRIOS */}
                    {hour.is_open && (
                      <div className="flex flex-col sm:flex-row gap-3">

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Abertura
                          </label>

                          <input
                            type="time"
                            value={hour.open_time}
                            onChange={(e) =>
                              updateHour(
                                index,
                                "open_time",
                                e.target.value
                              )
                            }
                            className="
                              h-11
                              border
                              border-slate-300
                              rounded-xl
                              px-3
                              bg-white
                              text-slate-900
                              outline-none
                              transition
                              focus:border-slate-500
                              focus:ring-4
                              focus:ring-slate-100
                            "
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Fechamento
                          </label>

                          <input
                            type="time"
                            value={hour.close_time}
                            onChange={(e) =>
                              updateHour(
                                index,
                                "close_time",
                                e.target.value
                              )
                            }
                            className="
                              h-11
                              border
                              border-slate-300
                              rounded-xl
                              px-3
                              bg-white
                              text-slate-900
                              outline-none
                              transition
                              focus:border-slate-500
                              focus:ring-4
                              focus:ring-slate-100
                            "
                          />
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              </div>
            ))}

          </div>
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

        {/* BOTÃO */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveHours}
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
              ? "Salvando..."
              : "Salvar horários"}
          </button>
        </div>

      </div>
    </main>
  );
}