"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

type Overview = {
  kpis: { total: number; open: number; in_progress: number; closed: number; sla: number };
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  resolution_trend: { label: string; avg_hours: number }[];
  tech_performance: Record<string, number>;
};

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false as const,
  plugins: {
    legend: { display: false }
  },
  layout: { padding: 0 }
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const { data } = await api.get<Overview>("/dashboard/overview");
      return data;
    }
  });

  const kpiCard = (
    title: string,
    value: string | number,
    sub?: string,
    colorClass?: string
  ) => (
    <div className="card p-4">
      <div className="text-sm text-slate-600">{title}</div>
      <div className={`text-2xl font-semibold leading-tight ${colorClass ?? ""}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );

  if (isLoading || !data) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard de Incidencias</h1>

      <div className="grid gap-4 md:grid-cols-4">
        {kpiCard("Tickets abiertos", data.kpis.open, "0 nuevas", "text-blue-600")}
        {kpiCard("En progreso", data.kpis.in_progress, "En proceso de resolución", "text-amber-600")}
        {kpiCard("Resueltos", data.kpis.closed, "Completados", "text-green-600")}
        {kpiCard(
          "Cumplimiento SLA",
          `${Math.round(data.kpis.sla * 100)}%`,
          "Objetivo 90%",
          "text-purple-600"
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="text-base font-semibold text-slate-800">
            Incidencias por Estado
          </div>
          <div className="text-xs text-slate-500 mb-2">
            Distribución de incidencias según su estado actual
          </div>
          <div className="h-60">
            <Bar
              data={{
                labels: Object.keys(data.by_status),
                datasets: [
                  {
                    label: "Tickets",
                    data: Object.values(data.by_status),
                    backgroundColor: "#10b981",
                    borderRadius: 6
                  }
                ]
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 10, font: { size: 11 } },
                    grid: { color: "rgba(148,163,184,0.25)" }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="card p-4">
          <div className="text-base font-semibold text-slate-800">
            Incidencias por Prioridad
          </div>
          <div className="text-xs text-slate-500 mb-2">
            Distribución por nivel de prioridad asignado
          </div>
          <div className="h-60">
            <Doughnut
              data={{
                labels: Object.keys(data.by_priority),
                datasets: [
                  {
                    data: Object.values(data.by_priority),
                    backgroundColor: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"]
                  }
                ]
              }}
              options={{
                ...baseChartOptions,
                plugins: {
                  legend: {
                    display: true,
                    position: "bottom" as const,
                    labels: { boxWidth: 10, font: { size: 11 } }
                  }
                },
                cutout: "62%"
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-4">
          <div className="text-base font-semibold text-slate-800">
            Tiempo Promedio de Resolución
          </div>
          <div className="text-xs text-slate-500 mb-2">
            Horas promedio para resolver incidencias (últimas 4 semanas)
          </div>
          <div className="h-60">
            <Line
              data={{
                labels: data.resolution_trend.map((d) => d.label),
                datasets: [
                  {
                    label: "Horas",
                    data: data.resolution_trend.map((d) => d.avg_hours),
                    borderColor: "#2a86ff",
                    backgroundColor: "rgba(42,134,255,0.18)",
                    pointRadius: 2,
                    tension: 0.35,
                    fill: true
                  }
                ]
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { font: { size: 11 } },
                    grid: { color: "rgba(148,163,184,0.25)" }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="card p-4">
          <div className="text-base font-semibold text-slate-800">
            Top Técnicos
          </div>
          <div className="text-xs text-slate-500 mb-2">
            Rendimiento por técnico este mes
          </div>
          <div className="h-60">
            <Bar
              data={{
                labels: Object.keys(data.tech_performance),
                datasets: [
                  {
                    label: "Cerrados",
                    data: Object.values(data.tech_performance),
                    backgroundColor: "#22c55e",
                    borderRadius: 6
                  }
                ]
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 5, font: { size: 11 } },
                    grid: { color: "rgba(148,163,184,0.25)" }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}