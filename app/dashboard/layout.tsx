"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CompanyRequestError, getCurrentCompany, type Company } from "@/lib/company";
import CompanySetup from "./company-setup";

type UserInfo = {
  name: string;
  email: string;
};

const menu = [
  {
    name: "Visão geral",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    name: "Agenda",
    href: "/dashboard/agenda",
    icon: "▣",
  },
  {
    name: "Serviços",
    href: "/dashboard/servicos",
    icon: "✦",
  },
  {
    name: "Produtos",
    href: "/dashboard/produtos",
    icon: "▣",
  },
  {
    name: "Profissionais",
    href: "/dashboard/profissionais",
    icon: "♙",
  },
  {
    name: "Horários",
    href: "/dashboard/horarios",
    icon: "◷",
  },
  {
    name: "Conversas",
    href: "/dashboard/conversas",
    icon: "◌",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingCompanyName, setPendingCompanyName] = useState("");

  const loadData = useCallback(() => {
    return supabase.auth.getUser()
      .then(async ({ data: { user } }) => {
        if (!user) {
          router.replace("/login");
          return;
        }

        setUserInfo({
          name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
          email: user.email || "",
        });
        setPendingCompanyName(
          typeof user.user_metadata?.company_name === "string"
            ? user.user_metadata.company_name
            : "",
        );
        setCompany(await getCurrentCompany());
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (error instanceof CompanyRequestError && error.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(error instanceof CompanyRequestError
          ? error.message
          : "Não foi possível carregar os dados do salão. Tente novamente.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function logout() {
    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">

          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />

          Carregando painel...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      {/* SIDEBAR */}

      <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-slate-200 hidden lg:flex flex-col">

        {/* LOGO */}

        <div className="h-[82px] px-6 flex items-center border-b border-slate-100">

          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >

            <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold">
              W
            </div>

            <div>
              <div className="font-bold text-slate-950">
                Tavunex
              </div>

              <div className="text-xs text-slate-400">
                Atendimento inteligente
              </div>
            </div>

          </Link>

        </div>

        {/* SALÃO */}

        <div className="px-4 py-5">

          <div className="bg-slate-50 rounded-xl px-4 py-3">

            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Salão
            </p>

            <p className="font-semibold text-slate-900 mt-1 truncate">
              {company?.name || "Meu salão"}
            </p>

          </div>

        </div>

        {/* MENU */}

        <nav className="px-3 flex-1">

          <p className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">
            Menu
          </p>

          <div className="space-y-1">

            {menu.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex
                    items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-xl
                    text-sm
                    transition
                    ${
                      active
                        ? "bg-slate-950 text-white font-medium"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }
                  `}
                >
                  <span className="w-5 text-center">
                    {item.icon}
                  </span>

                  {item.name}
                </Link>
              );
            })}

          </div>

          <p className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium mt-8 mb-2">
            Administração
          </p>

          <Link
            href="/dashboard/configuracoes"
            className={`
              flex
              items-center
              gap-3
              px-3
              py-2.5
              rounded-xl
              text-sm
              transition
              ${
                pathname.startsWith(
                  "/dashboard/configuracoes"
                )
                  ? "bg-slate-950 text-white font-medium"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }
            `}
          >
            <span className="w-5 text-center">
              ⚙
            </span>

            Configurações
          </Link>

        </nav>

        {/* USUÁRIO */}

        <div className="border-t border-slate-100 p-4 relative">

          <button
            onClick={() =>
              setProfileOpen(!profileOpen)
            }
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition text-left"
          >

            {/* FOTO TEMPORÁRIA */}

            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold shrink-0">
              {userInfo?.name
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-sm font-semibold text-slate-900 truncate">
                {userInfo?.name}
              </p>

              <p className="text-xs text-slate-400 truncate">
                {userInfo?.email}
              </p>

            </div>

            <span className="text-slate-400">
              ⋯
            </span>

          </button>

          {/* MENU DO PERFIL */}

          {profileOpen && (
            <div className="absolute bottom-[78px] left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg p-2">

              <Link
                href="/dashboard/configuracoes/perfil"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="block px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Meu perfil
              </Link>

              <Link
                href="/dashboard/configuracoes/salao"
                onClick={() =>
                  setProfileOpen(false)
                }
                className="block px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Configurações do salão
              </Link>

              <div className="border-t border-slate-100 my-1" />

              <button
                onClick={logout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50"
              >
                Sair
              </button>

            </div>
          )}

        </div>

      </aside>

      {/* CONTEÚDO */}

      <div className="lg:pl-[260px]">

        {/* TOPBAR */}

        <header className="h-[82px] bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20">

          <div>
            <p className="text-sm text-slate-400">
              {company?.name}
            </p>
          </div>

          <div className="lg:hidden">

            <button
              onClick={logout}
              className="text-sm text-slate-600"
            >
              Sair
            </button>

          </div>

        </header>

        {loadError ? (
          <main className="p-6 lg:p-8">
            <p role="alert" className="text-red-700">{loadError}</p>
            <button
              onClick={() => {
                setLoading(true);
                void loadData();
              }}
              className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
            >
              Tentar novamente
            </button>
          </main>
        ) : company ? children : (
          <CompanySetup initialName={pendingCompanyName} onComplete={setCompany} />
        )}

      </div>

    </div>
  );
}
