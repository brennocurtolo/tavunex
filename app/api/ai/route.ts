import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_phone = "TESTE_PAINEL";

const CONVERSATION_TIMEOUT_MINUTES = 30;

export async function POST(request: Request) {
  try {
    const { message, companyId, customerPhone, customerName, } = await request.json();
    const phone = customerPhone || DEFAULT_phone;

    if (!message || !companyId) {
      return NextResponse.json(
        { error: "Mensagem ou empresa não informada." },
        { status: 400 }
      );
    }

    // =====================================================
    // 1. CONVERSA
    // =====================================================

    let { data: conversation, error: conversationError } =
      await supabase
        .from("conversations")
        .select(`
          id,
          selected_service_id,
          selected_employee_id,
          selected_appointment_id,
          selected_date,
          selected_time,
          status,
          updated_at
        `)
        .eq("company_id", companyId)
        .eq("customer_phone", phone)
        .maybeSingle();

    if (conversationError) {
      console.error(conversationError);

      return NextResponse.json(
        { error: "Erro ao buscar conversa." },
        { status: 500 }
      );
    }

    if (!conversation) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          company_id: companyId,
          customer_phone: phone,
          status: "ai",
        })
        .select(`
          id,
          selected_service_id,
          selected_employee_id,
          selected_appointment_id,
          selected_date,
          selected_time,
          status,
          updated_at
        `)
        .single();

      if (error) {
        console.error(error);

        return NextResponse.json(
          { error: "Erro ao criar conversa." },
          { status: 500 }
        );
      }

      conversation = data;
    }

    const conversationId = conversation.id;

    // =====================================================
    // VERIFICA SE A CONVERSA EXPIROU
    // =====================================================

    const now = new Date();

    let sessionResetAt: string | null = null;

    if (
      conversation.updated_at &&
      conversation.status !== "human"
    ) {
      const lastActivity = new Date(conversation.updated_at);

      const minutesInactive =
        (now.getTime() - lastActivity.getTime()) /
        1000 /
        60;

      if (minutesInactive >= CONVERSATION_TIMEOUT_MINUTES) {
        console.log(
          `Conversa expirada após ${minutesInactive.toFixed(1)} minutos.`
        );

        sessionResetAt = now.toISOString();

        await clearConversationState(conversationId);

        // Atualiza também o objeto que já está na memória
        conversation.selected_service_id = null;
        conversation.selected_employee_id = null;
        conversation.selected_appointment_id = null;
        conversation.selected_date = null;
        conversation.selected_time = null;
        conversation.status = "ai";
        conversation.updated_at = sessionResetAt;
      }
    }

    // =====================================================
    // 2. SALVA MENSAGEM
    // =====================================================

    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: message,
      });

    if (messageError) {
      console.error("Erro ao salvar mensagem:", messageError);

      return NextResponse.json(
        { error: "Erro ao salvar mensagem." },
        { status: 500 }
      );
    }

    // Marca essa mensagem como a atividade mais recente
    await supabase
      .from("conversations")
      .update({
        updated_at: now.toISOString(),
      })
      .eq("id", conversationId);

    // Se estiver com humano, salva a mensagem acima,
    // mas não deixa a IA responder.
    if (conversation.status === "human") {
      return NextResponse.json({
        response: null,
        human: true,
      });
    }

    // =====================================================
    // 3. HISTÓRICO
    // =====================================================

    let historyQuery = supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    // Se a conversa acabou de expirar,
    // não envia mensagens antigas para a IA.
    if (sessionResetAt) {
      historyQuery = historyQuery.gte(
        "created_at",
        sessionResetAt
      );
    }

    const { data: history, error: historyError } =
      await historyQuery;

    if (historyError) {
      console.error(
        "Erro ao buscar histórico:",
        historyError
      );
    }

    const conversationHistory = (history || [])
      .map(
        (item) =>
          `${item.role === "user" ? "CLIENTE" : "ATENDENTE"}: ${item.content}`
      )
      .join("\n");

    // =====================================================
    // 4. SERVIÇOS
    // =====================================================

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name, description, price, duration_minutes")
      .eq("company_id", companyId)
      .eq("active", true);

    if (servicesError) {
      return NextResponse.json(
        { error: "Erro ao consultar serviços." },
        { status: 500 }
      );
    }

    // =====================================================
    // 5. PRODUTOS
    // =====================================================

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, brand, description, price")
      .eq("company_id", companyId)
      .eq("active", true);

    if (productsError) {
      return NextResponse.json(
        { error: "Erro ao consultar produtos." },
        { status: 500 }
      );
    }

    // =====================================================
    // 6. PROFISSIONAIS
    // =====================================================

    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("id, name, role")
      .eq("company_id", companyId)
      .eq("active", true);

    if (employeesError) {
      return NextResponse.json(
        { error: "Erro ao consultar profissionais." },
        { status: 500 }
      );
    }

    // =====================================================
    // 7. CLIENTE
    // =====================================================

    const { data: customer } = await supabase
      .from("customers")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("phone", phone)
      .maybeSingle();

    const customerId = customer?.id || null;

    // =====================================================
    // 8. DATA ATUAL
    // =====================================================

    const currentDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // =====================================================
    // 9. AGENDAMENTOS DO CLIENTE
    // =====================================================

    let appointments: any[] = [];

    if (customerId) {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          service_id,
          employee_id,
          services (
            name
          ),
          employees (
            name
          )
        `)
        .eq("company_id", companyId)
        .eq("customer_id", customerId)
        .neq("status", "cancelled")
        .gte("appointment_date", currentDate)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Erro ao buscar agendamentos:", error);
      } else {
        appointments = data || [];
      }
    }

    // =====================================================
    // 10. IA INTERPRETA O PEDIDO
    // =====================================================

    const interpretationResponse = await openai.responses.create({
      model: "gpt-5.6-luna",

      instructions: `
Hoje é ${currentDate}.

Você interpreta mensagens de clientes de um salão.

SERVIÇOS:
${JSON.stringify(services)}

PRODUTOS:
${JSON.stringify(products)}

PROFISSIONAIS:
${JSON.stringify(employees)}

AGENDAMENTOS ATIVOS DO CLIENTE:
${JSON.stringify(appointments)}

HISTÓRICO:
${conversationHistory}

ESTADO ATUAL:
status = ${conversation.status}
service_id = ${conversation.selected_service_id}
employee_id = ${conversation.selected_employee_id}
appointment_id = ${conversation.selected_appointment_id}
date = ${conversation.selected_date}
time = ${conversation.selected_time}

Retorne SOMENTE JSON válido:

{
  "intent": "availability" | "question" | "product_question" | "list_appointments" | "cancel" | "reschedule" | "human",
  "service_id": string | null,
  "employee_id": string | null,
  "appointment_id": string | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "confirm": boolean,
  "needs_web_search": boolean
}

REGRAS:

- availability:
  cliente quer marcar ou consultar horários.

- list_appointments:
  cliente quer saber quais horários/agendamentos possui.

- cancel:
  cliente quer cancelar um agendamento.

- reschedule:
  cliente quer mudar data ou horário de um agendamento.

- question:
  perguntas comuns.

- product_question:
  dúvidas sobre produtos, marcas, ingredientes, indicação, benefícios,
  modo de uso ou compatibilidade com tipos de cabelo.

- needs_web_search:
  use true somente quando a pergunta for product_question e não puder ser
  respondida com os dados cadastrados do salão. Use false quando o cadastro
  já trouxer informação suficiente.

- human:
  cliente quer falar com uma pessoa, atendente, humano, dono, recepção ou alguém da equipe.

- Se o cliente pedir atendimento humano de qualquer forma,
  use intent = "human".

- Use o histórico e o estado atual da conversa.

- Se status for "waiting_cancel_confirmation" e o cliente confirmar,
  use intent = "cancel" e confirm = true.

- Se status for "waiting_reschedule_confirmation" e o cliente confirmar,
  use intent = "reschedule" e confirm = true.

- Se for possível identificar qual agendamento o cliente menciona,
  use SOMENTE um appointment_id existente na lista fornecida.

- Nunca invente appointment_id.

- Para reagendamento, "date" e "time" representam a NOVA data
  e o NOVO horário.

- Para novos agendamentos, use service_id, employee_id, date e time.

- Converta "amanhã", "segunda-feira", etc. para YYYY-MM-DD.

- Converta "14h", "duas da tarde", etc. para HH:MM.

- "sim", "pode", "confirmo", "pode fazer" etc. significam confirm = true
  apenas quando existe uma ação aguardando confirmação.
      `,

      input: message,
    });

    let interpretation: any;

    try {
      interpretation = JSON.parse(
        interpretationResponse.output_text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim()
      );
    } catch {
      console.error(
        "JSON inválido:",
        interpretationResponse.output_text
      );

      return NextResponse.json(
        { error: "Não consegui interpretar a conversa." },
        { status: 500 }
      );
    }

    const needsWebSearch =
      interpretation.intent === "product_question" &&
      interpretation.needs_web_search === true;

    const finalServiceId =
      interpretation.service_id ||
      conversation.selected_service_id;

    const finalEmployeeId =
      interpretation.employee_id ||
      conversation.selected_employee_id;

    const finalAppointmentId =
      interpretation.appointment_id ||
      conversation.selected_appointment_id;

    const finalDate =
      interpretation.date ||
      conversation.selected_date;

    const finalTime =
      interpretation.time ||
      conversation.selected_time;

    let finalResponse = "";

    // =====================================================
    // 10. MUDAR PARA ATENDIMENTO HUMANO
    // =====================================================

    if (interpretation.intent === "human") {
      await supabase
        .from("conversations")
        .update({
          status: "human",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      finalResponse =
        "Claro. Vou encaminhar seu atendimento para uma pessoa da equipe.";
    }

    // =====================================================
    // 11. LISTAR AGENDAMENTOS
    // =====================================================

    else if (interpretation.intent === "list_appointments") {
      if (appointments.length === 0) {
        finalResponse =
          "Você não possui nenhum agendamento ativo.";
      } else {
        const list = appointments.map((appointment) => {
          const serviceName =
            appointment.services?.name || "Serviço";

          const employeeName =
            appointment.employees?.name || "profissional";

          return `${serviceName} com ${employeeName} em ${
            appointment.appointment_date
          } às ${String(appointment.start_time).slice(0, 5)}`;
        });

        finalResponse =
          `Seus agendamentos são:\n\n` +
          list.map((item) => `• ${item}`).join("\n");
      }
    }

    // =====================================================
    // 12. CANCELAMENTO
    // =====================================================

    else if (interpretation.intent === "cancel") {

      // Ainda não sabemos qual agendamento cancelar
      if (!finalAppointmentId) {
        if (appointments.length === 0) {
          finalResponse =
            "Você não possui nenhum agendamento ativo.";
        }

        else if (appointments.length === 1) {
          const appointment = appointments[0];

          await supabase
            .from("conversations")
            .update({
              selected_appointment_id: appointment.id,
              status: "waiting_cancel_confirmation",
            })
            .eq("id", conversationId);

          finalResponse =
            `Você quer cancelar o agendamento de ` +
            `${appointment.services?.name || "serviço"} ` +
            `com ${appointment.employees?.name || "o profissional"} ` +
            `no dia ${appointment.appointment_date} às ` +
            `${String(appointment.start_time).slice(0, 5)}?`;
        }

        else {
          const list = appointments.map(
            (appointment, index) =>
              `${index + 1}. ${
                appointment.services?.name || "Serviço"
              } com ${
                appointment.employees?.name || "profissional"
              } em ${appointment.appointment_date} às ${
                String(appointment.start_time).slice(0, 5)
              }`
          );

          finalResponse =
            `Qual agendamento você deseja cancelar?\n\n` +
            list.join("\n");
        }
      }

      // Confirma cancelamento
      else if (interpretation.confirm === true) {
        const { error } = await supabase.rpc(
          "cancel_appointment",
          {
            p_appointment_id: finalAppointmentId,
          }
        );

        if (error) {
          console.error(error);

          finalResponse =
            "Não consegui cancelar o agendamento.";
        } else {
          finalResponse =
            "Agendamento cancelado com sucesso.";

          await clearConversationState(conversationId);
        }
      }

      // Pergunta antes de cancelar
      else {
        const appointment = appointments.find(
          (item) => item.id === finalAppointmentId
        );

        if (!appointment) {
          finalResponse =
            "Não encontrei esse agendamento.";
        } else {
          await supabase
            .from("conversations")
            .update({
              selected_appointment_id: appointment.id,
              status: "waiting_cancel_confirmation",
            })
            .eq("id", conversationId);

          finalResponse =
            `Deseja confirmar o cancelamento de ` +
            `${appointment.services?.name || "serviço"} ` +
            `com ${appointment.employees?.name || "o profissional"} ` +
            `no dia ${appointment.appointment_date} às ` +
            `${String(appointment.start_time).slice(0, 5)}?`;
        }
      }
    }

    // =====================================================
    // 13. REAGENDAMENTO
    // =====================================================

    else if (interpretation.intent === "reschedule") {

      if (!finalAppointmentId) {
        if (appointments.length === 0) {
          finalResponse =
            "Você não possui nenhum agendamento ativo.";
        }

        else if (appointments.length === 1) {
          const appointment = appointments[0];

          await supabase
            .from("conversations")
            .update({
              selected_appointment_id: appointment.id,
            })
            .eq("id", conversationId);

          finalResponse =
            "Para qual dia e horário você gostaria de mudar?";
        }

        else {
          const list = appointments.map(
            (appointment, index) =>
              `${index + 1}. ${
                appointment.services?.name || "Serviço"
              } com ${
                appointment.employees?.name || "profissional"
              } em ${appointment.appointment_date} às ${
                String(appointment.start_time).slice(0, 5)
              }`
          );

          finalResponse =
            `Qual agendamento você deseja alterar?\n\n` +
            list.join("\n");
        }
      }

      else {
        const appointment = appointments.find(
          (item) => item.id === finalAppointmentId
        );

        if (!appointment) {
          finalResponse =
            "Não encontrei esse agendamento.";
        }

        else if (!finalDate) {
          finalResponse =
            "Para qual dia você gostaria de mudar?";
        }

        else if (!finalTime) {
          const { data: slots } = await supabase.rpc(
            "get_available_slots",
            {
              p_company_id: companyId,
              p_employee_id: appointment.employee_id,
              p_service_id: appointment.service_id,
              p_date: finalDate,
              p_slot_minutes: 30,
            }
          );

          const formattedSlots = (slots || []).map(
            (slot: any) =>
              String(slot.available_start_time).slice(0, 5)
          );

          if (formattedSlots.length === 0) {
            finalResponse =
              "Não encontrei horários disponíveis nesse dia.";
          } else {
            finalResponse =
              `Tenho estes horários disponíveis: ` +
              `${formattedSlots.join(", ")}. Qual você prefere?`;
          }

          await supabase
            .from("conversations")
            .update({
              selected_appointment_id: finalAppointmentId,
              selected_date: finalDate,
            })
            .eq("id", conversationId);
        }

        else {
          const normalizedTime =
            String(finalTime).slice(0, 5);

          const { data: slots } = await supabase.rpc(
            "get_available_slots",
            {
              p_company_id: companyId,
              p_employee_id: appointment.employee_id,
              p_service_id: appointment.service_id,
              p_date: finalDate,
              p_slot_minutes: 30,
            }
          );

          const available = (slots || []).some(
            (slot: any) =>
              String(
                slot.available_start_time
              ).slice(0, 5) === normalizedTime
          );

          if (!available) {
            finalResponse =
              "Esse horário não está disponível.";
          }

          else if (interpretation.confirm === true) {
            const { error } = await supabase.rpc(
              "reschedule_appointment",
              {
                p_appointment_id: finalAppointmentId,
                p_new_date: finalDate,
                p_new_start_time: normalizedTime,
              }
            );

            if (error) {
              console.error(error);

              finalResponse =
                "Não consegui realizar o reagendamento.";
            } else {
              finalResponse =
                `Agendamento alterado com sucesso para ` +
                `${finalDate} às ${normalizedTime}.`;

              await clearConversationState(
                conversationId
              );
            }
          }

          else {
            await supabase
              .from("conversations")
              .update({
                selected_appointment_id:
                  finalAppointmentId,

                selected_date: finalDate,

                selected_time: normalizedTime,

                status:
                  "waiting_reschedule_confirmation",
              })
              .eq("id", conversationId);

            finalResponse =
              `Posso confirmar a alteração para ` +
              `${finalDate} às ${normalizedTime}?`;
          }
        }
      }
    }

    // =====================================================
    // 14. NOVO AGENDAMENTO
    // =====================================================

    else if (interpretation.intent === "availability") {

      if (!finalServiceId) {
        finalResponse =
          "Qual serviço você gostaria de agendar?";
      }

      else if (!finalEmployeeId) {
        finalResponse =
          "Com qual profissional você gostaria de agendar?";
      }

      else if (!finalDate) {
        finalResponse =
          "Para qual dia você gostaria de agendar?";
      }

      else {
        const { data: slots, error } = await supabase.rpc(
          "get_available_slots",
          {
            p_company_id: companyId,
            p_employee_id: finalEmployeeId,
            p_service_id: finalServiceId,
            p_date: finalDate,
            p_slot_minutes: 30,
          }
        );

        if (error) {
          console.error(error);

          finalResponse =
            "Não consegui consultar os horários.";
        }

        else if (!slots || slots.length === 0) {
          finalResponse =
            "Não encontrei horários disponíveis nesse dia.";
        }

        else if (!finalTime) {
          const times = slots.map((slot: any) =>
            String(slot.available_start_time).slice(0, 5)
          );

          finalResponse =
            `Tenho estes horários disponíveis: ` +
            `${times.join(", ")}. Qual você prefere?`;

          await supabase
            .from("conversations")
            .update({
              selected_service_id: finalServiceId,
              selected_employee_id: finalEmployeeId,
              selected_date: finalDate,
            })
            .eq("id", conversationId);
        }

        else {
          const normalizedTime =
            String(finalTime).slice(0, 5);

          const available = slots.some(
            (slot: any) =>
              String(
                slot.available_start_time
              ).slice(0, 5) === normalizedTime
          );

          if (!available) {
            finalResponse =
              "Esse horário não está disponível.";
          }

          else if (interpretation.confirm === true) {
            let finalCustomerId = customerId;

            if (!finalCustomerId) {
              const { data: newCustomer, error } =
                await supabase
                  .from("customers")
                  .insert({
                    company_id: companyId,
                    name: customerName || "Cliente",
                    phone: phone,
                  })
                  .select("id")
                  .single();

              if (error) {
                return NextResponse.json(
                  { error: "Erro ao criar cliente." },
                  { status: 500 }
                );
              }

              finalCustomerId = newCustomer.id;
            }

            const { error } = await supabase.rpc(
              "create_appointment",
              {
                p_company_id: companyId,
                p_customer_id: finalCustomerId,
                p_service_id: finalServiceId,
                p_employee_id: finalEmployeeId,
                p_date: finalDate,
                p_start_time: normalizedTime,
              }
            );

            if (error) {
              console.error(error);

              finalResponse =
                "Não consegui criar o agendamento.";
            } else {
              finalResponse =
                `Agendamento confirmado para ` +
                `${finalDate} às ${normalizedTime}.`;

              await clearConversationState(
                conversationId
              );
            }
          }

          else {
            await supabase
              .from("conversations")
              .update({
                selected_service_id:
                  finalServiceId,

                selected_employee_id:
                  finalEmployeeId,

                selected_date:
                  finalDate,

                selected_time:
                  normalizedTime,

                status:
                  "waiting_booking_confirmation",
              })
              .eq("id", conversationId);

            finalResponse =
              `Posso confirmar o agendamento para ` +
              `${finalDate} às ${normalizedTime}?`;
          }
        }
      }
    }

    // =====================================================
    // 15. PERGUNTA NORMAL
    // =====================================================

    else {
      const response =
        await openai.responses.create({
          model: "gpt-5.6-luna",

          ...(needsWebSearch
            ? {
                tools: [
                  {
                    type: "web_search" as const,
                    search_context_size: "low" as const,
                    user_location: {
                      type: "approximate" as const,
                      country: "BR",
                      timezone: "America/Sao_Paulo",
                    },
                  },
                ],
              }
            : {}),

          instructions: `
Você é atendente virtual de um salão.

SERVIÇOS:
${JSON.stringify(services)}

PRODUTOS:
${JSON.stringify(products)}

PROFISSIONAIS:
${JSON.stringify(employees)}

HISTÓRICO:
${conversationHistory}

Responda de forma curta, natural e educada.

Nunca invente informações.
Use os produtos cadastrados pelo salão como fonte principal para identificar o produto exato.
Quando a pergunta for sobre produto, marca, ingrediente, indicação, benefícios, modo de uso ou compatibilidade, pesquise na internet para complementar a resposta usando fontes confiáveis e atuais.
Não trate informações gerais encontradas na internet como confirmação de que o produto exato do salão possui aquela característica. Se houver conflito, priorize o cadastro do salão e diga que a informação precisa ser confirmada.
Não faça diagnóstico nem prometa resultado. Para dúvidas de saúde, alergia ou reação, recomende orientação de um profissional.
Quando usar a pesquisa, cite brevemente a fonte ou inclua o link mais relevante.
Não afirme que há estoque ou disponibilidade para compra. Se o preço estiver nulo, diga que o valor deve ser confirmado pelo salão.
          `,

          input: message,
        });

      finalResponse =
        response.output_text;
    }

    // =====================================================
    // 16. SALVA RESPOSTA
    // =====================================================

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalResponse,
    });

    return NextResponse.json({
      response: finalResponse,
    });

  } catch (error) {
    console.error("Erro geral:", error);

    return NextResponse.json(
      { error: "Erro ao processar mensagem." },
      { status: 500 }
    );
  }
}

// =========================================================
// LIMPA ESTADO DA CONVERSA
// =========================================================

async function clearConversationState(
  conversationId: string
) {
  await supabase
    .from("conversations")
    .update({
      selected_service_id: null,
      selected_employee_id: null,
      selected_appointment_id: null,
      selected_date: null,
      selected_time: null,
      status: "ai",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}