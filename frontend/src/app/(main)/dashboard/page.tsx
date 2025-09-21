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

  const kpiCard = (title: string, value: string | number, sub?: string) => (
    <div className="card p-3">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-xl font-semibold leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );

  if (isLoading || !data) return <div>Cargando...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Dashboard de Incidencias</h1>

      <div className="grid gap-3 md:grid-cols-4">
        {kpiCard("Tickets abiertos", data.kpis.open)}
        {kpiCard("En progreso", data.kpis.in_progress)}
        {kpiCard("Resueltos", data.kpis.closed)}
        {kpiCard(
          "Cumplimiento SLA",
          `${Math.round(data.kpis.sla * 100)}%`,
          "Objetivo 90%"
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-3">
          <div className="text-sm font-medium text-slate-700 mb-1">
            Incidencias por Estado
          </div>
          <div className="h-56">
            <Bar
              data={{
                labels: Object.keys(data.by_status),
                datasets: [
                  {
                    label: "Tickets",
                    data: Object.values(data.by_status),
                    backgroundColor: "#2a86ff",
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
                    grid: { color: "rgba(148,163,184,0.2)" }
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="card p-3">
          <div className="text-sm font-medium text-slate-700 mb-1">
            Incidencias por Prioridad
          </div>
          <div className="h-56">
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
                cutout: "60%"
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="card p-3">
          <div className="text-sm font-medium text-slate-700 mb-1">
            Tiempo Promedio de Resolución
          </div>
          <div className="h-56">
            <Line
              data={{
                labels: data.resolution_trend.map((d) => d.label),
                datasets: [
                  {
                    label: "Horas",
                    data: data.resolution_trend.map((d) => d.avg_hours),
                    borderColor: "#2a86ff",
                    backgroundColor: "rgba(42,134,255,0.2)",
                    pointRadius: 2,
                    tension: 0.3,
                    fill: true
                  }
                ]
              }}
              options={{
                ...baseChartOptions,
                plugins: { legend: { display: false } },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: { font: { size: 11 } },
                    grid: { color: "rgba(148,163,184,0.2)" }
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="card p-3">
          <div className="text-sm font-medium text-slate-700 mb-1">
            Top Técnicos
          </div>
          <div className="h-56">
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
                    grid: { color: "rgba(148,163,184,0.2)" }
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