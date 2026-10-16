"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CompanyRequestError, getCurrentCompany, type Company } from "@/lib/company";

declare global {
  interface Window {
    FB?: {
      init: (options: {
        appId: string | undefined;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } } | null) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: { setup: Record<string, never>; sessionInfoVersion: string };
        },
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export default function WhatsAppConfigPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [connectionError, setConnectionError] = useState("");
  const [connectionMessage, setConnectionMessage] = useState("");

  const embeddedSignupData = useRef<{
    wabaId: string | null;
    phoneNumberId: string | null;
  }>({
    wabaId: null,
    phoneNumberId: null,
  });

  // =====================================================
  // CARREGA EMPRESA
  // =====================================================

  const loadCompany = useCallback(() => {
    return getCurrentCompany()
      .then((company) => {
        setCompany(company);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (error instanceof CompanyRequestError && error.status === 401) {
          router.replace("/login");
          return;
        }
        setCompany(null);
        setLoadError(error instanceof CompanyRequestError
          ? error.message
          : "Não foi possível carregar os dados do salão. Tente novamente.");
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  // =====================================================
  // ESCUTA EVENTOS DO EMBEDDED SIGNUP
  // =====================================================

  useEffect(() => {
    function handleMetaMessage(event: MessageEvent) {
      if (
        !event.origin.endsWith("facebook.com") &&
        !event.origin.endsWith("facebook.net")
      ) {
        return;
      }

      try {
        const data =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;

        if (data?.type !== "WA_EMBEDDED_SIGNUP") {
          return;
        }

        console.log("META EMBEDDED SIGNUP:", data);

        if (data.event === "FINISH") {
          const wabaId =
            data.data?.waba_id || null;

          const phoneNumberId =
            data.data?.phone_number_id || null;

          embeddedSignupData.current = {
            wabaId,
            phoneNumberId,
          };

          console.log("WABA ID:", wabaId);
          console.log(
            "PHONE NUMBER ID:",
            phoneNumberId
          );
        }

        if (data.event === "CANCEL") {
          setConnecting(false);
          setConnectionMessage(
            "A conexão com o WhatsApp foi cancelada."
          );
        }

        if (data.event === "ERROR") {
          console.error(
            "Erro no Embedded Signup:",
            data
          );

          setConnecting(false);

          setConnectionError(
            "Ocorreu um erro durante a conexão com a Meta."
          );
        }
      } catch {
        // Ignora outros postMessages da Meta.
      }
    }

    window.addEventListener(
      "message",
      handleMetaMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMetaMessage
      );
    };
  }, []);

  // =====================================================
  // INICIALIZA SDK DA META
  // =====================================================

  function initializeFacebookSDK() {
    if (!window.FB) {
      setConnectionError(
        "O SDK da Meta não foi carregado corretamente."
      );
      return;
    }

    window.FB.init({
      appId: process.env.NEXT_PUBLIC_META_APP_ID,
      cookie: true,
      xfbml: true,
      version: "v25.0",
    });

    setSdkReady(true);

    console.log("Facebook SDK carregado.");
  }

  // =====================================================
  // ABRE EMBEDDED SIGNUP
  // =====================================================

  function connectWhatsApp() {
    setConnectionError("");
    setConnectionMessage("");

    if (window.location.protocol !== "https:") {
      setConnecting(false);
      setConnectionError(
        "Para conectar o WhatsApp, abra este painel pelo endereço HTTPS e entre novamente. A Meta não permite iniciar a conexão em uma página HTTP."
      );
      return;
    }

    embeddedSignupData.current = {
      wabaId: null,
      phoneNumberId: null,
    };

    if (!window.FB) {
      setConnectionError(
        "O SDK da Meta não está disponível."
      );
      return;
    }

    const configId =
      process.env.NEXT_PUBLIC_META_CONFIG_ID;

    if (!configId) {
      setConnectionError(
        "NEXT_PUBLIC_META_CONFIG_ID não encontrado."
      );
      return;
    }

    console.log("Abrindo Embedded Signup...");
    console.log("Config ID:", configId);

    setConnecting(true);

    try {
      window.FB.login(
        (response) => {
          console.log(
            "RESPOSTA FB.LOGIN:",
            response
          );

          if (!response) {
            setConnecting(false);

            setConnectionError(
              "A Meta não retornou uma resposta."
            );

            return;
          }

          const code =
            response?.authResponse?.code;

          if (!code) {
            setConnecting(false);

            setConnectionError(
              "A conexão foi cancelada ou não autorizada."
            );

            return;
          }

          finishWhatsAppConnection(code);
        },
        {
          config_id: configId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            sessionInfoVersion: "3",
          },
        }
      );
    } catch (error) {
      console.error(
        "ERRO AO ABRIR META:",
        error
      );

      setConnecting(false);

      setConnectionError(
        "Erro ao abrir a janela da Meta."
      );
    }
  }

  // =====================================================
  // FINALIZA CONEXÃO NO NOSSO BACKEND
  // =====================================================

  async function finishWhatsAppConnection(
    code: string
  ) {
    try {
      // O evento FINISH e o callback do FB.login
      // podem chegar quase ao mesmo tempo.
      //
      // Damos um pequeno tempo para o listener
      // receber waba_id e phone_number_id.
      await new Promise((resolve) =>
        setTimeout(resolve, 1200)
      );

      const wabaId =
        embeddedSignupData.current.wabaId;

      const phoneNumberId =
        embeddedSignupData.current
          .phoneNumberId;

      if (!wabaId || !phoneNumberId) {
        setConnectionError(
          "A Meta não retornou os dados do número do WhatsApp."
        );

        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/dashboard/configuracoes/whatsapp/connect",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            code,
            wabaId,
            phoneNumberId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "Erro ao finalizar conexão:",
          data
        );

        setConnectionError(
          data.error ||
            "Não foi possível conectar o WhatsApp."
        );

        return;
      }

      setConnectionMessage(
        "WhatsApp conectado com sucesso."
      );

      await loadCompany();

    } catch (error) {
      console.error(
        "Erro ao conectar WhatsApp:",
        error
      );

      setConnectionError(
        "Erro ao conectar o WhatsApp."
      );

    } finally {
      setConnecting(false);
    }
  }

  // =====================================================
  // FORMATA TELEFONE
  // =====================================================

  function formatPhone(
    phone: string | null
  ) {
    if (!phone) return "";

    if (
      phone.startsWith("55") &&
      phone.length >= 12
    ) {
      const ddd = phone.slice(2, 4);

      const first = phone.slice(
        4,
        -4
      );

      const last = phone.slice(-4);

      return `+55 (${ddd}) ${first}-${last}`;
    }

    return phone;
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="p-6 lg:p-8">

        <div className="flex items-center gap-3 text-slate-500">

          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />

          Carregando configuração...

        </div>

      </main>
    );
  }

  // =====================================================
  // EMPRESA NÃO ENCONTRADA
  // =====================================================

  if (!company) {
    return (
      <main className="p-6 lg:p-8">

        <p role={loadError ? "alert" : undefined} className="text-slate-500">
          {loadError || "Sua conta ainda não está vinculada a um salão. Volte ao painel para concluir o cadastro."}
        </p>

        {loadError ? (
          <button
            onClick={() => {
              setLoading(true);
              void loadCompany();
            }}
            className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
          >
            Tentar novamente
          </button>
        ) : (
          <Link href="/dashboard" className="mt-4 inline-block text-slate-900 underline">
            Voltar ao painel
          </Link>
        )}

      </main>
    );
  }

  // =====================================================
  // INTERFACE
  // =====================================================

  return (
    <>

      {/* SDK OFICIAL DA META */}

      <Script
        src="https://connect.facebook.net/pt_BR/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onReady={initializeFacebookSDK}
      />

      <main className="p-6 lg:p-8">

        <div className="max-w-5xl mx-auto">

          {/* CABEÇALHO */}

          <div className="mb-8">

            <p className="text-sm text-slate-500 mb-1">
              Configurações
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              WhatsApp
            </h1>

            <p className="text-slate-500 mt-2">
              Conecte o número do WhatsApp Business usado pelo seu salão.
            </p>

          </div>

          {/* CARD PRINCIPAL */}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            {/* HEADER */}

            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">

              <div>

                <h2 className="font-semibold text-slate-950">
                  Conexão do WhatsApp
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {company.name}
                </p>

              </div>

              {company.whatsapp_connected ? (

                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">

                  <span className="w-2 h-2 rounded-full bg-emerald-500" />

                  Conectado

                </span>

              ) : (

                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">

                  <span className="w-2 h-2 rounded-full bg-slate-400" />

                  Não conectado

                </span>

              )}

            </div>

            {/* ================================================= */}
            {/* NÃO CONECTADO */}
            {/* ================================================= */}

            {!company.whatsapp_connected && (

              <div className="p-6 lg:p-8">

                <div className="max-w-2xl">

                  <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-lg mb-5">
                    W
                  </div>

                  <h3 className="text-xl font-semibold text-slate-950">
                    Conecte o WhatsApp do seu salão
                  </h3>

                  <p className="text-slate-500 mt-2 leading-relaxed">
                    Você será direcionado para o
                    processo oficial da Meta para
                    selecionar ou cadastrar o número
                    utilizado pelo seu salão.
                  </p>

                  {/* INFORMAÇÕES */}

                  <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">

                    <p className="text-sm font-medium text-slate-700">
                      Depois da conexão
                    </p>

                    <div className="mt-3 space-y-2 text-sm text-slate-500">

                      <p>
                        ✓ O número ficará vinculado somente a este salão
                      </p>

                      <p>
                        ✓ A IA poderá receber e responder mensagens
                      </p>

                      <p>
                        ✓ A IA utilizará os serviços e profissionais cadastrados
                      </p>

                      <p>
                        ✓ Os horários serão consultados na agenda deste salão
                      </p>

                      <p>
                        ✓ Pedidos de atendimento humano aparecerão no painel
                      </p>

                    </div>

                  </div>

                  {/* ERRO */}

                  {connectionError && (

                    <div className="mt-5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">

                      {connectionError}

                    </div>

                  )}

                  {/* SUCESSO */}

                  {connectionMessage && (

                    <div className="mt-5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm">

                      {connectionMessage}

                    </div>

                  )}

                  {/* BOTÃO */}

                  <button
                    onClick={connectWhatsApp}
                    disabled={
                      connecting ||
                      !sdkReady
                    }
                    className="
                      mt-6
                      h-12
                      px-6
                      rounded-xl
                      bg-slate-950
                      text-white
                      font-semibold
                      hover:bg-slate-800
                      active:scale-[0.99]
                      disabled:opacity-50
                      disabled:cursor-not-allowed
                      transition
                    "
                  >
                    {connecting
                      ? "Conectando..."
                      : sdkReady
                      ? "Conectar WhatsApp"
                      : "Carregando Meta..."}
                  </button>

                  {!sdkReady && (

                    <p className="text-xs text-slate-400 mt-3">
                      Preparando conexão segura com a Meta...
                    </p>

                  )}

                </div>

              </div>

            )}

            {/* ================================================= */}
            {/* CONECTADO */}
            {/* ================================================= */}

            {company.whatsapp_connected && (

              <div className="p-6 lg:p-8">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* NÚMERO */}

                  <div className="border border-slate-200 rounded-xl p-5">

                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                      Número conectado
                    </p>

                    <p className="text-lg font-semibold text-slate-950 mt-2">

                      {formatPhone(
                        company
                          .whatsapp_display_phone_number
                      ) || "Número não informado"}

                    </p>

                  </div>

                  {/* STATUS */}

                  <div className="border border-slate-200 rounded-xl p-5">

                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                      Status da IA
                    </p>

                    <div className="flex items-center gap-2 mt-2">

                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />

                      <p className="font-semibold text-slate-950">
                        Ativa
                      </p>

                    </div>

                  </div>

                  {/* WABA */}

                  <div className="border border-slate-200 rounded-xl p-5">

                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                      Conta do WhatsApp Business
                    </p>

                    <p className="text-sm font-medium text-slate-700 mt-2 break-all">

                      {company.whatsapp_waba_id ||
                        "Não informado"}

                    </p>

                  </div>

                  {/* PHONE NUMBER ID */}

                  <div className="border border-slate-200 rounded-xl p-5">

                    <p className="text-xs uppercase tracking-wide text-slate-400 font-medium">
                      Identificador do número
                    </p>

                    <p className="text-sm font-medium text-slate-700 mt-2 break-all">

                      {company
                        .whatsapp_phone_number_id ||
                        "Não informado"}

                    </p>

                  </div>

                </div>

                {connectionMessage && (

                  <div className="mt-5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl px-4 py-3 text-sm">

                    {connectionMessage}

                  </div>

                )}

              </div>

            )}

          </div>

        </div>

      </main>

    </>
  );
}
