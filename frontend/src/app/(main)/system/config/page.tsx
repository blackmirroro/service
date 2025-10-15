"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";

type EmailConfigOut = {
  provider: "smtp" | "mailjet" | "console" | "disabled";
  from_email?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  has_smtp_pass: boolean;
  has_mailjet_keys: boolean;
};

type EmailConfigIn = {
  provider: string;
  from_email?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  mailjet_api_key?: string | null;
  mailjet_api_secret?: string | null;
};

export default function EmailConfigPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Apariencia y Personalización
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const v = localStorage.getItem("sf_dark_mode");
    return v === "1";
  });
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window === "undefined") return "apple-blue";
    return localStorage.getItem("sf_theme") || "apple-blue";
  });

  // Funcionalidades (persistencia local por ahora; luego se llevará a backend/AppConfig)
  const [featureHardware, setFeatureHardware] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sf_hw_requests_enabled") === "1";
  });
  const [featureAutoAssign, setFeatureAutoAssign] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("sf_auto_assign_enabled");
    return v === null ? true : v === "1";
  });

  const applyDark = (v: boolean) => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    if (v) {
      html.classList.add("dark");
      localStorage.setItem("sf_dark_mode", "1");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("sf_dark_mode", "0");
    }
  };

  const applyTheme = (t: string) => {
    setTheme(t);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("sf_theme", t);
    }
  };

  // cargar estado inicial en el DOM
  if (typeof document !== "undefined") {
    const html = document.documentElement;
    if (darkMode) html.classList.add("dark");
    html.setAttribute("data-theme", theme);
  }

  const cfg = useQuery({
    queryKey: ["email-config"],
    queryFn: async () => {
      const { data } = await api.get<EmailConfigOut>("/system/email-config/");
      return data;
    },
  });

  // Plantillas
  type Templates = { templates: Record<string, { subject: string; body: string }> };
  const tpls = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data } = await api.get<Templates>("/system/email/templates/");
      return data;
    }
  });
  const [tplForm, setTplForm] = useState<Templates["templates"]>({});
  const saveTpls = useMutation({
    mutationFn: async (payload: Templates) => {
      const { data } = await api.put<Templates>("/system/email/templates/", payload);
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["email-templates"] });
      alert("Plantillas guardadas");
    }
  });

  const save = useMutation({
    mutationFn: async (payload: EmailConfigIn) => {
      const { data } = await api.put<EmailConfigOut>("/system/email-config", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-config"] });
    },
  });

  const [form, setForm] = useState<EmailConfigIn>({
    provider: "mailjet",
  });

  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Prueba de correo - ServiceFlow");
  const [testBody, setTestBody] = useState("Este es un correo de prueba de ServiceFlow.");
  const [testing, setTesting] = useState(false);

  const onInitForm = (data?: EmailConfigOut) => {
    if (!data) return;
    setForm((f) => ({
      ...f,
      provider: data.provider,
      from_email: data.from_email ?? "",
      smtp_host: data.smtp_host ?? "",
      smtp_port: data.smtp_port ?? undefined,
      smtp_user: data.smtp_user ?? "",
      // no smtp_pass (secreto)
      // no keys (secretos)
    }));
  };

  if (cfg.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-40 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (cfg.data && !form.from_email && form.provider === "mailjet") {
    onInitForm(cfg.data);
  }

  const handleChange = (field: keyof EmailConfigIn, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save.mutateAsync(form);
      alert("Configuración guardada");
    } catch (e: any) {
      alert("No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTo) {
      alert("Indica un destinatario para la prueba.");
      return;
    }
    setTesting(true);
    try {
      const { data } = await api.post("/system/email/test", {
        to: testTo,
        subject: testSubject,
        body: testBody,
      });
      if (data?.ok) {
        alert("Correo de prueba enviado.");
      } else {
        alert("No se pudo enviar el correo de prueba.");
      }
    } catch (err: any) {
      alert("Error enviando correo de prueba.");
    } finally {
      setTesting(false);
    }
  };

  const themes = [
    {
      id: "apple-blue",
      name: "Azul Profesional",
      desc: "Tema azul elegante estilo Apple con colores sólidos y acabados premium",
      preview: "bg-gradient-to-r from-[#1e3a8a] to-[#334155]",
    },
    {
      id: "dark-pro",
      name: "Oscuro Profesional",
      desc: "Tema oscuro premium con acabados elegantes y acentos azules sofisticados",
      preview: "bg-gradient-to-r from-[#0b1020] to-[#0f172a]",
    },
    {
      id: "apple-light",
      name: "Apple Claro",
      desc: "Tema claro minimalista inspirado en el diseño de Apple",
      preview: "bg-gradient-to-r from-[#e2e8f0] to-[#cbd5e1]",
    },
    {
      id: "apple-dark",
      name: "Apple Oscuro",
      desc: "Tema oscuro elegante con acentos morados estilo Apple",
      preview: "bg-gradient-to-r from-[#1e1b4b] to-[#3730a3]",
    },
    {
      id: "red-vivid",
      name: "Rojo Vibrante",
      desc: "Tema rojo vibrante con degradado dinámico y acentos grises azulados",
      preview: "bg-gradient-to-r from-[#ef4444] to-[#fb7185]",
    },
    {
      id: "green-fresh",
      name: "Verde Fresco",
      desc: "Tema verde vibrante con degradado dinámico y acentos naturales",
      preview: "bg-gradient-to-r from-[#10b981] to-[#22c55e]",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configuración de la aplicación</h1>

      {/* Apariencia y Personalización */}
      <div className="card p-5 space-y-6">
        <div>
          <div className="text-lg font-semibold">Apariencia y Personalización</div>
          <div className="text-sm text-slate-600">Personaliza cómo se ve la aplicación</div>
        </div>

        {/* Modo oscuro */}
        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <div className="font-medium">Modo oscuro</div>
            <div className="text-sm text-slate-500">{darkMode ? "Interfaz con tema oscuro activado" : "Interfaz con tema claro activado"}</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={darkMode}
              onChange={(e) => {
                setDarkMode(e.target.checked);
                applyDark(e.target.checked);
              }}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-brand-600 relative transition-colors">
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${darkMode ? "translate-x-5" : ""}`} />
            </div>
          </label>
        </div>

        {/* Temas personalizados */}
        <div className="space-y-2">
          <div className="font-medium">Temas personalizados</div>
          <div className="text-sm text-slate-500">Selecciona un tema con colores y estilos estilo Apple para personalizar toda la aplicación.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {themes.map((tdef) => {
              const active = theme === tdef.id;
              return (
                <button
                  key={tdef.id}
                  type="button"
                  onClick={() => applyTheme(tdef.id)}
                  className={`text-left rounded-md border p-3 hover:bg-slate-50 transition ${active ? "ring-2 ring-brand-600 border-brand-300" : ""}`}
                >
                  <div className={`h-10 rounded ${tdef.preview} mb-3`} />
                  <div className="font-medium text-[15px]">{tdef.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{tdef.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-500">Efectos visuales</div>
          <button className="btn-secondary">Configurar efectos</button>
        </div>
      </div>

      {/* Funcionalidades */}
      <div className="card p-5 space-y-5">
        <div>
          <div className="text-lg font-semibold">Funcionalidades</div>
          <div className="text-sm text-slate-600">Activa o desactiva características del sistema</div>
        </div>

        {/* Permitir solicitudes de hardware */}
        <div className="flex items-start justify-between rounded-md border p-4">
          <div>
            <div className="font-medium">Permitir solicitudes de hardware</div>
            <div className="text-sm text-slate-500">
              {featureHardware ? "Las solicitudes de hardware están activas." : "Las solicitudes de hardware están desactivadas."}
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={featureHardware}
              onChange={(e) => {
                setFeatureHardware(e.target.checked);
                if (typeof window !== "undefined") {
                  localStorage.setItem("sf_hw_requests_enabled", e.target.checked ? "1" : "0");
                }
              }}
            />
            <div className={`w-11 h-6 bg-slate-200 rounded-full relative transition-colors ${featureHardware ? "bg-brand-600" : ""}`}>
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${featureHardware ? "translate-x-5" : ""}`} />
            </div>
          </label>
        </div>

        {/* Asignación automática de tickets */}
        <div className="flex items-start justify-between rounded-md border p-4">
          <div>
            <div className="font-medium">Asignación automática de tickets</div>
            <div className="text-sm text-slate-500">
              {featureAutoAssign
                ? "Los tickets nuevos serán asignados automáticamente a los técnicos disponibles."
                : "La asignación automática está desactivada."}
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={featureAutoAssign}
              onChange={(e) => {
                setFeatureAutoAssign(e.target.checked);
                if (typeof window !== "undefined") {
                  localStorage.setItem("sf_auto_assign_enabled", e.target.checked ? "1" : "0");
                }
              }}
            />
            <div className={`w-11 h-6 bg-slate-200 rounded-full relative transition-colors ${featureAutoAssign ? "bg-brand-600" : ""}`}>
              <div className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${featureAutoAssign ? "translate-x-5" : ""}`} />
            </div>
          </label>
        </div>
      </div>

      <h2 className="text-lg font-semibold">Configuración de Correo</h2>

      <div className="card p-5 space-y-5 max-w-3xl">
        {/* Notificaciones por correo */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium">Notificaciones por correo</div>
            <div className="text-sm text-slate-500">Recibirás correos cuando se actualicen tus tickets o se añadan comentarios públicos.</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              defaultChecked
              onChange={() => {}}
            />
            <div className="w-11 h-6 bg-slate-200 rounded-full relative transition-colors peer-checked:bg-brand-600">
              <div className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
          </label>
        </div>

        {/* Proveedor */}
        <div>
          <label className="text-sm text-slate-600">Proveedor de correo</label>
          <select
            className="input mt-1"
            value={form.provider}
            onChange={(e) => handleChange("provider", e.target.value)}
          >
            <option value="mailjet">Mailjet</option>
            <option value="smtp">SMTP</option>
            <option value="console">Consola (debug)</option>
            <option value="disabled">Deshabilitado</option>
          </select>
          <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
            Servicios de correo Mailjet - API para correos transaccionales (RECOMENDADO)
          </div>
        </div>

        {/* Firma personalizada */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Firma de correo personalizada</div>
            <div className="text-sm text-slate-500">Personaliza la firma que aparecerá automáticamente al final de los correos de notificación de tickets.</div>
          </div>
          <button className="btn-secondary">Personalizar</button>
        </div>

        {/* Mostrar/ocultar credenciales */}
        <EmailCredentialsPanel
          provider={form.provider}
          hasMailjetKeys={!!cfg.data?.has_mailjet_keys}
          hasSmtpPass={!!cfg.data?.has_smtp_pass}
          onChange={(field, value) => handleChange(field as any, value)}
          onSave={async () => {
            setSaving(true);
            try {
              await save.mutateAsync(form);
              alert("Configuración guardada");
            } catch {
              alert("No se pudo guardar la configuración");
            } finally {
              setSaving(false);
            }
          }}
          test={{
            testTo,
            setTestTo,
            testSubject,
            setTestSubject,
            testBody,
            setTestBody,
            testing,
            onTest,
          }}
        />
      </div>

      {/* Plantillas de correo */}
      <div className="card p-5 space-y-5 max-w-3xl">
        <div>
          <div className="text-lg font-semibold">Plantillas de correo</div>
          <div className="text-sm text-slate-600">Usa variables como {"{{ticket_id}}"}, {"{{ticket_title}}"}, {"{{comment_body}}"}, {"{{requester_name}}"}, {"{{assignee_name}}"}</div>
        </div>

        {tpls.isLoading ? (
          <div className="text-sm text-slate-500">Cargando plantillas...</div>
        ) : (
          <>
            {(() => {
              if (Object.keys(tplForm).length === 0 && tpls.data?.templates) {
                setTplForm(tpls.data.templates);
              }
              return null;
            })()}
            <div className="grid gap-4">
              <TemplateEditor
                title="Comentario al usuario"
                description="Se envía al usuario cuando el staff añade un comentario público."
                tpl={tplForm["comment_user"] || { subject: "", body: "" }}
                onChange={(k, v) => setTplForm((prev) => ({ ...prev, comment_user: { ...(prev["comment_user"] || {}), [k]: v } }))}
              />
              <TemplateEditor
                title="Comentario al técnico"
                description="Se envía al técnico asignado cuando el usuario añade un comentario."
                tpl={tplForm["comment_tech"] || { subject: "", body: "" }}
                onChange={(k, v) => setTplForm((prev) => ({ ...prev, comment_tech: { ...(prev["comment_tech"] || {}), [k]: v } }))}
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                className="btn"
                onClick={() => saveTpls.mutate({ templates: tplForm })}
                disabled={saveTpls.isPending}
              >
                {saveTpls.isPending ? "Guardando..." : "Guardar plantillas"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="text-xs text-slate-500">
        Notas:
        <ul className="list-disc ml-5 space-y-1 mt-2">
          <li>Mailjet: se usa su API REST (sin SMTP) y es la opción recomendada.</li>
          <li>SMTP: usa STARTTLS si el puerto es 587 o SSL si es 465.</li>
          <li>Consola: imprime los correos en logs (útil para desarrollo).</li>
          <li>Deshabilitado: no se envían correos.</li>
        </ul>
      </div>
    </div>
  );
}

function EmailCredentialsPanel({
  provider,
  hasMailjetKeys,
  hasSmtpPass,
  onChange,
  onSave,
  test,
}: {
  provider: string;
  hasMailjetKeys: boolean;
  hasSmtpPass: boolean;
  onChange: (field: string, value: any) => void;
  onSave: () => void | Promise<void>;
  test: {
    testTo: string;
    setTestTo: (v: string) => void;
    testSubject: string;
    setTestSubject: (v: string) => void;
    testBody: string;
    setTestBody: (v: string) => void;
    testing: boolean;
    onTest: (e: React.FormEvent) => Promise<void> | void;
  };
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Configurar credenciales</div>
        <button className="btn-secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Ocultar" : "Mostrar"}
        </button>
      </div>

      {open && (
        <div className="rounded-md border p-4 space-y-4">
          {provider === "mailjet" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">API Key de Mailjet</span>
                <input
                  className="input"
                  type="password"
                  placeholder={hasMailjetKeys ? "********************************" : "Tu API Key pública de Mailjet"}
                  onChange={(e) => onChange("mailjet_api_key", e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Secret Key de Mailjet</span>
                <input
                  className="input"
                  type="password"
                  placeholder={hasMailjetKeys ? "********************************" : "Tu Secret Key de Mailjet"}
                  onChange={(e) => onChange("mailjet_api_secret", e.target.value)}
                />
              </label>

              <div className="rounded-md bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-800">
                <div className="font-medium mb-1">Cómo obtener tus claves de Mailjet:</div>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Inicia sesión en tu cuenta de Mailjet</li>
                  <li>Ve a Account Settings → REST API</li>
                  <li>Copia la API Key en el primer campo</li>
                  <li>Copia la Secret Key en el segundo campo</li>
                  <li>Asegúrate de tener un dominio verificado en Settings → Senders &amp; Domains</li>
                </ol>
              </div>
            </>
          )}

          {provider === "smtp" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Host</span>
                <input className="input" onChange={(e) => onChange("smtp_host", e.target.value)} placeholder="smtp.tu-dominio.com" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Puerto</span>
                <input className="input" type="number" defaultValue={587} onChange={(e) => onChange("smtp_port", Number(e.target.value))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Usuario</span>
                <input className="input" onChange={(e) => onChange("smtp_user", e.target.value)} placeholder="usuario" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Contraseña</span>
                <input
                  className="input"
                  type="password"
                  onChange={(e) => onChange("smtp_pass", e.target.value)}
                  placeholder={hasSmtpPass ? "********" : "contraseña"}
                />
              </label>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button className="btn" onClick={onSave}>Guardar configuración</button>
            <form onSubmit={test.onTest} className="flex items-center gap-2">
              <input
                className="input h-9"
                placeholder="destinatario@correo.com"
                type="email"
                value={test.testTo}
                onChange={(e) => test.setTestTo(e.target.value)}
              />
              <button disabled={test.testing} className="btn" type="submit">
                {test.testing ? "Probando..." : "Probar configuración"}
              </button>
            </form>
          </div>

          <div className="rounded-md bg-slate-50 border px-3 py-2 text-xs text-slate-700">
            <div className="font-medium mb-1">Opciones adicionales de prueba</div>
            Además de la configuración estándar, puedes probar servicios alternativos como SendGrid o Mailjet desde la sección de prueba de
            servicios de correo que aparece debajo.
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  title,
  description,
  tpl,
  onChange,
}: {
  title: string;
  description: string;
  tpl: { subject: string; body: string };
  onChange: (field: "subject" | "body", value: string) => void;
}) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-slate-500">{description}</div>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Asunto</span>
        <input className="input" value={tpl.subject} onChange={(e) => onChange("subject", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Cuerpo (texto plano)</span>
        <textarea className="input min-h-[120px]" value={tpl.body} onChange={(e) => onChange("body", e.target.value)} />
      </label>
    </div>
  );
}