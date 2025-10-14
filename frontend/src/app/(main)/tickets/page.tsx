"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Ticket = {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  assignee_id: number | null;
  requester_id: number;
  company_id: number;
};

type User = {
  id: number;
  full_name?: string | null;
  email: string;
  role: string;
};

type Company = {
  id: number;
  name: string;
};

type Comment = {
  id: number;
  user_id: number;
  body: string;
  is_public: boolean;
  created_at: string;
};

type Worklog = {
  id: number;
  user_id: number;
  started_at: string;
  ended_at?: string | null;
};

const statusOptions = [
  { value: "", label: "Todos" },
  { value: "open", label: "Abiertos" },
  { value: "in_progress", label: "En Progreso" },
  { value: "paused", label: "Pausados" },
  { value: "closed", label: "Resueltos" }
];

const priorityOptions = [
  { value: "", label: "Todas" },
  { value: "low", label: "Baja" },
  { value: "normal", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" }
];

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Filtros
  const [companyFilter, setCompanyFilter] = useState<string | "">("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  // Sincroniza companyFilter con localStorage (X-Company-Id)
  useEffect(() => {
    const current = typeof window !== "undefined" ? localStorage.getItem("sf_company_id") : null;
    if (current && !companyFilter) setCompanyFilter(current);
  }, []); // init

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (companyFilter) {
        localStorage.setItem("sf_company_id", String(companyFilter));
      } else {
        localStorage.removeItem("sf_company_id");
      }
      // Refresca datos al cambiar empresa
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  }, [companyFilter, queryClient]);

  // Usuarios (para asignación)
  const users = useQuery({
    queryKey: ["users", companyFilter],
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/me/");
      // Si hay errores de auth, lanzará y react-query lo manejará
      const list = await api.get<User[]>("/users/");
      return list.data;
    }
  });

  // Empresas
  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await api.get<Company[]>("/companies/");
      return data;
    }
  });

  // Tickets con filtros (se pasan como query params)
  const tickets = useQuery({
    queryKey: ["tickets", companyFilter, statusFilter, priorityFilter, search],
    queryFn: async () => {
      const { data } = await api.get<Ticket[]>("/tickets/", {
        params: {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          q: search || undefined
        }
      });
      return data;
    }
  });

  // Usuario actual (para worklogs propios en modal)
  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/me/");
      return data;
    }
  });

  // Crear ticket rápido
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    await api.post("/tickets/", { title, description: desc });
    setTitle("");
    setDesc("");
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  // Asignación inline en la lista
  const assign = async (ticketId: number, assigneeId: number | "") => {
    if (assigneeId === "") return;
    await api.patch(`/tickets/${ticketId}/`, { assignee_id: assigneeId });
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
  };

  // Modal de detalle
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedTicket = useQuery({
    queryKey: ["ticket", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await api.get<Ticket>(`/tickets/${selectedId}/`);
      return data;
    }
  });

  // Comentarios del ticket seleccionado
  const comments = useQuery({
    queryKey: ["comments", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await api.get<Comment[]>(`/tickets/${selectedId}/comments/`);
      return data;
    }
  });

  // Worklogs propios del ticket seleccionado
  const worklogs = useQuery({
    queryKey: ["worklogs", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await api.get<Worklog[]>(`/tickets/${selectedId}/worklogs/`);
      return data;
    }
  });

  const closeModal = () => setSelectedId(null);

  const desasignar = async (id: number) => {
    await api.patch(`/tickets/${id}/`, { assignee_id: null });
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    await queryClient.invalidateQueries({ queryKey: ["ticket", id] });
  };

  const requesterOf = (reqId: number) => users.data?.find((u: any) => u.id === reqId);
  const companyOf = (cid: number) => companies.data?.find((c) => c.id === cid);

  // Helpers UI
  const Badge = ({
    children,
    color = "slate"
  }: {
    children: any;
    color?: "slate" | "green" | "yellow" | "red" | "blue" | "purple";
  }) => {
    const map: Record<string, string> = {
      slate: "bg-slate-100 text-slate-700",
      green: "bg-green-100 text-green-700",
      yellow: "bg-yellow-100 text-yellow-800",
      red: "bg-red-100 text-red-700",
      blue: "bg-blue-100 text-blue-700",
      purple: "bg-purple-100 text-purple-700"
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
        {children}
      </span>
    );
  };

  const statusBadgeColor = (s: string): "blue" | "yellow" | "green" | "red" | "slate" | "purple" => {
    if (s === "open") return "blue";
    if (s === "in_progress") return "yellow";
    if (s === "closed") return "green";
    if (s === "paused") return "purple";
    return "slate";
  };

  const excerpt = (text?: string | null, len = 80) => {
    if (!text) return "";
    const t = text.replace(/\s+/g, " ").trim();
    return t.length > len ? `${t.slice(0, len)}…` : t;
  };

  // Cálculo de tiempo total (worklogs terminados + activo en tiempo real)
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    if (!selectedId) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [selectedId]);

  const minutesWorked = useMemo(() => {
    if (!worklogs.data) return 0;
    let totalMs = 0;
    for (const wl of worklogs.data) {
      const start = new Date(wl.started_at).getTime();
      const end = wl.ended_at ? new Date(wl.ended_at).getTime() : nowTick;
      totalMs += Math.max(0, end - start);
    }
    return Math.floor(totalMs / 60000);
  }, [worklogs.data, nowTick]);

  const hhmm = (m: number) => {
    const hh = Math.floor(m / 60).toString().padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const hasActiveWork = useMemo(() => {
    return (worklogs.data || []).some((w) => !w.ended_at);
  }, [worklogs.data]);

  const startWork = async () => {
    if (!selectedId) return;
    try {
      await api.post(`/tickets/${selectedId}/worklogs/start/`);
      await queryClient.invalidateQueries({ queryKey: ["worklogs", selectedId] });
    } catch {}
  };

  const stopWork = async () => {
    if (!selectedId) return;
    try {
      await api.post(`/tickets/${selectedId}/worklogs/stop/`);
      await queryClient.invalidateQueries({ queryKey: ["worklogs", selectedId] });
    } catch {}
  };

  // Comentarios: envío
  const [commentBody, setCommentBody] = useState("");
  const [commentPublic, setCommentPublic] = useState(true);
  const submitComment = async () => {
    if (!selectedId || !commentBody.trim()) return;
    await api.post(`/tickets/${selectedId}/comments/`, {
      body: commentBody.trim(),
      is_public: commentPublic
    });
    setCommentBody("");
    await queryClient.invalidateQueries({ queryKey: ["comments", selectedId] });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y acción */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Gestión de Tickets</h1>
          <div className="text-sm text-slate-600">Administra y filtra tus incidencias</div>
        </div>
        <button className="btn" onClick={() => router.push("/tickets/create")}>
          <Plus size={16} />
          Nuevo Ticket
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-slate-600">Empresa</label>
            <select
              className="input mt-1"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">Todas las empresas</option>
              {companies.data?.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Estado</label>
            <select
              className="input mt-1"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Prioridad</label>
            <select
              className="input mt-1"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              {priorityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Buscar</label>
            <input
              className="input mt-1"
              placeholder="Título o descripción"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Crear rápido */}
      <div className="card p-4">
        <form onSubmit={createTicket} className="grid md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="Título del ticket"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            placeholder="Descripción (opcional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button className="btn">
            <Plus size={16} />
            Crear
          </button>
        </form>
      </div>

      {/* Tabla de tickets */}
      <div className="card overflow-x-auto">
        {tickets.isLoading ? (
          <div className="p-4">Cargando...</div>
        ) : (tickets.data?.length || 0) === 0 ? (
          <div className="p-4">Sin tickets</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Título</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Prioridad</th>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Asignado</th>
                <th className="text-left px-4 py-3 font-medium">Creado</th>
                <th className="text-left px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.data?.map((t) => {
                const company = companyOf(t.company_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{t.title}</div>
                      {t.description && (
                        <div className="text-slate-600 text-xs">{excerpt(t.description)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusBadgeColor(t.status)}>
                        {t.status === "open"
                          ? "Abierto"
                          : t.status === "in_progress"
                          ? "En Progreso"
                          : t.status === "paused"
                          ? "Pausado"
                          : "Resuelto"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={
                          t.priority === "urgent"
                            ? "red"
                            : t.priority === "high"
                            ? "yellow"
                            : t.priority === "low"
                            ? "slate"
                            : "blue"
                        }
                      >
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{company?.name ?? t.company_id}</td>
                    <td className="px-4 py-3">
                      <select
                        className="input text-sm"
                        value={t.assignee_id ?? ""}
                        onChange={(e) => assign(t.id, e.target.value ? Number(e.target.value) : "")}
                        disabled={users.isLoading}
                      >
                        <option value="">Sin asignar</option>
                        {users.data?.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-secondary text-xs"
                          onClick={() => setSelectedId(t.id)}
                        >
                          Ver detalles
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("¿Eliminar este ticket?")) {
                              try {
                                await api.delete(`/tickets/${t.id}/`);
                                await queryClient.invalidateQueries({ queryKey: ["tickets"] });
                              } catch {}
                            }
                          }}
                          className="inline-flex items-center rounded-md bg-red-600 text-white px-3 py-2 text-xs hover:bg-red-700"
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedId && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-lg shadow-xl relative">
              <button
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
                onClick={closeModal}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>

              {selectedTicket.isLoading || !selectedTicket.data ? (
                <div className="p-6">Cargando...</div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Cabecera */}
                  <div className="text-sm text-slate-500">
                    Ticket #{selectedTicket.data.id}{" "}
                    <span className="font-semibold text-slate-800">{selectedTicket.data.title}</span>
                  </div>

                  {/* Resumen superior tipo ficha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">Estado</div>
                      <Badge color={statusBadgeColor(selectedTicket.data.status)}>
                        {selectedTicket.data.status === "open"
                          ? "Abierto"
                          : selectedTicket.data.status === "in_progress"
                          ? "En Progreso"
                          : selectedTicket.data.status === "paused"
                          ? "Pausado"
                          : "Resuelto"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500">Prioridad</div>
                      <Badge
                        color={
                          selectedTicket.data.priority === "urgent"
                            ? "red"
                            : selectedTicket.data.priority === "high"
                            ? "yellow"
                            : selectedTicket.data.priority === "low"
                            ? "slate"
                            : "blue"
                        }
                      >
                        {selectedTicket.data.priority}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Empresa</div>
                      <div className="text-sm">
                        {companyOf(selectedTicket.data.company_id)?.name ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Creado por</div>
                      <div className="text-sm">
                        {users.data?.find((u) => u.id === selectedTicket.data.requester_id)?.full_name ??
                          users.data?.find((u) => u.id === selectedTicket.data.requester_id)?.email ??
                          "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Fecha de creación</div>
                      <div className="text-sm">
                        {new Date(selectedTicket.data.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Última actualización</div>
                      <div className="text-sm">
                        {selectedTicket.data.updated_at
                          ? new Date(selectedTicket.data.updated_at).toLocaleString()
                          : "Sin actualizar"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Técnico asignado</div>
                      <div className="flex items-center gap-2">
                        <select
                          className="input"
                          value={selectedTicket.data.assignee_id ?? ""}
                          onChange={async (e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            await api.patch(`/tickets/${selectedId}/`, { assignee_id: v });
                            await queryClient.invalidateQueries({ queryKey: ["tickets"] });
                            await queryClient.invalidateQueries({ queryKey: ["ticket", selectedId] });
                          }}
                        >
                          <option value="">Sin asignar</option>
                          {users.data?.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </option>
                          ))}
                        </select>
                        <button
                          className="text-sm text-slate-600 hover:text-slate-800"
                          onClick={() => desasignar(selectedTicket.data.id)}
                        >
                          Desasignar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  {selectedTicket.data.description && (
                    <div className="space-y-1">
                      <div className="text-sm text-slate-700">Descripción</div>
                      <div className="card p-4 text-sm whitespace-pre-wrap">
                        {selectedTicket.data.description}
                      </div>
                    </div>
                  )}

                  {/* Control de tiempo */}
                  <div className="card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">Control de Tiempo</div>
                      <Badge color={statusBadgeColor(selectedTicket.data.status)}>
                        {selectedTicket.data.status === "open"
                          ? "Abierto"
                          : selectedTicket.data.status === "in_progress"
                          ? "En Progreso"
                          : selectedTicket.data.status === "paused"
                          ? "Pausado"
                          : "Resuelto"}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600">Gestiona el tiempo de trabajo en este ticket</div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Tiempo trabajado:</span>
                        <span className="font-medium">{hhmm(minutesWorked)}</span>
                      </div>
                      {hasActiveWork ? (
                        <button className="btn btn-secondary" onClick={stopWork}>
                          Detener Trabajo
                        </button>
                      ) : (
                        <button className="btn btn-secondary" onClick={startWork}>
                          Iniciar Trabajo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comentarios */}
                  <div className="space-y-3">
                    <div className="font-medium">Comentarios del Ticket</div>
                    <div className="divide-y rounded-md border">
                      {comments.isLoading && <div className="p-3 text-sm text-slate-500">Cargando comentarios...</div>}
                      {!comments.isLoading && (comments.data?.length ?? 0) === 0 && (
                        <div className="p-3 text-sm text-slate-500">No hay comentarios en este ticket todavía.</div>
                      )}
                      {comments.data?.map((c) => {
                        const u = users.data?.find((x) => x.id === c.user_id);
                        return (
                          <div key={c.id} className="px-3 py-2 text-sm flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <div className="text-slate-700">
                                {u?.full_name || u?.email || "Usuario"} ·{" "}
                                <span className="text-slate-500">{new Date(c.created_at).toLocaleString()}</span>
                              </div>
                              {!c.is_public && <Badge color="slate">Privado</Badge>}
                            </div>
                            <div className="text-slate-800 whitespace-pre-wrap">{c.body}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div>
                      <textarea
                        className="input min-h-[90px]"
                        placeholder="Escribe un comentario..."
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                      />
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <label className="inline-flex items-center gap-2 text-slate-600">
                          <input
                            type="checkbox"
                            className="accent-brand-600"
                            checked={commentPublic}
                            onChange={(e) => setCommentPublic(e.target.checked)}
                          />
                          Comentario público (visible para todos)
                        </label>
                        <button className="btn" onClick={submitComment} disabled={!commentBody.trim()}>
                          Enviar Comentario
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}