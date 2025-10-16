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
  plugins: { legend: { display: false } },
  layout: { padding: 0 }
};

function pct(part: number, total: number) {
  if (!total) return "0% del total";
  return `${Math.round((part / total) * 100)}% del total`;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const { data } = await api.get<Overview>("/dashboard/overview/");
      return data;
    }
  });

  if (isLoading || !data) return <div>Cargando...</div>;

  const { kpis } = data;
  const total = kpis.total || kpis.open + kpis.in_progress + kpis.closed;

  // Incidencias por Estado (orden y etiquetas en español)
  const estadosOrden = ["new", "in_progress", "closed", "canceled"];
  const etiquetasEstado: Record<string, string> = {
    new: "Nuevas",
    in_progress: "En Progreso",
    closed: "Resueltas",
    canceled: "Canceladas"
  };
  const valoresEstado = estadosOrden.map((k) => data.by_status[k] || 0);
  const labelsEstado = estadosOrden.map((k) => etiquetasEstado[k]);

  // Prioridad: agregamos urgente+alta como Alta; normal como Media; baja como Baja
  const alta = (data.by_priority["urgent"] || 0) + (data.by_priority["high"] || 0);
  const media = data.by_priority["normal"] || 0;
  const baja = data.by_priority["low"] || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard de Incidencias</h1>
        <select className="input w-[160px]">
          <option>Este mes</option>
          <option>Últimos 3 meses</option>
          <option>Último año</option>
        </select>
      </div>

      {/* KPIs superiores */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Tickets abiertos</div>
          <div className="text-2xl font-semibold text-blue-600">{kpis.open}</div>
          <div className="text-xs text-slate-500 mt-1">
            {kpis.open} nuevas · {pct(kpis.open, total)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">En progreso</div>
          <div className="text-2xl font-semibold text-amber-600">{kpis.in_progress}</div>
          <div className="text-xs text-slate-500 mt-1">En proceso de resolución · {pct(kpis.in_progress, total)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Resueltos</div>
          <div className="text-2xl font-semibold text-green-600">{kpis.closed}</div>
          <div className="text-xs text-slate-500 mt-1">Completados · {pct(kpis.closed, total)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Cumplimiento SLA</div>
          <div className="text-2xl font-semibold text-purple-600">{Math.round(kpis.sla * 100)}%</div>
          <div className="text-xs text-slate-500 mt-1">Tiempo de respuesta · Meta: 90%</div>
        </div>
      </div>

      {/* Estado / Prioridad */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-base font-semibold text-slate-800">Incidencias por Estado</div>
          <div className="text-xs text-slate-500 mb-2">Distribución de incidencias según su estado actual</div>
          <div className="h-56">
            <Bar
              data={{
                labels: labelsEstado,
                datasets: [
                  {
                    label: "Tickets",
                    data: valoresEstado,
                    backgroundColor: "#22c55e",
                    borderRadius: 6
                  }
                ]
              }}
              options={{
                ...baseChartOptions,
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 11 } } },
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
          <div className="text-base font-semibold text-slate-800">Incidencias por Prioridad</div>
          <div className="text-xs text-slate-500 mb-2">Distribución por nivel de prioridad asignado</div>
          <div className="h-56">
            <Doughnut
              data={{
                labels: ["Alta", "Media", "Baja"],
                datasets: [
                  {
                    data: [alta, media, baja],
                    backgroundColor: ["#ef4444", "#f59e0b", "#3b82f6"]
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

      {/* Resolución / Técnicos */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-base font-semibold text-slate-800">Tiempo Promedio de Resolución</div>
          <div className="text-xs text-slate-500 mb-2">Horas promedio para resolver incidencias (últimas 4 semanas)</div>
          <div className="h-56">
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
                  x: { grid: { display: false }, ticks: { font: { size: 11 } } },
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
          <div className="text-base font-semibold text-slate-800">Rendimiento de Técnicos</div>
          <div className="text-xs text-slate-500 mb-2">Resolución de incidencias por técnico</div>
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
                  x: { grid: { display: false }, ticks: { font: { size: 11 } } },
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