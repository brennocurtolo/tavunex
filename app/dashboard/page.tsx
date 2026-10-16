"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
};

export default function Dashboard() {
  const [company, setCompany] =
    useState<Company | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("company_users")
      .select(`
        company_id,
        companies (
          id,
          name,
          phone,
          address
        )
      `)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (data?.companies) {
      setCompany(
        data.companies as unknown as Company
      );
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8 text-slate-500">
        Carregando...
      </div>
    );
  }

  return (
    <main className="p-6 lg:p-8">

      {/* BOAS-VINDAS */}

      <div className="mb-8">

        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Visão geral
        </h1>

        <p className="text-slate-500 mt-2">
          Gerencie o atendimento e a agenda do{" "}
          <span className="font-medium text-slate-700">
            {company?.name}
          </span>.
        </p>

      </div>

      {/* STATUS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Atendimento IA
          </p>

          <div className="flex items-center gap-2 mt-3">

            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />

            <span className="font-semibold text-slate-900">
              Ativo
            </span>

          </div>

        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            WhatsApp
          </p>

          <p className="font-semibold text-slate-900 mt-3">
            Configuração
          </p>

        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Empresa
          </p>

          <p className="font-semibold text-slate-900 mt-3 truncate">
            {company?.name}
          </p>

        </div>

      </div>

      {/* ATALHOS */}

      <div>

        <div className="mb-4">

          <h2 className="text-lg font-semibold text-slate-900">
            Gerenciar salão
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Acesse rapidamente as principais áreas.
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          <DashboardCard
            href="/dashboard/agenda"
            title="Agenda"
            description="Consulte e gerencie seus agendamentos."
            icon="▣"
          />

          <DashboardCard
            href="/dashboard/servicos"
            title="Serviços"
            description="Configure procedimentos, preços e duração."
            icon="✦"
          />

          <DashboardCard
            href="/dashboard/profissionais"
            title="Profissionais"
            description="Cadastre e gerencie sua equipe."
            icon="♙"
          />

          <DashboardCard
            href="/dashboard/horarios"
            title="Horários"
            description="Defina os horários de funcionamento."
            icon="◷"
          />

          <DashboardCard
            href="/dashboard/conversas"
            title="Conversas"
            description="Veja clientes aguardando atendimento humano."
            icon="◌"
          />

          <DashboardCard
            href="/dashboard/configuracoes"
            title="Configurações"
            description="Gerencie salão, conta e WhatsApp."
            icon="⚙"
          />

        </div>

      </div>

    </main>
  );
}

function DashboardCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="
        group
        bg-white
        border
        border-slate-200
        rounded-2xl
        p-5
        shadow-sm
        hover:shadow-md
        hover:border-slate-300
        transition
      "
    >

      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 mb-5 text-lg">
        {icon}
      </div>

      <div className="flex items-center justify-between gap-3">

        <h3 className="font-semibold text-slate-900">
          {title}
        </h3>

        <span className="text-slate-300 group-hover:text-slate-700 transition">
          →
        </span>

      </div>

      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        {description}
      </p>

    </Link>
  );
}