"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

type Employee = {
  id: string;
  name: string;
};

type Slot = {
  available_start_time: string;
  available_end_time: string;
};

export default function AgendaPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");

  const [selectedSlot, setSelectedSlot] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: companyUser, error: companyError } =
      await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

    if (companyError) {
      console.error(companyError);
      return;
    }

    const id = companyUser.company_id;

    setCompanyId(id);

    const { data: servicesData } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("company_id", id)
      .eq("active", true)
      .order("name");

    const { data: employeesData } = await supabase
      .from("employees")
      .select("id, name")
      .eq("company_id", id)
      .eq("active", true)
      .order("name");

    setServices(servicesData || []);
    setEmployees(employeesData || []);
  }

  async function loadSlots() {
    setMessage("");
    setSuccess(false);
    setSelectedSlot("");

    if (!companyId || !serviceId || !employeeId || !date) {
      setMessage("Selecione serviço, profissional e data.");
      return;
    }

    setLoadingSlots(true);

    const { data, error } = await supabase.rpc(
      "get_available_slots",
      {
        p_company_id: companyId,
        p_employee_id: employeeId,
        p_service_id: serviceId,
        p_date: date,
        p_slot_minutes: 30,
      }
    );

    setLoadingSlots(false);

    if (error) {
      console.error(error);
      setMessage("Erro ao buscar horários.");
      return;
    }

    setSlots(data || []);

    if (!data || data.length === 0) {
      setMessage("Nenhum horário disponível para essa data.");
    }
  }

  async function createAppointment() {
    setMessage("");
    setSuccess(false);

    if (
      !companyId ||
      !serviceId ||
      !employeeId ||
      !date ||
      !selectedSlot ||
      !customerName.trim() ||
      !customerPhone.trim()
    ) {
      setMessage("Preencha todos os campos.");
      return;
    }

    setCreatingAppointment(true);

    let { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("company_id", companyId)
      .eq("phone", customerPhone.trim())
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          company_id: companyId,
          name: customerName.trim(),
          phone: customerPhone.trim(),
        })
        .select("id")
        .single();

      if (error) {
        console.error(error);
        setCreatingAppointment(false);
        setMessage("Erro ao criar cliente.");
        return;
      }

      customer = newCustomer;
    }

    const { error } = await supabase.rpc(
      "create_appointment",
      {
        p_company_id: companyId,
        p_customer_id: customer.id,
        p_service_id: serviceId,
        p_employee_id: employeeId,
        p_date: date,
        p_start_time: selectedSlot,
      }
    );

    setCreatingAppointment(false);

    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    setSuccess(true);
    setMessage("Agendamento criado com sucesso.");

    setSelectedSlot("");
    setCustomerName("");
    setCustomerPhone("");

    await loadSlots();
  }

  return (
    <main className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">

        {/* CABEÇALHO */}
        <div className="mb-8">

          <p className="text-sm text-slate-500 mb-1">
            Agenda
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Novo agendamento
          </h1>

          <p className="text-slate-500 mt-2">
            Escolha o serviço, profissional e data para encontrar horários disponíveis.
          </p>

        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-7">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* SERVIÇO */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Serviço
              </label>

              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setSelectedSlot("");
                  setSlots([]);
                }}
                className="
                  w-full
                  h-12
                  border
                  border-slate-300
                  rounded-xl
                  px-4
                  bg-white
                  text-slate-900
                  outline-none
                  transition
                  focus:border-slate-500
                  focus:ring-4
                  focus:ring-slate-100
                "
              >
                <option value="">
                  Selecione um serviço
                </option>

                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — R$ {Number(service.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* PROFISSIONAL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Profissional
              </label>

              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  setSelectedSlot("");
                  setSlots([]);
                }}
                className="
                  w-full
                  h-12
                  border
                  border-slate-300
                  rounded-xl
                  px-4
                  bg-white
                  text-slate-900
                  outline-none
                  transition
                  focus:border-slate-500
                  focus:ring-4
                  focus:ring-slate-100
                "
              >
                <option value="">
                  Selecione um profissional
                </option>

                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            {/* DATA */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSelectedSlot("");
                  setSlots([]);
                }}
                className="
                  w-full
                  h-12
                  border
                  border-slate-300
                  rounded-xl
                  px-4
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

            {/* BOTÃO */}
            <div className="flex items-end">

              <button
                onClick={loadSlots}
                disabled={loadingSlots}
                className="
                  w-full
                  h-12
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
                {loadingSlots
                  ? "Buscando horários..."
                  : "Ver horários disponíveis"}
              </button>

            </div>

          </div>

          {/* MENSAGEM */}
          {message && (
            <div
              className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                success
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-amber-50 border-amber-100 text-amber-700"
              }`}
            >
              {message}
            </div>
          )}

        </div>

        {/* HORÁRIOS */}
        {slots.length > 0 && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-7">

            <div className="mb-5">

              <h2 className="text-lg font-semibold text-slate-950">
                Horários disponíveis
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Selecione um horário para continuar.
              </p>

            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">

              {slots.map((slot) => {
                const selected =
                  selectedSlot === slot.available_start_time;

                return (
                  <button
                    key={slot.available_start_time}
                    onClick={() =>
                      setSelectedSlot(slot.available_start_time)
                    }
                    className={`
                      h-11
                      rounded-xl
                      border
                      text-sm
                      font-medium
                      transition
                      ${
                        selected
                          ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                          : "bg-white border-slate-300 text-slate-700 hover:border-slate-500 hover:bg-slate-50"
                      }
                    `}
                  >
                    {slot.available_start_time.slice(0, 5)}
                  </button>
                );
              })}

            </div>

          </div>
        )}

        {/* DADOS DO CLIENTE */}
        {selectedSlot && (
          <div className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-7">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">

              <div>

                <h2 className="text-lg font-semibold text-slate-950">
                  Dados do cliente
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Horário selecionado:{" "}
                  <span className="font-medium text-slate-800">
                    {selectedSlot.slice(0, 5)}
                  </span>
                </p>

              </div>

              <div className="inline-flex self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Última etapa
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>

                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nome do cliente
                </label>

                <input
                  type="text"
                  placeholder="Digite o nome"
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(e.target.value)
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

              <div>

                <label className="block text-sm font-medium text-slate-700 mb-2">
                  WhatsApp
                </label>

                <input
                  type="text"
                  placeholder="Ex: 5534999999999"
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(e.target.value)
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

            </div>

            <div className="mt-6">

              <button
                onClick={createAppointment}
                disabled={creatingAppointment}
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
                {creatingAppointment
                  ? "Confirmando..."
                  : "Confirmar agendamento"}
              </button>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}