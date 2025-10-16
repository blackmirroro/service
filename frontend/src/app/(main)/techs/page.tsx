"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Eye, Loader2, Pencil, Trash2, Wrench } from "lucide-react";
import Link from "next/link";

type User = {
  id: number;
  email: string;
  full_name?: string | null;
  role: "superadmin" | "admin" | "tech" | "user";
  company_id: number;
  is_active: boolean;
  can_view_all_companies: boolean;
};

type Company = { id: number; name: string };

function Avatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = (name || "").trim().split(" ");
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase() || "A";
  }, [name]);
  return <div className="h-10 w-10 rounded-full bg-brand-600 text-white grid place-items-center text-sm font-semibold">{initials}</div>;
}

export default function TechsPage() {
  const qc = useQueryClient();

  const techs = useQuery({
    queryKey: ["techs"],
    queryFn: async () => {
      const { data } = await api.get<User[]>("/users/", { params: { role_filter: "tech" } });
      return data;
    },
    refetchInterval: 30000
  });

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await api.get<Company[]>("/companies/");
      return data;
    }
  });

  const [viewUser, setViewUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState<null | { mode: "create" | "edit"; user?: User }>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const delUser = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}/`);
    },
    onSuccess: async () => {
      setConfirmDelete(null);
      await qc.invalidateQueries({ queryKey: ["techs"] });
    }
  });

  if (techs.isLoading) return <div>Cargando técnicos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Técnicos</h1>
          <p className="text-sm text-slate-500">Gestiona técnicos por empresa y estado.</p>
        </div>
        <Link href="/users/create-tech" className="btn inline-flex items-center gap-2">
          <Wrench size={16} /> Nuevo Técnico
        </Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {techs.data?.map((u) => (
          <div key={u.id} className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={u.full_name || u.email} />
                <div>
                  <div className="font-medium">{u.full_name || u.email}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border">Técnico</span>
            </div>

            <div className="rounded-md border px-3 py-2">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Credenciales</div>
              <div className="text-xs text-slate-700">Usuario: {u.email}</div>
              <div className="text-xs text-slate-700 flex items-center gap-2">
                Contraseña: <span className="tracking-widest">••••••••</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Segura</span>
              </div>
            </div>

            <div className="text-xs text-slate-600">
              Empresa: {companies.data?.find((c) => c.id === u.company_id)?.name || u.company_id} · Estado:{" "}
              <span className={"px-2 py-0.5 rounded-full border " + (u.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200")}>
                {u.is_active ? "Activo" : "Inactivo"}
              </span>{" "}
              · {u.can_view_all_companies ? "Visión global" : "Solo su empresa"}
            </div>

            <div className="flex items-center gap-2">
              <button className="btn-secondary text-sm inline-flex items-center gap-1" onClick={() => setViewUser(u)}>
                <Eye size={14} /> Ver
              </button>
              <Link className="btn-secondary text-sm inline-flex items-center gap-1" href={`/users/create-tech?edit=${u.id}`}>
                <Pencil size={14} /> Editar
              </Link>
              <button
                className="inline-flex items-center gap-1 rounded-md bg-red-50 text-red-600 px-3 py-2 text-sm border border-red-200 hover:bg-red-100"
                onClick={() => setConfirmDelete(u)}
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewUser && (
        <ViewDialog title="Detalles del Técnico" onClose={() => setViewUser(null)}>
          <div className="flex items-center gap-3">
            <Avatar name={viewUser.full_name || viewUser.email} />
            <div>
              <div className="font-medium">{viewUser.full_name || viewUser.email}</div>
              <div className="text-slate-500">{viewUser.email}</div>
            </div>
          </div>
          <div className="text-sm mt-3">
            Empresa: <span className="font-medium">{companies.data?.find((c) => c.id === viewUser.company_id)?.name || viewUser.company_id}</span>
          </div>
          <div className="text-sm">Estado: <span className="font-medium">{viewUser.is_active ? "Activo" : "Inactivo"}</span></div>
          <div className="text-sm">Alcance: <span className="font-medium">{viewUser.can_view_all_companies ? "Puede ver todas las empresas" : "Solo su empresa"}</span></div>
        </ViewDialog>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar técnico"
          description={`¿Seguro que deseas eliminar a ${confirmDelete.full_name || confirmDelete.email}?`}
          confirmText="Eliminar"
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => delUser.mutate(confirmDelete.id)}
          loading={delUser.isPending}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmText,
  onConfirm,
  onClose,
  loading
}: {
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
          <div className="px-5 py-4 border-b font-medium">{title}</div>
          <div className="p-5 text-sm text-slate-700">{description}</div>
          <div className="px-5 pb-5 flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-red-50 text-red-600 px-3 py-2 text-sm border border-red-200 hover:bg-red-100"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="animate-spin" size={14} />} {confirmText}
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-lg shadow-xl">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="font-medium">{title}</div>
            <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}