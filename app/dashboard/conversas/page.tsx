"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Conversation = {
  id: string;
  customer_phone: string | null;
  customer_name: string;
  status: string;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
};

type Message = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export default function ConversasPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (!companyId) return;

    const interval = setInterval(async () => {
      await loadConversations(companyId);

      if (selectedConversation) {
        await loadMessages(selectedConversation.id);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [companyId, selectedConversation?.id]);

  async function loadCompany() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar empresa:", error);
      setLoading(false);
      return;
    }

    setCompanyId(data.company_id);

    await loadConversations(data.company_id);

    setLoading(false);
  }

  async function loadConversations(id?: string) {
    const currentCompanyId = id || companyId;

    if (!currentCompanyId) return;

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        customer_phone,
        status,
        updated_at
      `)
      .eq("company_id", currentCompanyId)
      .eq("status", "human")
      .order("updated_at", {
        ascending: false,
      });

    if (error) {
      console.error("Erro ao buscar conversas:", error);
      return;
    }

    const enrichedConversations = await Promise.all(
      (data || []).map(async (conversation) => {
        let customerName = "Cliente";

        if (conversation.customer_phone) {
          const { data: customer } = await supabase
            .from("customers")
            .select("name")
            .eq("company_id", currentCompanyId)
            .eq("phone", conversation.customer_phone)
            .maybeSingle();

          if (customer?.name) {
            customerName = customer.name;
          }
        }

        const { data: lastMessage } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        return {
          ...conversation,
          customer_name: customerName,
          last_message: lastMessage?.content || null,
          last_message_at: lastMessage?.created_at || null,
        };
      })
    );

    setConversations(enrichedConversations);

    if (selectedConversation) {
      const updated = enrichedConversations.find(
        (item) => item.id === selectedConversation.id
      );

      if (updated) {
        setSelectedConversation(updated);
      }
    }
  }

  async function openConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    setReply("");
    setLoadingConversation(true);

    await loadMessages(conversation.id);

    setLoadingConversation(false);
  }

  async function loadMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        role,
        content,
        created_at
      `)
      .eq("conversation_id", conversationId)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Erro ao buscar mensagens:", error);
      return;
    }

    setMessages(data || []);
  }

  async function returnToAI() {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Deseja devolver este atendimento para a IA?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("conversations")
      .update({
        status: "ai",
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedConversation.id);

    if (error) {
      console.error(error);
      alert("Erro ao devolver conversa para a IA.");
      return;
    }

    setSelectedConversation(null);
    setMessages([]);
    setReply("");

    await loadConversations();
  }

  async function sendReply() {
    if (!selectedConversation || !reply.trim()) return;

    setSending(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          message: reply.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao enviar mensagem.");
        return;
      }

      setReply("");

      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!sending && reply.trim()) {
        sendReply();
      }
    }
  }

  function formatPhone(phone: string | null) {
    if (!phone) return "";

    if (phone.startsWith("55") && phone.length >= 12) {
      const ddd = phone.slice(2, 4);
      const first = phone.slice(4, -4);
      const last = phone.slice(-4);

      return `+55 (${ddd}) ${first}-${last}`;
    }

    return phone;
  }

  function formatTime(date: string | null) {
    if (!date) return "";

    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMessageTime(date: string) {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <main className="p-6 lg:p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin" />
          Carregando atendimentos...
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 lg:p-8">
      <div className="max-w-[1500px] mx-auto">

        {/* HEADER */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div>
            <p className="text-sm text-slate-500 mb-1">
              Atendimento
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Conversas
            </h1>

            <p className="text-slate-500 mt-1">
              Clientes que solicitaram atendimento humano.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">

            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <span className="text-sm text-slate-600">
              Atualização automática
            </span>

          </div>
        </div>

        {/* CONTAINER */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[720px]">

          <div className="grid grid-cols-1 lg:grid-cols-[370px_1fr] min-h-[720px]">

            {/* LISTA */}
            <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50">

              <div className="p-5 border-b border-slate-200 bg-white">

                <div className="flex items-center justify-between">

                  <div>
                    <h2 className="font-semibold text-slate-950">
                      Aguardando
                    </h2>

                    <p className="text-sm text-slate-500 mt-0.5">
                      Atendimento humano
                    </p>
                  </div>

                  <div className="min-w-8 h-8 px-2 flex items-center justify-center bg-red-50 text-red-600 rounded-full text-sm font-semibold">
                    {conversations.length}
                  </div>

                </div>

              </div>

              <div className="p-3 space-y-2 max-h-[650px] overflow-y-auto">

                {conversations.length === 0 && (
                  <div className="py-20 px-5 text-center">

                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-xl">
                      ✓
                    </div>

                    <h3 className="font-semibold text-slate-900">
                      Tudo tranquilo
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Nenhum cliente está aguardando atendimento humano.
                    </p>

                  </div>
                )}

                {conversations.map((conversation) => {
                  const selected =
                    selectedConversation?.id === conversation.id;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() =>
                        openConversation(conversation)
                      }
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selected
                          ? "bg-white shadow-sm ring-1 ring-slate-300"
                          : "hover:bg-white"
                      }`}
                    >

                      <div className="flex gap-3">

                        <div className="shrink-0 w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold">
                          {conversation.customer_name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center justify-between gap-2">

                            <h3 className="font-semibold text-slate-950 truncate">
                              {conversation.customer_name}
                            </h3>

                            <span className="text-xs text-slate-400 shrink-0">
                              {formatTime(
                                conversation.last_message_at
                              )}
                            </span>

                          </div>

                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatPhone(
                              conversation.customer_phone
                            )}
                          </p>

                          <p className="text-sm text-slate-500 truncate mt-1.5">
                            {conversation.last_message ||
                              "Nova solicitação de atendimento"}
                          </p>

                        </div>

                      </div>

                    </button>
                  );
                })}

              </div>

            </aside>

            {/* CONVERSA */}
            <section className="flex flex-col min-w-0 bg-white">

              {!selectedConversation && (
                <div className="flex-1 flex items-center justify-center p-8">

                  <div className="max-w-sm text-center">

                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">
                      💬
                    </div>

                    <h2 className="text-xl font-semibold text-slate-950">
                      Selecione uma conversa
                    </h2>

                    <p className="text-slate-500 mt-2">
                      Escolha um cliente ao lado para visualizar o histórico e assumir o atendimento.
                    </p>

                  </div>

                </div>
              )}

              {selectedConversation && (
                <>

                  {/* TOPO */}
                  <div className="h-[82px] px-5 md:px-6 border-b border-slate-200 flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3 min-w-0">

                      <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
                        {selectedConversation.customer_name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">

                        <h2 className="font-semibold text-slate-950 truncate">
                          {selectedConversation.customer_name}
                        </h2>

                        <div className="flex items-center gap-2 mt-0.5">

                          <span className="w-2 h-2 rounded-full bg-amber-400" />

                          <span className="text-sm text-slate-500 truncate">
                            Atendimento humano
                          </span>

                        </div>

                      </div>

                    </div>

                    <button
                      onClick={returnToAI}
                      className="
                        shrink-0
                        border
                        border-slate-300
                        bg-white
                        hover:bg-slate-50
                        text-slate-700
                        font-medium
                        rounded-xl
                        px-4
                        py-2.5
                        transition
                      "
                    >
                      Devolver para IA
                    </button>

                  </div>

                  {/* HISTÓRICO */}
                  <div className="flex-1 p-5 md:p-7 bg-slate-50 overflow-y-auto max-h-[510px]">

                    {loadingConversation && (
                      <div className="text-center text-sm text-slate-400 py-8">
                        Carregando conversa...
                      </div>
                    )}

                    {!loadingConversation && (
                      <div className="space-y-4">

                        {messages.map((message) => {
                          const fromCustomer =
                            message.role === "user";

                          return (
                            <div
                              key={message.id}
                              className={`flex ${
                                fromCustomer
                                  ? "justify-start"
                                  : "justify-end"
                              }`}
                            >

                              <div
                                className={`max-w-[85%] md:max-w-[70%] ${
                                  fromCustomer
                                    ? ""
                                    : "text-right"
                                }`}
                              >

                                <div
                                  className={`inline-block text-left rounded-2xl px-4 py-3 ${
                                    fromCustomer
                                      ? "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                                      : "bg-slate-900 text-white rounded-br-md"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap leading-relaxed text-[15px]">
                                    {message.content}
                                  </p>
                                </div>

                                <div
                                  className={`text-[11px] text-slate-400 mt-1.5 px-1 ${
                                    fromCustomer
                                      ? ""
                                      : "text-right"
                                  }`}
                                >
                                  {formatMessageTime(
                                    message.created_at
                                  )}
                                </div>

                              </div>

                            </div>
                          );
                        })}

                      </div>
                    )}

                  </div>

                  {/* RESPOSTA */}
                  <div className="border-t border-slate-200 p-4 md:p-5 bg-white">

                    <div
                      className="
                        border
                        border-slate-300
                        rounded-xl
                        focus-within:ring-4
                        focus-within:ring-slate-100
                        focus-within:border-slate-400
                        transition
                        overflow-hidden
                      "
                    >

                      <textarea
                        value={reply}
                        onChange={(e) =>
                          setReply(e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Digite sua mensagem..."
                        className="
                          w-full
                          p-4
                          min-h-[95px]
                          resize-none
                          outline-none
                          bg-white
                          text-slate-900
                          placeholder:text-slate-400
                        "
                      />

                      <div className="px-3 pb-3 flex items-center justify-between gap-4">

                        <span className="text-xs text-slate-400 hidden sm:block">
                          Enter para enviar • Shift + Enter para quebrar linha
                        </span>

                        <button
                          onClick={sendReply}
                          disabled={
                            sending ||
                            !reply.trim()
                          }
                          className="
                            ml-auto
                            bg-slate-950
                            hover:bg-slate-800
                            text-white
                            font-medium
                            rounded-xl
                            px-5
                            py-2.5
                            disabled:opacity-40
                            disabled:cursor-not-allowed
                            transition
                          "
                        >
                          {sending
                            ? "Enviando..."
                            : "Enviar"}
                        </button>

                      </div>

                    </div>

                  </div>

                </>
              )}

            </section>

          </div>

        </div>

      </div>
    </main>
  );
}