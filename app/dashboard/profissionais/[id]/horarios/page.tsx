"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const days = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

type EmployeeHour = {
  id?: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
};

export default function HorariosProfissional() {
  const params = useParams();
  const employeeId = params.id as string;

  const [employeeName, setEmployeeName] = useState("");
  const [hours, setHours] = useState<EmployeeHour[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: employee, error: employeeError } =
      await supabase
        .from("employees")
        .select("name")
        .eq("id", employeeId)
        .single();

    if (employeeError) {
      console.error(employeeError);
      return;
    }

    setEmployeeName(employee.name);

    const { data, error } = await supabase
      .from("employee_hours")
      .select("*")
      .eq("employee_id", employeeId)
      .order("day_of_week");

    if (error) {
      console.error(error);
      return;
    }

    if (data && data.length > 0) {
      setHours(data);
      return;
    }

    const defaultHours = days.map((_, index) => ({
      day_of_week: index,
      is_working: index !== 0,
      start_time: "08:00",
      end_time: "18:00",
    }));

    setHours(defaultHours);
  }

  function updateHour(
    index: number,
    field: keyof EmployeeHour,
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
    const { error } = await supabase
      .from("employee_hours")
      .upsert(
        hours.map((hour) => ({
          employee_id: employeeId,
          day_of_week: hour.day_of_week,
          is_working: hour.is_working,
          start_time: hour.is_working
            ? hour.start_time
            : null,
          end_time: hour.is_working
            ? hour.end_time
            : null,
        })),
        {
          onConflict: "employee_id,day_of_week",
        }
      );

    if (error) {
      console.error(error);
      alert("Erro ao salvar horários.");
      return;
    }

    alert("Horários salvos!");
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-3xl font-bold mb-2">
          Horários de {employeeName}
        </h1>

        <p className="text-gray-500 mb-8">
          Configure os dias e horários de trabalho.
        </p>

        <div className="space-y-4">

          {hours.map((hour, index) => (
            <div
              key={hour.day_of_week}
              className="border rounded-xl p-5"
            >
              <div className="flex justify-between items-center mb-4">

                <h2 className="font-semibold">
                  {days[hour.day_of_week]}
                </h2>

                <label className="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={hour.is_working}
                    onChange={(e) =>
                      updateHour(
                        index,
                        "is_working",
                        e.target.checked
                      )
                    }
                  />

                  Trabalha
                </label>

              </div>

              {hour.is_working && (
                <div className="flex gap-4">

                  <div className="flex-1">
                    <label className="block text-sm mb-1">
                      Entrada
                    </label>

                    <input
                      type="time"
                      value={hour.start_time}
                      onChange={(e) =>
                        updateHour(
                          index,
                          "start_time",
                          e.target.value
                        )
                      }
                      className="w-full border rounded-lg p-3"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm mb-1">
                      Saída
                    </label>

                    <input
                      type="time"
                      value={hour.end_time}
                      onChange={(e) =>
                        updateHour(
                          index,
                          "end_time",
                          e.target.value
                        )
                      }
                      className="w-full border rounded-lg p-3"
                    />
                  </div>

                </div>
              )}
            </div>
          ))}

        </div>

        <button
          onClick={saveHours}
          className="mt-6 bg-black text-white rounded-lg px-6 py-3"
        >
          Salvar horários
        </button>

      </div>
    </main>
  );
}